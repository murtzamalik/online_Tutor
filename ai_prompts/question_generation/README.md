# Question Generation — AI Prompt Pack v1.0

| | |
|---|---|
| Feature | Epic E · AI Question Generation |
| Stories | US-037, US-038, US-039, US-040, US-041, US-042, US-043, US-111, US-112 |
| Screens | E-01 (QC exceptions), E-02 (authoring & past-paper import), M-01 (spec tree), M-02 (board style profiles), Q-03 (prompt config) |
| Scope | Pilot: GCSE (AQA, Edexcel, OCR Gateway A, Eduqas, WJEC) + iGCSE (Edexcel 4CH1, Cambridge 0620/0971) Chemistry |
| Decisions | D-15 data boundary · D-18 automated QC · D-24 self-hosted embeddings · D-25 bank-first · D-26 code computes numbers · D-27 diagram policy · D-28 model-agnostic gateway |
| Status | v1.0 — ready for development. Thresholds marked *starting value* are tuned during the pilot. |
| Date | 21 Sep 2026 · Karsaaz Solutions |

This folder is the single source for every prompt the question-generation feature sends to an AI model.
Developers load these files into the `prompt_version` table (one row per prompt file version) and call them
**only through the AI Gateway**. Nothing here is sent to a model directly from application code.

---

## 1. Pipeline

```
 INGEST (code, E-02)                past papers + mark schemes + examiner reports
   │                                → one row per question part, spec-tagged, licence-tagged, embedded (pgvector)
   ▼
 P-QG-01 Spec-point decomposition   once per spec point → assessable objectives (stored, reused)
   ▼
 PLANNER (code)                      coverage gaps per objective × question type × marks × grade band → blueprints
   ▼
 ┌─ P-QG-02 Item generator ──────────── non-numeric items (MCQ, short answer, explain, 6-mark extended)
 └─ P-QG-03 Calculation template ────── numeric items → code solver renders N instances (D-26)
   ▼
 CODE CHECKS (10_code_side_checks.md) schema · marks sum · equation balance · Mr/Ar · sig figs · embedding similarity
   ▼
 QC 1  P-QG-04 Grounding & chemistry accuracy
 QC 2  P-QG-05 Blind spec-point tagging        (code compares with the blueprint tag)
 QC 3  P-QG-06 Mark-scheme consistency
 QC 4  P-QG-07 Duplicate / near-copy adjudication (only for grey-zone similarity scores)
 QC 5  P-QG-08a strong solver · P-QG-08b weak answer · P-QG-08c QC marker   (code applies the pass rule)
   ▼
 all pass ──► PUBLISHED  (question.review_status = APPROVED, source_type = AI_GENERATED)
 any fail ──► P-QG-09 Repair (max 1 attempt) ──► re-run failed checks ──► still failing ──► E-01 exceptions queue
```

## 2. File index

| File | Prompt ID | Purpose | Model tier (config key) | Temp. |
|---|---|---|---|---|
| `prompts/00_shared_rules.md` | P-QG-00 | System block prepended to every prompt below | — | — |
| `prompts/01_spec_point_decomposition.md` | P-QG-01 | Break a spec point into assessable objectives | `qg.decompose` → large | 0 |
| `prompts/02_item_generator.md` | P-QG-02 | Write one question + mark scheme from a blueprint | `qg.generate` → large | 0.9* |
| `prompts/03_calc_template_generator.md` | P-QG-03 | Write a parametric calculation template (no numbers solved) | `qg.calc_template` → large | 0.7* |
| `prompts/04_qc_grounding.md` | P-QG-04 | Chemistry accuracy, spec/tier bounds, board style | `qg.qc.grounding` → large | 0 |
| `prompts/05_qc_spec_tag.md` | P-QG-05 | Blind tagging of the item to a spec point | `qg.qc.tag` → small | 0 |
| `prompts/06_qc_mark_scheme.md` | P-QG-06 | Mark scheme is consistent, fair and markable | `qg.qc.markscheme` → large | 0 |
| `prompts/07_qc_duplicate.md` | P-QG-07 | Grey-zone duplicate / near-copy verdict | `qg.qc.duplicate` → small | 0 |
| `prompts/08_qc_answerability.md` | P-QG-08a/b/c | Strong solver, weak answer, QC marker | `qg.qc.solve` large · `qg.qc.weak` small · `qg.qc.mark` large | 0.3 / 0.7 / 0 |
| `prompts/09_repair.md` | P-QG-09 | Fix only the issues the checks reported | `qg.repair` → large | 0.3 |
| `schemas/*.json` | — | JSON Schemas for every model output (use as structured-output / tool schemas) | — | — |
| `10_code_side_checks.md` | — | Deterministic checks, solver contract, thresholds | — | — |
| `11_diagram_policy.md` | — | D-27 rules for diagrams and graphs | — | — |
| `12_evaluation_and_promotion.md` | — | How a new prompt version is tested before it goes live | — | — |
| `examples/worked_example_aqa_8462_4.3.md` | — | End-to-end run on two real AQA spec points | — | — |

\* Temperature applies only where the configured model supports it. "Large" / "small" are Gateway routing tiers, not model names.
The pilot routes every tier to Claude (D-28). The concrete model per tier lives in Q-03 config, never in code.

## 3. How to call a prompt (developer contract)

1. Build the request through the Gateway client: `gateway.run(promptId, version, variables, schemaRef)`.
2. Message order for **prompt caching** — static first, dynamic last:
   1. `P-QG-00` shared rules (cache)
   2. Board style profile block (cache per board)
   3. Exemplars block (cache per spec point + question type)
   4. Task-specific input (blueprint, item under check) — not cached
3. Always request **structured output** against the matching schema in `schemas/`. Reject and retry once
   on schema failure; a second failure is logged as `GENERATION_ERROR` (not a QC failure).
4. Variables are written `{{like_this}}`. Every variable listed in a prompt's *Inputs* table is required
   unless marked optional. Unknown / empty variables are a build-time error, not a silent blank.
5. Nightly generation uses the **Message Batches API** (D-25). On-demand top-up (a spec-point cell below
   `bank.min_items_per_cell`) uses normal calls with the same prompts.

## 4. Privacy (D-15)

No learner data of any kind enters these prompts — they only contain specification text, board style notes,
past-paper exemplars and generated items. The Gateway still logs every call (Q-02) with a random request token.

## 5. Data contract changes required

These go into the Postgres port of `content_model_schema.sql`:

| Change | Detail |
|---|---|
| `question.review_status` | Values become: `PENDING_QC`, `APPROVED`, `QC_FAILED` (visible in E-01), `REJECTED`, `RETIRED` (IRT retirement). |
| `question_generation_log.human_review_required` | Remove (D-18). Add `blueprint_json`, `variant_kind`, `template_id` (nullable), `repair_attempted` (bool), `prompt_versions_json`. |
| New `spec_point_objective` | Output of P-QG-01: `objective_id`, `spec_topic_id`, `objective_text`, `allowed_question_types[]`, `allowed_command_words[]`, `mark_range`, `tier`, `misconceptions_json`, `prompt_version`. |
| New `calc_template` | Output of P-QG-03 + render seed history; `question.template_id` links rendered instances. |
| New `qc_check_result` | `question_id`, `check_id` (QC1–QC5 + CODE), `prompt_version`, `passed`, `score`, `issues_json`, `run_at`. Drives E-01. |
| New `question_embedding` | `question_id`, `embedding vector(N)`, `embedding_model` (D-24 self-hosted model), `source_kind` (BANK / PAST_PAPER). |

## 6. Configuration keys (starting values)

| Key | Start | Meaning |
|---|---|---|
| `bank.min_items_per_cell` | 12 | Min approved items per objective × question type × grade band before top-up |
| `qc.dup.bank_fail` | 0.93 | Cosine ≥ this vs an approved bank item → duplicate (fail) |
| `qc.dup.pastpaper_fail` | 0.90 | Cosine ≥ this vs a real past-paper item → near-copy (fail) |
| `qc.dup.grey_low` | 0.82 | Between grey_low and the fail values → P-QG-07 decides |
| `qc.tag.min_confidence` | 0.75 | P-QG-05 confidence below this → fail |
| `qc.solve.runs` | 2 | Strong-solver runs; all must reach full marks |
| `qc.repair.max_attempts` | 1 | Repair attempts before E-01 |
| `calc.instances_per_template` | 8 | Rendered instances per approved template |

Thresholds depend on the embedding model chosen under D-24 — recalibrate them once on the ingested past papers
before first use (method in `10_code_side_checks.md` §5).
