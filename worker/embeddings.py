from typing import List
from sentence_transformers import SentenceTransformer

# Load model once at module level (downloaded on first run, cached after)
print("Loading embedding model (all-MiniLM-L6-v2)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Embedding model loaded")


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts using local sentence-transformers model."""
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def embed_single(text: str) -> List[float]:
    results = embed_texts([text])
    return results[0]
