# RAG chatbot service. Build context is the repository root (it needs rag-service.py).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/opt/huggingface \
    HF_HUB_DISABLE_TELEMETRY=1

WORKDIR /app
# CPU-only PyTorch keeps the image ~1.5 GB smaller than the default CUDA build
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
COPY rag-pipeline/requirements.txt rag-pipeline/requirements.txt
RUN pip install -r rag-pipeline/requirements.txt

# Bake the embedding model into the image so the service starts without internet access
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
ENV HF_HUB_OFFLINE=1

COPY rag-pipeline/ rag-pipeline/
COPY rag-service.py .

EXPOSE 8001
# Build the FAISS index from rag-pipeline/data/*.csv on first start, then serve
CMD ["sh", "-c", "[ -f rag-pipeline/faiss_store/faiss.index ] || (cd rag-pipeline && python app.py build); exec python rag-service.py"]
