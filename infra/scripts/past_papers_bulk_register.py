#!/usr/bin/env python3
"""Copy READY past-paper PDFs into object storage and register via core-api (or --pilot slice)."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUEUE = ROOT / "data" / "past_papers" / "ingestion_queue.csv"
DEFAULT_STORE = ROOT / "data" / "past_papers" / "object_store"

TRACK_TO_SPEC = {
    "GCSE-AQA-8462": "8462",
    "GCSE-EDX-1CH0": "1CH0",
    "IGCSE-CAIE-0620": "0620",
}

# Preferred pilot papers (one per board) when --pilot
PILOT_KEYS = [
    ("GCSE-AQA-8462", "8462/1H", "JUN2024"),
    ("GCSE-EDX-1CH0", "1CH0/1H", "JUN2023"),
    ("IGCSE-CAIE-0620", "0620/42", "JUN2024"),
]


def http_json(method: str, url: str, token: str | None, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} -> HTTP {e.code}: {err}") from e


def login(base: str, email: str, password: str) -> str:
    out = http_json("POST", f"{base}/auth/login", None, {"email": email, "password": password})
    token = out.get("accessToken") or out.get("access_token")
    if not token:
        raise RuntimeError(f"Login missing accessToken: {out}")
    return token


def object_key(track: str, series: str, paper_code: str, kind: str) -> str:
    safe_code = paper_code.replace("/", "_")
    return f"past-papers/{track}/{series}/{safe_code}/{kind}.pdf"


def copy_to_store(src: Path, store: Path, key: str) -> str:
    dest = store / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return key


def load_queue(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def resolve_spec_ids(base: str, token: str) -> dict[str, int]:
    out = http_json("GET", f"{base}/internal/specs", token)
    items = out.get("items") or out.get("data") or []
    mapping: dict[str, int] = {}
    for it in items:
        code = str(it.get("specCode") or it.get("spec_code") or "")
        sid = it.get("specificationId") or it.get("specification_id") or it.get("id")
        if code and sid is not None:
            mapping[code] = int(sid)
    return mapping


def select_rows(rows: list[dict], pilot: bool) -> list[dict]:
    ready = [r for r in rows if r.get("status") == "READY"]
    if not pilot:
        return ready
    selected = []
    for track, code, series in PILOT_KEYS:
        match = next(
            (
                r
                for r in ready
                if r["track_id"] == track and r["paper_code"] == code and r["series"] == series
            ),
            None,
        )
        if match is None:
            match = next((r for r in ready if r["track_id"] == track), None)
        if match is None:
            raise RuntimeError(f"No READY row for pilot track {track}")
        selected.append(match)
    return selected


def register_row(
    base: str,
    token: str,
    row: dict,
    store: Path,
    spec_ids: dict[str, int],
    ingest: bool,
    approve_one: bool,
) -> dict:
    track = row["track_id"]
    spec_code = TRACK_TO_SPEC[track]
    if spec_code not in spec_ids:
        raise RuntimeError(f"specificationId not found for {spec_code}; got {spec_ids}")
    paper_path = ROOT / row["local_paper_path"]
    scheme_path = ROOT / row["local_scheme_path"]
    er_rel = row.get("local_examiner_report_path") or ""
    er_path = (ROOT / er_rel) if er_rel else None

    key_paper = copy_to_store(
        paper_path, store, object_key(track, row["series"], row["paper_code"], "paper")
    )
    key_ms = copy_to_store(
        scheme_path, store, object_key(track, row["series"], row["paper_code"], "mark-scheme")
    )
    key_er = None
    if er_path and er_path.is_file():
        key_er = copy_to_store(
            er_path, store, object_key(track, row["series"], row["paper_code"], "examiner-report")
        )

    body = {
        "specificationId": spec_ids[spec_code],
        "series": row["series"],
        "examYear": int(row["exam_year"]),
        "paperCode": row["paper_code"],
        "tier": row["tier"],
        "title": f"{row['paper_code']} {row['series']}",
        "sourceUrl": row["source_url"],
        "fileKeyPaper": key_paper,
        "fileKeyMarkScheme": key_ms,
        "sha256Paper": row["sha256_paper"],
    }
    if key_er:
        body["fileKeyExaminerReport"] = key_er

    paper = http_json("POST", f"{base}/internal/past-papers", token, body)
    paper_id = paper.get("paperId") or paper.get("paper_id")
    result = {"paperId": paper_id, "paperCode": row["paper_code"], "series": row["series"]}

    if ingest and paper_id is not None:
        ingest_out = http_json("POST", f"{base}/internal/past-papers/{paper_id}/ingest", token, {})
        result["ingest"] = ingest_out
        detail = http_json("GET", f"{base}/internal/past-papers/{paper_id}", token)
        items = detail.get("items") or []
        result["itemCount"] = len(items)
        if approve_one and items:
            item_id = items[0].get("itemId") or items[0].get("item_id")
            approved = http_json(
                "POST", f"{base}/internal/past-paper-items/{item_id}/approve", token, {}
            )
            result["approvedItem"] = approved

    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--queue", type=Path, default=DEFAULT_QUEUE)
    ap.add_argument("--store", type=Path, default=DEFAULT_STORE)
    ap.add_argument("--base-url", default="http://127.0.0.1:8081/api/v1")
    ap.add_argument("--email", default="content@studyloop.local")
    ap.add_argument("--password", default="ReviewerDemo!23")
    ap.add_argument("--pilot", action="store_true", help="Register one READY paper per board")
    ap.add_argument("--ingest", action="store_true", help="Start ingest after register")
    ap.add_argument("--approve-one", action="store_true", help="Approve first item after ingest")
    ap.add_argument("--token", default="", help="Optional bearer token (skips login)")
    args = ap.parse_args()

    rows = load_queue(args.queue)
    selected = select_rows(rows, args.pilot)
    args.store.mkdir(parents=True, exist_ok=True)

    token = args.token or login(args.base_url, args.email, args.password)
    spec_ids = resolve_spec_ids(args.base_url, token)
    if not spec_ids:
        raise SystemExit("No specs returned from /internal/specs")

    results = []
    for row in selected:
        print(f"Registering {row['track_id']} {row['paper_code']} {row['series']}…")
        results.append(
            register_row(
                args.base_url,
                token,
                row,
                args.store,
                spec_ids,
                ingest=args.ingest,
                approve_one=args.approve_one,
            )
        )

    print(json.dumps({"registered": len(results), "results": results}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise SystemExit(1)
