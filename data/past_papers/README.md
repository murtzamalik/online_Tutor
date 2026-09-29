# Past-paper manifest & ingestion pack

**What this is:** the list of exam-board papers (per board-track) to ingest for the Chemistry pilot, with the paper-code *patterns* we are confident about and explicit flags where a code must be verified. **No paper codes were invented**: rows marked `VERIFY` must be completed from the paper's own cover page.

## Rules (non-negotiable)
1. **Official sources only** — exam-board websites listed in `official_source_home`. Never physicsandmathstutor.com or any third-party (decision D-05/Content Sourcing Log; column `past_paper.source_url` must be a board domain).
2. **Licence first** — every paper starts `licence_status = UNKNOWN`. Ingestion for *reference/grounding use* may proceed only under the status recorded in E-02 (`CNT-17`); generated questions must never copy (n-gram + embedding checks). Open item P-3: written confirmation from each board for AI-assisted use. Store the evidence file key in `licence_evidence_key`.
3. **No 2020/2021 GCSE series** in England (no exams sat); iGCSE series differ — check the board.
4. Human confirms metadata (P-IN-03) before segmentation. Paper code is copied from the cover, never inferred by a model.
5. Target volume for the pilot: ≥ 4 recent series per paper type (≈ 300–400 papers across 7 tracks) — enough for style profiles and retrieval exemplars; the bank itself is generated (bank-first, D-25).

## Files
- `paper_manifest.csv` — paper types per track (this folder). `code_confidence`: `PATTERN_KNOWN` (structure believed correct — still re-check on the cover) or `VERIFY_ON_OFFICIAL_SITE`.
- `ingestion_queue_template.csv` — one row per (paper × series) to fetch; content team fills `source_url`, `sha256`, `licence_status`; the import job (`CNT-12`/`CNT-15`) reads it.
- `series_calendar.md` — which series exist for each track and how to enumerate them.

## Procedure (E-02)
`add paper (CNT-12) → set licence (CNT-17) → upload PDFs + mark scheme + examiner report → ingest (CNT-15) → P-IN-03 metadata confirm → P-IN-01 segment → P-IN-02 scheme → validation → P-QG-05 tagging → embed → per-item review (CNT-18/19)`.
