# RAG multimodal · palen-tour

Chat sobre tus documentos con **Gemini Embeddings 2.0** (`gemini-embedding-2`, multimodal) +
**Pinecone**. Cada respuesta incluye la fuente original: nombre de archivo, página e **imagen** de
esa página/documento.

## Puesta en marcha

```bash
cd palen-tour/rag
python -m venv .venv && .venv\Scripts\activate      # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env                               # rellena GOOGLE_API_KEY y PINECONE_API_KEY
streamlit run app.py
```

## Uso

1. Suelta tus archivos en `corpus/` (PDF, PNG/JPG/WEBP, TXT/MD).
2. En la barra lateral pulsa **🔄 Indexar corpus** (solo procesa lo nuevo o modificado).
3. Pregunta en el chat. Cada fuente muestra archivo, página y la captura del documento.

PDF → una entrada por página (texto + render de la página). Imágenes sueltas → se embeben tal cual.
Las imágenes de las fuentes recuperadas se pasan también al modelo generador, así responde bien
incluso con manuales que son solo imagen.
