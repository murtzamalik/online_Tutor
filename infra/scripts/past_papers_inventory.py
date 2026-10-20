#!/usr/bin/env python3
"""Inventory extracted past-paper PDFs into ingestion_queue.csv (2022–2025 pilot)."""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EXTRACTED = ROOT / "data" / "past_papers" / "extracted"
DEFAULT_OUT = ROOT / "data" / "past_papers" / "ingestion_queue.csv"
DEFAULT_REPORT = ROOT / "data" / "past_papers" / "inventory_report.md"

SOURCE_URLS = {
    "GCSE-AQA-8462": "https://www.aqa.org.uk/subjects/chemistry/gcse/chemistry-8462",
    "GCSE-EDX-1CH0": "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/chemistry-2016.html",
    "IGCSE-CAIE-0620": "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-chemistry-0620/",
}

MIN_YEAR = 2022
MAX_YEAR = 2025


@dataclass
class FileHit:
    path: Path
    role: str  # QP | MS | ER | OTHER
    track_id: str
    paper_code: str
    series: str
    exam_year: int
    tier: str
    verify: bool = False
    note: str = ""


@dataclass
class PaperRow:
    track_id: str
    paper_code: str
    series: str
    exam_year: int
    tier: str
    qp: Path | None = None
    ms: Path | None = None
    er: Path | None = None
    verify: bool = False
    notes: list[str] = field(default_factory=list)

    @property
    def key(self) -> tuple:
        return (self.track_id, self.paper_code, self.series, self.exam_year, self.tier)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def parse_aqa(path: Path) -> FileHit | None:
    parts = path.parts
    tier = "HIGHER" if any("higher" in p.lower() for p in parts) else (
        "FOUNDATION" if any("foundation" in p.lower() for p in parts) else "UNKNOWN"
    )
    m = re.match(
        r"(?i)(June|Nov|November)\s+(\d{4})\s+(QP|MS)(?:-(\d+))?\.pdf$",
        path.name,
    )
    if not m:
        return FileHit(
            path, "OTHER", "GCSE-AQA-8462", "VERIFY", "UNKNOWN", 0, tier, True, "unparsed AQA name"
        )
    month, year_s, kind, paper_n = m.group(1), m.group(2), m.group(3).upper(), m.group(4)
    year = int(year_s)
    series_month = "JUN" if month.lower().startswith("june") else "NOV"
    series = f"{series_month}{year}"
    n = int(paper_n) if paper_n else 1
    if n not in (1, 2):
        return FileHit(
            path,
            kind,
            "GCSE-AQA-8462",
            f"8462/{n}{'H' if tier == 'HIGHER' else 'F'}",
            series,
            year,
            tier,
            True,
            f"unexpected paper suffix -{n}",
        )
    letter = "H" if tier == "HIGHER" else "F"
    code = f"8462/{n}{letter}"
    return FileHit(path, kind, "GCSE-AQA-8462", code, series, year, tier)


def parse_edexcel(path: Path) -> FileHit | None:
    name = path.name
    parts = path.parts
    tier_guess = "HIGHER" if any("higher" in p.lower() for p in parts) else (
        "FOUNDATION" if any("foundation" in p.lower() for p in parts) else "UNKNOWN"
    )

    if re.match(r"(?i)^(PCH|PC24)", name):
        return FileHit(
            path, "OTHER", "GCSE-EDX-1CH0", "VERIFY", "UNKNOWN", 0, tier_guess, True, "opaque PCH/PC24 code"
        )

    m = re.match(
        r"(?i)^(?:ECH\d+)?1?ch0[-_]?([12])([fh])[-_]?(que|exam-paper|exam_paper|mark-scheme|mark_scheme|rms|msc)[-_]?(\d{8})?",
        name,
    )
    if not m:
        return FileHit(
            path, "OTHER", "GCSE-EDX-1CH0", "VERIFY", "UNKNOWN", 0, tier_guess, True, "unparsed Edexcel name"
        )
    paper_n, tier_letter, kind_raw, date_s = m.group(1), m.group(2).upper(), m.group(3).lower(), m.group(4)
    tier = "HIGHER" if tier_letter == "H" else "FOUNDATION"
    code = f"1CH0/{paper_n}{tier_letter}"
    if kind_raw in ("que", "exam-paper", "exam_paper"):
        role = "QP"
    elif kind_raw in ("mark-scheme", "mark_scheme", "rms", "msc"):
        role = "MS"
    else:
        role = "OTHER"
    year = 0
    series = "UNKNOWN"
    if date_s:
        year = int(date_s[:4])
        month = int(date_s[4:6])
        series_month = "JUN" if month <= 8 else "NOV"
        series = f"{series_month}{year}"
    return FileHit(path, role, "GCSE-EDX-1CH0", code, series, year, tier, year == 0, "" if year else "missing date")


def parse_cie(path: Path) -> FileHit | None:
    m = re.match(
        r"(?i)^0620_([msw])(\d{2})_(qp|ms|er|gt|ir|ci)(?:_(\d{2}))?\.pdf$",
        path.name,
    )
    if not m:
        if "0620" in path.name.lower():
            return FileHit(
                path, "OTHER", "IGCSE-CAIE-0620", "VERIFY", "UNKNOWN", 0, "UNKNOWN", True, "unparsed CIE name"
            )
        return None
    sess, yy, kind, paper = m.group(1).lower(), m.group(2), m.group(3).lower(), m.group(4)
    year = 2000 + int(yy)
    series_month = {"m": "MAR", "s": "JUN", "w": "NOV"}[sess]
    series = f"{series_month}{year}"
    if kind == "qp":
        role = "QP"
    elif kind == "ms":
        role = "MS"
    elif kind == "er":
        role = "ER"
    else:
        return None
    if role in ("QP", "MS") and not paper:
        return FileHit(
            path, role, "IGCSE-CAIE-0620", "VERIFY", series, year, "UNKNOWN", True, "missing paper variant"
        )
    if role == "ER":
        return FileHit(path, "ER", "IGCSE-CAIE-0620", "0620/ER", series, year, "BOTH")

    paper_num = int(paper[0])
    tier = {
        1: "CORE",
        2: "EXTENDED",
        3: "CORE",
        4: "EXTENDED",
        5: "BOTH",
        6: "BOTH",
    }.get(paper_num, "UNKNOWN")
    code = f"0620/{paper}"
    return FileHit(path, role, "IGCSE-CAIE-0620", code, series, year, tier)


def collect_hits(extracted: Path) -> list[FileHit]:
    hits: list[FileHit] = []
    board_roots = {
        "aqa": parse_aqa,
        "cie": parse_cie,
        "edexcel": parse_edexcel,
    }
    for board, parser in board_roots.items():
        root = extracted / board
        if not root.is_dir():
            continue
        for pdf in sorted(root.rglob("*.pdf")):
            if "__MACOSX" in pdf.parts or pdf.name.startswith("._"):
                continue
            hit = parser(pdf)
            if hit is None:
                continue
            hits.append(hit)
    return hits


def build_rows(hits: list[FileHit]) -> tuple[list[PaperRow], list[str]]:
    by_key: dict[tuple, PaperRow] = {}
    er_by_series: dict[tuple, Path] = {}
    warnings: list[str] = []

    for h in hits:
        if h.role == "ER":
            er_by_series[(h.track_id, h.series, h.exam_year)] = h.path
            continue
        if h.exam_year and (h.exam_year < MIN_YEAR or h.exam_year > MAX_YEAR):
            continue
        if h.exam_year == 0 and h.verify:
            warnings.append(f"SKIP VERIFY zero-year: {rel(h.path)} ({h.note})")
            continue
        key = (h.track_id, h.paper_code, h.series, h.exam_year, h.tier)
        row = by_key.get(key)
        if row is None:
            row = PaperRow(h.track_id, h.paper_code, h.series, h.exam_year, h.tier)
            by_key[key] = row
        if h.verify:
            row.verify = True
            if h.note:
                row.notes.append(h.note)
        if h.role == "QP":
            if row.qp is not None:
                row.notes.append(f"duplicate QP: {rel(h.path)}")
                row.verify = True
            row.qp = h.path
        elif h.role == "MS":
            if row.ms is not None:
                row.notes.append(f"duplicate MS: {rel(h.path)}")
                row.verify = True
            row.ms = h.path
        else:
            row.notes.append(f"ignored role {h.role}: {rel(h.path)}")

    for row in by_key.values():
        er = er_by_series.get((row.track_id, row.series, row.exam_year))
        if er:
            row.er = er

    return sorted(by_key.values(), key=lambda r: r.key), warnings


def write_csv(rows: list[PaperRow], out: Path) -> dict:
    out.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "track_id",
        "paper_code",
        "series",
        "exam_year",
        "tier",
        "source_url",
        "sha256_paper",
        "sha256_scheme",
        "sha256_examiner_report",
        "licence_status",
        "licence_notes",
        "status",
        "local_paper_path",
        "local_scheme_path",
        "local_examiner_report_path",
    ]
    stats = defaultdict(int)
    complete = []
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in rows:
            stats["total"] += 1
            stats[row.track_id] += 1
            incomplete = row.qp is None or row.ms is None
            if incomplete:
                stats["incomplete"] += 1
                status = "INCOMPLETE"
            elif row.verify or row.paper_code == "VERIFY":
                stats["verify"] += 1
                status = "VERIFY"
            else:
                stats["ready"] += 1
                status = "READY"
                complete.append(row)

            notes = list(row.notes)
            if row.qp is None:
                notes.append("missing QP")
            if row.ms is None:
                notes.append("missing MS")

            sha_p = sha256_file(row.qp) if row.qp else ""
            sha_s = sha256_file(row.ms) if row.ms else ""
            sha_e = sha256_file(row.er) if row.er else ""

            w.writerow(
                {
                    "track_id": row.track_id,
                    "paper_code": row.paper_code,
                    "series": row.series,
                    "exam_year": row.exam_year,
                    "tier": row.tier,
                    "source_url": SOURCE_URLS.get(row.track_id, ""),
                    "sha256_paper": sha_p,
                    "sha256_scheme": sha_s,
                    "sha256_examiner_report": sha_e,
                    "licence_status": "UNKNOWN",
                    "licence_notes": "; ".join(notes),
                    "status": status,
                    "local_paper_path": rel(row.qp) if row.qp else "",
                    "local_scheme_path": rel(row.ms) if row.ms else "",
                    "local_examiner_report_path": rel(row.er) if row.er else "",
                }
            )
    stats["complete_per_board"] = {
        tid: sum(1 for r in complete if r.track_id == tid) for tid in SOURCE_URLS
    }
    return dict(stats)


def write_report(stats: dict, warnings: list[str], report: Path, csv_path: Path) -> None:
    lines = [
        "# Past-paper inventory report",
        "",
        f"Queue file: `{rel(csv_path)}`",
        f"Year filter: {MIN_YEAR}–{MAX_YEAR}",
        "",
        "## Counts",
        "",
        f"- Total paper instances: {stats.get('total', 0)}",
        f"- READY (QP+MS): {stats.get('ready', 0)}",
        f"- INCOMPLETE: {stats.get('incomplete', 0)}",
        f"- VERIFY: {stats.get('verify', 0)}",
        "",
        "### Per track (all statuses)",
        "",
    ]
    for tid in SOURCE_URLS:
        lines.append(f"- {tid}: {stats.get(tid, 0)}")
    lines += ["", "### READY per board", ""]
    for tid, n in (stats.get("complete_per_board") or {}).items():
        lines.append(f"- {tid}: {n}")
    if warnings:
        lines += ["", "## Warnings (truncated)", ""]
        for w in warnings[:40]:
            lines.append(f"- {w}")
        if len(warnings) > 40:
            lines.append(f"- … {len(warnings) - 40} more")
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--extracted", type=Path, default=DEFAULT_EXTRACTED)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = ap.parse_args()

    if not args.extracted.is_dir():
        print(f"extracted dir missing: {args.extracted}", file=sys.stderr)
        return 1

    hits = collect_hits(args.extracted)
    rows, warnings = build_rows(hits)
    stats = write_csv(rows, args.out)
    write_report(stats, warnings, args.report, args.out)
    print(f"Wrote {args.out} ({stats.get('total', 0)} rows, READY={stats.get('ready', 0)})")
    print(f"Report: {args.report}")
    for tid, n in (stats.get("complete_per_board") or {}).items():
        print(f"  READY {tid}: {n}")
    if not all((stats.get("complete_per_board") or {}).get(t, 0) >= 1 for t in SOURCE_URLS):
        print("WARNING: need ≥1 READY pair per board", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
