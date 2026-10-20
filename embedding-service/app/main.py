"""Study Loop embedding service — exam content only (D-15)."""
from __future__ import annotations

import hashlib
import math
import os
import struct
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DIM = 768
STUB = os.getenv("EMBEDDING_STUB", "true").lower() in {"1", "true", "yes"}
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")

app = FastAPI(title="studyloop-embedding-service", version="0.1.0")

_real_model = None
_real_backend: Optional[str] = None


class EmbedRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    vectors: List[List[float]]
    stub: bool = False


def stub_embed(text: str) -> List[float]:
    """Deterministic pseudo-embedding when ONNX weights are absent (local/CI)."""
    seed = hashlib.sha256(text.encode("utf-8")).digest()
    values: List[float] = []
    counter = 0
    while len(values) < DIM:
        block = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        for i in range(0, len(block), 4):
            if len(values) >= DIM:
                break
            (n,) = struct.unpack(">I", block[i : i + 4])
            values.append((n / 0xFFFFFFFF) * 2.0 - 1.0)
        counter += 1
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [v / norm for v in values]


def _load_real_model():
    global _real_model, _real_backend
    if _real_model is not None:
        return
    try:
        from fastembed import TextEmbedding  # type: ignore

        _real_model = TextEmbedding(model_name=MODEL_NAME)
        _real_backend = "fastembed"
        return
    except Exception:
        pass
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore

        _real_model = SentenceTransformer(MODEL_NAME)
        _real_backend = "sentence_transformers"
        return
    except Exception as e:
        raise RuntimeError(
            "EMBEDDING_STUB=false but neither fastembed nor sentence-transformers could load "
            f"{MODEL_NAME}: {e}"
        ) from e


def real_embed(texts: List[str]) -> List[List[float]]:
    _load_real_model()
    assert _real_model is not None
    if _real_backend == "fastembed":
        return [list(map(float, vec)) for vec in _real_model.embed(texts)]
    vectors = _real_model.encode(texts, normalize_embeddings=True)
    return [list(map(float, row)) for row in vectors]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "stub": STUB,
        "model": MODEL_NAME,
        "backend": "stub" if STUB else (_real_backend or "lazy"),
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if STUB:
        vectors = [stub_embed(t or "") for t in req.texts]
        return EmbedResponse(model=MODEL_NAME, dimensions=DIM, vectors=vectors, stub=True)
    try:
        vectors = real_embed([t or "" for t in req.texts])
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    # Truncating or zero-padding changes what a vector means; a wrong model must fail loudly.
    if vectors and len(vectors[0]) != DIM:
        raise HTTPException(
            status_code=503,
            detail=f"{MODEL_NAME} returned {len(vectors[0])} dimensions; question_embedding expects {DIM}",
        )
    return EmbedResponse(model=MODEL_NAME, dimensions=DIM, vectors=vectors, stub=False)
