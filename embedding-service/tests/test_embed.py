from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_embed_dimensions():
    r = client.post("/embed", json={"texts": ["mole calculations"]})
    assert r.status_code == 200
    body = r.json()
    assert body["dimensions"] == 768
    assert len(body["vectors"][0]) == 768
    assert body["stub"] is True


def test_wrong_dimension_model_is_rejected(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "STUB", False)
    monkeypatch.setattr(main, "real_embed", lambda texts: [[0.1] * 384 for _ in texts])
    r = client.post("/embed", json={"texts": ["x"]})
    assert r.status_code == 503
