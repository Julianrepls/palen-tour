"""Nucleo RAG multimodal: ingesta, busqueda y generacion.

Embeddings:  gemini-embedding-2 (multimodal -> texto + imagen en un mismo vector)
Vector DB:   Pinecone serverless
Generacion:  gemini-2.5-flash (lee tambien las imagenes de las fuentes recuperadas)
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pinecone import Pinecone, ServerlessSpec

load_dotenv(Path(__file__).parent / ".env")


def cfg(name: str, default=None):
    """Lee credenciales de st.secrets (Streamlit Cloud) o variables de entorno (.env local)."""
    try:
        import streamlit as st
        if name in st.secrets:
            return st.secrets[name]
    except Exception:  # noqa: BLE001 -- sin secrets.toml en local
        pass
    return os.getenv(name, default)


# --- Rutas ----------------------------------------------------------------
ROOT = Path(__file__).parent
CORPUS_DIR = ROOT / "corpus"            # <-- suelta aqui tus documentos
MEDIA_DIR = ROOT / "media"              # paginas/imagenes renderizadas (auto)
MANIFEST = ROOT / "manifest.json"       # control de que ya esta indexado
CORPUS_DIR.mkdir(exist_ok=True)
MEDIA_DIR.mkdir(exist_ok=True)

# --- Config ---------------------------------------------------------------
EMBED_MODEL = cfg("EMBED_MODEL", "gemini-embedding-2")
EMBED_DIM = int(cfg("EMBED_DIM", "1536"))
GEN_MODEL = cfg("GEN_MODEL", "gemini-2.5-flash")
INDEX_NAME = cfg("PINECONE_INDEX", "palen-tour-rag")

# Supabase Storage: aloja las imagenes de las paginas fuente (bucket publico).
# Solo se necesita SERVICE_KEY al indexar (local); la app en la nube solo lee URLs.
SUPABASE_URL = cfg("SUPABASE_URL")
SUPABASE_SERVICE_KEY = cfg("SUPABASE_SERVICE_KEY")
RAG_BUCKET = cfg("RAG_BUCKET", "rag-media")

# Modo administrador: muestra los controles de indexacion en la barra lateral.
# En produccion (publico) se deja sin definir -> solo se ve el chat.
ADMIN = str(cfg("RAG_ADMIN", "")).lower() in ("1", "true", "yes")

PDF_DPI = 150
PAGE_TEXT_CHARS = 1500   # texto guardado por pagina en metadata
TEXT_CHUNK = 1200        # tamano de chunk para .txt/.md

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
TEXT_EXT = {".txt", ".md"}


# --- Clientes (perezosos) -------------------------------------------------
_genai = None
_index = None
_supabase = None


def genai_client():
    global _genai
    if _genai is None:
        _genai = genai.Client(api_key=cfg("GOOGLE_API_KEY"))
    return _genai


def index():
    global _index
    if _index is None:
        pc = Pinecone(api_key=cfg("PINECONE_API_KEY"))
        existing = {i["name"] for i in pc.list_indexes()}
        if INDEX_NAME not in existing:
            pc.create_index(
                name=INDEX_NAME,
                dimension=EMBED_DIM,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=cfg("PINECONE_CLOUD", "aws"),
                    region=cfg("PINECONE_REGION", "us-east-1"),
                ),
            )
        _index = pc.Index(INDEX_NAME)
    return _index


def _supabase_client():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
            raise RuntimeError(
                "Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY para subir imagenes a Storage."
            )
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        try:  # crea el bucket publico la primera vez (idempotente)
            _supabase.storage.create_bucket(RAG_BUCKET, options={"public": True})
        except Exception:  # noqa: BLE001 -- ya existe
            pass
    return _supabase


def _upload_image(data: bytes, key: str) -> str:
    """Sube un PNG al bucket publico y devuelve su URL publica."""
    sb = _supabase_client()
    sb.storage.from_(RAG_BUCKET).upload(
        path=key, file=data,
        file_options={"content-type": "image/png", "upsert": "true"},
    )
    return sb.storage.from_(RAG_BUCKET).get_public_url(key)


# --- Reintentos ante errores transitorios de la API -----------------------
# 503 UNAVAILABLE (modelo saturado), 429 (cuota), 500/INTERNAL: se reintenta
# con espera exponencial; los demas errores se propagan tal cual.
_TRANSIENT = ("503", "unavailable", "overloaded", "429", "resource_exhausted",
              "500", "internal", "deadline")


def _retry(fn, tries=5, base=1.5):
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            transient = any(t in str(e).lower() for t in _TRANSIENT)
            if transient and i < tries - 1:
                time.sleep(base * (2 ** i))
                continue
            raise


# --- Embeddings -----------------------------------------------------------
def _normalize(vec):
    arr = np.asarray(vec, dtype=np.float32)
    n = np.linalg.norm(arr)
    return (arr / n).tolist() if n else arr.tolist()


def embed(contents) -> list[float]:
    """contents: lista mezclando strings y types.Part (imagenes)."""
    res = _retry(lambda: genai_client().models.embed_content(
        model=EMBED_MODEL,
        contents=contents,
        config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
    ))
    return _normalize(res.embeddings[0].values)


def _img_part(data: bytes, mime: str = "image/png") -> types.Part:
    return types.Part.from_bytes(data=data, mime_type=mime)


def _img_part_from_url(url: str) -> types.Part:
    import httpx
    r = httpx.get(url, timeout=20)
    r.raise_for_status()
    return _img_part(r.content, r.headers.get("content-type", "image/png"))


# --- Manifest -------------------------------------------------------------
def _load_manifest() -> dict:
    return json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {}


def _save_manifest(m: dict):
    MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False), "utf-8")


def _file_hash(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()[:16]


# --- Ingesta --------------------------------------------------------------
def _records_from_pdf(path: Path, fh: str):
    """Una entrada por pagina: texto extraido + imagen renderizada (subida a Storage)."""
    doc = fitz.open(path)
    for i, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        png = page.get_pixmap(dpi=PDF_DPI).tobytes("png")
        url = _upload_image(png, f"{fh}/p{i}.png")
        contents = [f"Documento: {path.name} | Pagina {i}\n{text}", _img_part(png)]
        yield {
            "id": f"{fh}:{i}",
            "contents": contents,
            "metadata": {
                "source": path.name,
                "page": i,
                "image_url": url,
                "text": text[:PAGE_TEXT_CHARS],
            },
        }
    doc.close()


def _records_from_image(path: Path, fh: str):
    data = path.read_bytes()
    url = _upload_image(data, f"{fh}/{path.name}")
    yield {
        "id": f"{fh}:1",
        "contents": [f"Imagen: {path.name}", _img_part(data)],
        "metadata": {
            "source": path.name,
            "page": 1,
            "image_url": url,
            "text": f"(Imagen) {path.name}",
        },
    }


def _records_from_text(path: Path, fh: str):
    raw = path.read_text("utf-8", errors="ignore")
    chunks = [raw[i : i + TEXT_CHUNK] for i in range(0, len(raw), TEXT_CHUNK)] or [""]
    for i, chunk in enumerate(chunks, start=1):
        yield {
            "id": f"{fh}:{i}",
            "contents": [chunk],
            "metadata": {
                "source": path.name,
                "page": i,
                "image_url": "",
                "text": chunk[:PAGE_TEXT_CHARS],
            },
        }


def _build_records(path: Path, fh: str):
    ext = path.suffix.lower()
    if ext == ".pdf":
        return _records_from_pdf(path, fh)
    if ext in IMAGE_EXT:
        return _records_from_image(path, fh)
    if ext in TEXT_EXT:
        return _records_from_text(path, fh)
    return iter(())  # tipo no soportado -> se ignora


def ingest(progress=None):
    """Indexa los archivos nuevos o modificados de corpus/.

    progress: callable(fraccion: float, mensaje: str) opcional (para la UI).
    Devuelve un resumen {indexados, vectores, omitidos}.
    """
    manifest = _load_manifest()
    files = [p for p in CORPUS_DIR.rglob("*") if p.is_file() and not p.name.startswith(".")]
    indexed, vectors, skipped, removed = 0, 0, 0, 0
    idx = index()

    # Poda: borra de Pinecone los documentos que ya no estan en corpus/
    present = {str(p.relative_to(CORPUS_DIR)) for p in files}
    for key in [k for k in manifest if k not in present]:
        ids = manifest[key].get("ids", [])
        if ids:
            idx.delete(ids=ids)
        del manifest[key]
        removed += 1

    for n, path in enumerate(files):
        key = str(path.relative_to(CORPUS_DIR))
        fh = _file_hash(path)
        if progress:
            progress(n / max(len(files), 1), f"Procesando {path.name}")

        if manifest.get(key, {}).get("hash") == fh:
            skipped += 1
            continue

        # Si el archivo cambio, borra sus vectores antiguos
        old_ids = manifest.get(key, {}).get("ids", [])
        if old_ids:
            idx.delete(ids=old_ids)

        records = list(_build_records(path, fh))
        if not records:
            continue

        batch, ids = [], []
        for r in records:
            batch.append({"id": r["id"], "values": embed(r["contents"]), "metadata": r["metadata"]})
            ids.append(r["id"])
            if len(batch) >= 50:
                idx.upsert(vectors=batch)
                batch = []
        if batch:
            idx.upsert(vectors=batch)

        manifest[key] = {"hash": fh, "ids": ids}
        indexed += 1
        vectors += len(ids)

    _save_manifest(manifest)
    if progress:
        progress(1.0, "Listo")
    return {"indexados": indexed, "vectores": vectors, "omitidos": skipped, "eliminados": removed}


# --- Busqueda y respuesta -------------------------------------------------
def search(query: str, top_k: int = 5):
    qv = embed([query])
    res = index().query(vector=qv, top_k=top_k, include_metadata=True)
    return res.get("matches", [])


SYSTEM = (
    "Eres el asistente documental de palen-tour. Responde en espanol, solo con la "
    "informacion del CONTEXTO y las imagenes adjuntas. Cita siempre la fuente entre "
    "corchetes con el formato [archivo, p.N]. Si la respuesta no esta en el contexto, "
    "dilo claramente."
)


def answer(query: str, matches) -> str:
    ctx = "\n\n".join(
        f"[{m['metadata']['source']}, p.{m['metadata']['page']}]\n{m['metadata']['text']}"
        for m in matches
    )
    contents = [f"{SYSTEM}\n\n### CONTEXTO\n{ctx}\n\n### PREGUNTA\n{query}"]
    # Adjunta las imagenes de las fuentes para que el modelo lea manuales visuales
    for m in matches:
        url = m["metadata"].get("image_url")
        if url:
            try:
                contents.append(_img_part_from_url(url))
            except Exception:  # noqa: BLE001 -- si falla la descarga, sigue solo con texto
                pass
    res = _retry(lambda: genai_client().models.generate_content(
        model=GEN_MODEL, contents=contents))
    return res.text


def corpus_stats():
    files = [p for p in CORPUS_DIR.rglob("*") if p.is_file() and not p.name.startswith(".")]
    return {"archivos": len(files), "indexados": len(_load_manifest())}
