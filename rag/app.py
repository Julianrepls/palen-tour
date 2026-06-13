"""Dashboard RAG multimodal de palen-tour.

Ejecutar:  streamlit run app.py
"""
import streamlit as st

import rag_core as rag

st.set_page_config(page_title="palen-tour · RAG", page_icon="🏔️", layout="wide")

# Oculta la barra superior de Streamlit (boton "Deploy" y menu de tres puntos)
st.markdown(
    """
    <style>
      [data-testid="stToolbar"] {display: none !important;}
      [data-testid="stDeployButton"] {display: none !important;}
      #MainMenu {visibility: hidden !important;}
    </style>
    """,
    unsafe_allow_html=True,
)

# --- Estado ---------------------------------------------------------------
if "history" not in st.session_state:
    st.session_state.history = []  # [{role, content, sources}]

# --- Barra lateral --------------------------------------------------------
with st.sidebar:
    st.header("📚 RAG Documentos Chat")
    st.caption(
        "Inicia un chat donde puedes hacerme consultas sobre los Picos de Europa "
        "o Fiordos Noruegos. Por ejemplo: Rutas, Gastronomía, Fauna..."
    )

    # Controles de indexacion: solo en modo admin (RAG_ADMIN). El publico no los ve.
    if rag.ADMIN:
        stats = rag.corpus_stats()
        c1, c2 = st.columns(2)
        c1.metric("Archivos", stats["archivos"])
        c2.metric("Indexados", stats["indexados"])

        if st.button("🔄 Indexar corpus", use_container_width=True, type="primary"):
            bar = st.progress(0.0, "Iniciando…")
            try:
                s = rag.ingest(progress=lambda f, m: bar.progress(f, m))
                st.success(
                    f"✅ {s['indexados']} indexado(s) · {s['vectores']} vectores "
                    f"· {s['omitidos']} sin cambios · {s['eliminados']} eliminado(s)"
                )
            except Exception as e:  # noqa: BLE001
                st.error(f"Error indexando: {e}")
        st.divider()

    top_k = st.slider("Fuentes a recuperar", 2, 10, 5)
    if st.button("🗑️ Limpiar chat", use_container_width=True):
        st.session_state.history = []
        st.rerun()

st.title("🏔️ Asistente documental palen-tour")


# --- Render de fuentes (con imagen de la pagina original) -----------------
def render_sources(sources):
    if not sources:
        return
    st.markdown("**Fuentes:**")
    for m in sources:
        meta = m["metadata"]
        label = f"📄 {meta['source']} · pág. {meta['page']} · relevancia {m['score']:.2f}"
        with st.expander(label):
            url = meta.get("image_url")
            if url:
                st.image(url, caption=f"{meta['source']} — pág. {meta['page']}", width="stretch")
            if meta.get("text"):
                st.caption(meta["text"])


for turn in st.session_state.history:
    with st.chat_message(turn["role"]):
        st.markdown(turn["content"])
        if turn["role"] == "assistant":
            render_sources(turn.get("sources"))

# --- Entrada de chat ------------------------------------------------------
if prompt := st.chat_input("Pregunta sobre tus documentos…"):
    st.session_state.history.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Buscando en el corpus…"):
            try:
                matches = rag.search(prompt, top_k=top_k)
                text = rag.answer(prompt, matches) if matches else (
                    "Todavía no hay documentos indexados."
                )
            except Exception as e:  # noqa: BLE001
                matches, text = [], f"⚠️ Error: {e}"
        st.markdown(text)
        render_sources(matches)

    st.session_state.history.append({"role": "assistant", "content": text, "sources": matches})
