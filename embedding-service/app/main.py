"""Study Loop embedding service — exam content only (D-15)."""
from __future__ import annotations

import hashlib
import math
import os
import struct
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

DIM = 768
STUB = os.getenv("EMBEDDING_STUB", "true").lower() in {"1", "true", "yes"}

app = FastAPI(title="studyloop-embedding-service", version="0.1.0")


class EmbedRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    vectors: List[List[float]]


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


@app.get("/health")
def health():
    return {"status": "ok", "stub": STUB, "model": "bge-base-en-v1.5"}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    # Production path loads ONNX bge-base-en-v1.5; W0 ships stub for compose/CI.
    vectors = [stub_embed(t or "") for t in req.texts]
    return EmbedResponse(model="bge-base-en-v1.5", dimensions=DIM, vectors=vectors)
