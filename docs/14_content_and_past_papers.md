# 14 · Content & Past Papers

## Content model
`qualification → subject → specification (board, spec_code, tier scheme) → spec_unit → spec_topic (levels 1–3) → spec_point_objective`. Pilot seed (V009): 7 chemistry specs, 15 units, 67 level-1 topics, board style-profile skeletons. **Verify every spec_code and unit/paper duration against official specs before go-live** (scaffold shows discrepancies, e.g. Edexcel 1CH0 duration).

## Sources & licensing
- **Official exam-board materials only** for grounding; never third-party revision sites (PMT explicitly excluded — Content Sourcing decision). Board licensing for AI-assisted use is an **open legal item (P-3)**; until confirmed, ingested papers are `licence_status = UNKNOWN/PENDING_BOARD_CONFIRMATION` and are used for *retrieval/style grounding only*, never displayed verbatim to students except where the board's teaching-use terms allow (E-02 flag controls `is_displayable`).
- Generated questions are original: n-gram (9-word) + embedding similarity checks vs past papers and bank; past-paper duplicates always fail.

## Bank-first generation (D-25)
Coverage planner (per spec point × objective × question type × marks × grade band; target `bank.min_items_per_cell` 12) → nightly batch: P-QG-02/03 → code checks C1–C10 → QC1–5 → APPROVED/E-01. Numeric items: calc templates, code renders N instances (D-26). Diagrams: library/chart only (D-27).
Human touch: E-01 exceptions; E-02 manual authoring; spot-check sampling (5% of auto-approved for the first 4 weeks; rate configurable) to calibrate trust — **added recommendation**, cheap insurance for accuracy claims.

## Past-paper items as "real past paper" content (US-029)
Where licensing allows display, items carry `source_type = PAST_PAPER` and are labelled "from [board] [year] paper" in D-01. Otherwise they serve only as exemplars.

## Revision content
Notes/flashcards/cheat sheets generated in batch (P-RC-*), QC'd (P-RC-04), approved-only serving, versioned. Student-created decks are private; sharing goes through moderation (P-SF-03) and parent controls.

## Marketing/CMS
FAQ (≥ 11 Q&As), case studies (consent-verified only), outcome stats (dated + sourced), help articles, resources — editable via CMS endpoints; no hard-coded copy in UI.

## Manifest
`data/past_papers/` — see README there. **No paper codes invented**; VERIFY rows must be completed from covers.
