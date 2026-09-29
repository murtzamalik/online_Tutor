# Epic E — E. AI Question Generation

## E-01 — AI Question QC — Exceptions

- **Route:** `/staff/content/qc`  
- **Roles:** Content Admin  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-041 (Review only the AI-generated questions that fail automated quality che…), US-089 (Work through the queue of AI-generated questions that failed automated…), US-112 (See only generated questions that fail automated quality checks — so t…), US-037 (Ground every generated question in real past papers and mark schemes, …), US-039 (Tag every question to its exact specification point, not just a broad …)
- **Design notes (inventory):** Automated checks: grounding in a real past-paper source, spec-point tag, mark-scheme consistency, duplicate detection, answerability by the marking model. Passing questions publish automatically; only failures appear here. US-037/038/039/040 are backend pipeline behaviour.
- **Baseline v1.0 change:** REVISED — was "AI Question QC Review Queue". Every question reviewed by a human → automated 5-check QC; only failures reach a human (D-18).
- **Behaviour, states & acceptance criteria:**
  - Exceptions queue (only failed QC), side-by-side question/mark-scheme/QC results, edit, rerun, approve/reject
  - AC: approved item gets published_at + audit
- **Endpoints wired:**
  - `CNT-01` `GET /api/v1/internal/qc/exceptions` — E-01 failed-QC list
  - `CNT-02` `GET /api/v1/internal/qc/exceptions/{questionId}` — Item, all five checks, repair log, similar items
  - `CNT-03` `PUT /api/v1/internal/questions/{questionId}` — Edit item + scheme (re-runs code checks and QC1,3,5)
  - `CNT-04` `POST /api/v1/internal/qc/exceptions/{questionId}/rerun` — Re-run QC
  - `CNT-05` `POST /api/v1/internal/qc/exceptions/{questionId}/reject` — Reject with reason
  - `CNT-06` `POST /api/v1/internal/qc/exceptions/{questionId}/approve` — Approve after passing re-run
  - `CNT-11` `GET /api/v1/internal/questions` — Search bank
  - `GEN-04` `GET /api/v1/internal/generation/runs/{runId}` — Run stats and cost
  - `GEN-01` `GET /api/v1/internal/generation/coverage` — Bank coverage per objective × type × band
  - `GEN-02` `POST /api/v1/internal/generation/plan` — Planner: gaps → blueprints
  - `GEN-03` `POST /api/v1/internal/generation/runs` — Start NIGHTLY/TOPUP/MANUAL run (Batch API)
  - `RVC-01` `POST /api/v1/internal/revision/generate` — Generate notes/flashcards/cheat sheets for a topic (batch)
  - `RVC-02` `GET /api/v1/internal/revision/exceptions` — Failed revision QC
- **Tables touched (via those endpoints):** `audit_log`, `blueprint`, `cheat_sheet`, `flashcard`, `flashcard_deck`, `generation_run`, `mark_scheme`, `qc_check_result`, `question`, `question_generation_log`, `revision_note`, `spec_point_objective`
- **AI prompts:** `P-QG-04` (QC1 grounding & chemistry accuracy), `P-QG-05` (QC2 blind spec-point tagging), `P-QG-06` (QC3 mark-scheme consistency), `P-QG-07` (QC4 duplicate adjudication), `P-QG-08a` (QC5 strong solver), `P-QG-08b` (QC5 weak answer), `P-QG-09` (Repair)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## E-02 — Question Authoring & Past-Paper Import

- **Route:** `/staff/content/authoring`  
- **Roles:** Content team member  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-111 (Author questions with mark schemes and import past papers with spec ta…), US-037 (Ground every generated question in real past papers and mark schemes, …), US-040 (Supplement the question bank with reviewed, clearly-labelled material …)
- **Design notes (inventory):** Author questions with mark schemes; import past papers with spec-point tags and licence status (no PMT material).
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Manual authoring + past-paper import wizard, licence flag, ingest status, per-item approve
  - AC: no item published without licence status set
- **Endpoints wired:**
  - `CNT-10` `POST /api/v1/internal/questions` — Author a question + scheme (E-02)
  - `CNT-11` `GET /api/v1/internal/questions` — Search bank
  - `CNT-12` `POST /api/v1/internal/past-papers` — Register paper (metadata, official source URL, licence status) + upload PDFs
  - `CNT-13` `GET /api/v1/internal/past-papers` — List/filter (board, year, licence, ingest status)
  - `CNT-14` `GET /api/v1/internal/past-papers/{paperId}` — Detail with items
  - `CNT-15` `POST /api/v1/internal/past-papers/{paperId}/ingest` — Start pipeline (segment → scheme → tag → embed)
  - `CNT-16` `GET /api/v1/internal/past-papers/{paperId}/ingest-status` — Job stages and stats
  - `CNT-17` `PATCH /api/v1/internal/past-papers/{paperId}/licence` — Update licence status/evidence (P-3)
  - `CNT-18` `PATCH /api/v1/internal/past-paper-items/{itemId}` — Fix segmentation/tag
  - `CNT-19` `POST /api/v1/internal/past-paper-items/{itemId}/approve` — Approve into bank
  - `CNT-20` `POST /api/v1/internal/questions/{questionId}/retire` — Retire an item
  - `DGM-01` `GET /api/v1/internal/diagrams` — Library
  - `DGM-02` `POST /api/v1/internal/diagrams` — Upload + approve apparatus diagram (alt text mandatory)
  - `CMS-01` `POST /api/v1/internal/case-studies` — Create case study with consent evidence
  - `CMS-02` `PUT /api/v1/internal/faq/{faqId}` — Edit FAQ
  - `CMS-03` `PUT /api/v1/internal/help-articles/{articleId}` — Edit help article
  - `CMS-04` `PUT /api/v1/internal/outcome-stats/{statId}` — Edit outcome stat + methodology
- **Tables touched (via those endpoints):** `audit_log`, `case_study`, `diagram_asset`, `faq_item`, `help_article`, `ingestion_job`, `mark_scheme`, `outcome_stat`, `past_paper`, `past_paper_item`, `question`, `question_embedding`
- **AI prompts:** `P-IN-01` (Paper page segmentation (vision)), `P-IN-02` (Mark-scheme extraction (vision)), `P-IN-03` (Paper metadata extraction), `P-IN-06` (Examiner-report insight extraction), `P-QG-05` (QC2 blind spec-point tagging)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
