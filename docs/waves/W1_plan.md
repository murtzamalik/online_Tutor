# W1 Plan — Core learning loop + content engine

**Wave:** W1 · Core learning loop + content engine  
**Gate:** Seeded student can sign up → diagnostic → practise Chemistry on a board-track → marked (p95 &lt; 8s) with exceptions routed; nightly generation produces APPROVED items; gold-set eval harness runs (data pending P-2).  
**Sign-off:** W0 gate approved by architect (29 Sep 2026). Do not start W2 until W1 gate report is signed off.

**Read for this wave:** docs 04 (PF-01,02,07,08), 09, 10, 14; screens A,B,D,E,F,M,Q,Shell; `ai_prompts/marking`, `question_generation`, `content_ingestion`.

## Scope checklist (36 screens)

| Epic | Screens | Priority |
|---|---|---|
| E1 Marketing & catalogue | A-01, A-02, A-03, A-05, A-08 | Public |
| E2 Onboarding & identity | B-01, B-02, B-04, B-05, B-06, B-08, B-10, B-11, L-01 minimal, Shell-04/09 polish | Critical path |
| E3 Practice engine | D-01, D-12, D-11 (results stub if mock not full), Shell-01 | Critical path |
| E4 Marking pipeline GCSE/iGCSE | F-01, F-02, F-04, F-10 | Critical path |
| E5 Mastery consumer | BKT + IRT cold start + FSRS scaffolding; Shell-01/02 aggregates | Critical path |
| E6 Content consoles | E-01, E-02, M-01, M-02, M-04 | Staff |
| E7 Gen + ingestion | GEN-*, P-QG-*, C1–C10, QC1–5 nightly; P-IN-* | Gate extras |
| E8 AI ops | Q-01, Q-02, Q-03 | Staff |
| E9 Shell polish | Shell-02, Shell-06, Shell-10 | Must |

## Implementation order (vertical slices)

| # | Slice | Size | Delivers | Gate? |
|---|---|---|---|---|
| S1 | Catalogue CAT-01..05 + B-04 data plane | S | Specs/boards/subjects from V009 | Yes |
| S2 | Parent signup/verify/age + B-01/B-10 + CON legal minimal | M | PF-01 start | Yes |
| S3 | Child profile + picture PIN AUTH-15 + B-02/B-11 + CON-02 | M | Student identity | Yes |
| S4 | Enrolment STU-06/07 + **demo question bank seed** (AQA 8462) | M | Practiseable bank | Yes |
| S5 | Diagnostic DIA-01..04 + B-06 UI | L | Seeds mastery | Yes |
| S6 | Practice PRA-01..05,07–09 + D-01 (+ D-12 chem input) | L | Practise loop | Yes |
| S7 | Marking: pre-checks → P-MK-01/02/03/05/07 → validate → SSE + F-01/F-02 | L | &lt;8s mark path | Yes |
| S8 | Exceptions EXC-* + F-04/F-10 + dispute | L | Exception routing | Yes |
| S9 | Mastery consumer (BKT/IRT/FSRS) + Shell-01/02 | M | Home real data | Yes |
| S10 | Nightly GEN-01..04 + C1–C10; CNT approve; AIO eval harness | L | Full gate | Yes |
| S11 | Marketing A-* + Shell-06/10 + B-05/B-08 | M | Public + settings | Wave complete |
| S12 | Staff consoles E-01/E-02, M-01/02/04, Q-01/02/03 | L | Content/AI ops | Wave complete |

**Defer if pressed (still in inventory, flag/stub OK):** photo PRA-06 / P-MK-06; full mock D-11 depth; Stripe trial (stub entitlement in W1); TUT-05 polish; Wonde.

## Task breakdown

### S1 — Catalogue
- [x] T1.1 CAT-01..05 repositories + controllers against V009 seed
- [x] T1.2 Role-map annotations + tests
- [x] T1.3 B-04 subject selector wired (web)

### S2 — Parent signup / verify / age
- [x] T2.1 AGE-01..03 + CON-05/06 legal docs
- [x] T2.2 B-01 `/signup`, B-10 `/verify-email` screens
- [x] T2.3 Wire AUTH-01..03 already present; complete UX states + a11y

### S3 — Child profile + picture PIN
- [x] T3.1 STU-01/02/04 create child + credential
- [x] T3.2 AUTH-15 picture PIN login (leave FEATURE_DISABLED only if incomplete — prefer implement)
- [x] T3.3 B-02, B-11 screens; CON-02 under-13 consent stub

### S4 — Enrolment + demo bank
- [x] T4.1 STU-06/07 enrolment to board-track
- [x] T4.2 Flyway **V013** demo seed: ≥12 APPROVED questions + schemes on AQA 8462 (topics 1–3); no edit to V001–V012
- [x] T4.3 Entitlement stub for pilot (no Stripe yet)

### S5 — Diagnostic
- [x] T5.1 DIA-01..04 + IRT cold-start selection
- [x] T5.2 B-06 screen; writes `diagnostic_run` + initial `mastery_state`

### S6 — Practice
- [x] T6.1 PRA-01 start session, PRA-03 adaptive select, PRA-04 submit, PRA-05 SSE status
- [x] T6.2 D-01 renderer (MCQ / short / numeric); D-12 chem structured input
- [x] T6.3 Hints PRA-07..09; confidence ENG-01 hook (minimal)

### S7 — Marking pipeline
- [x] T7.1 Code pre-checks (MCQ, numeric, equation balance hooks)
- [x] T7.2 Gateway calls P-MK-01∥02, P-MK-03 for 6-mark, P-MK-05 chem, P-MK-07 feedback
- [x] T7.3 Code validate / Pass A·B compare / totals; exception triggers
- [x] T7.4 F-01 result + F-02 scheme reveal; MRK-* endpoints
- [x] T7.5 Stub fixtures for all P-MK-* used; latency budget test

### S8 — Exceptions & disputes
- [x] T8.1 EXC-01..05 queue + resolve → gold candidate + mastery recompute
- [x] T8.2 F-04 dispute; F-10 staff UI
- [x] T8.3 Outbox → mastery consumer event

### S9 — Mastery + homes
- [x] T9.1 BKT update consumer; FSRS scaffolding; MAS-07 due list
- [x] T9.2 Shell-01 student home real aggregates
- [x] T9.3 Shell-02 parent home basics (RPT-01/STU-01)

### S10 — Generation + eval
- [x] T10.1 JobRunr nightly GEN-01..04; C1–C10 code gates; P-QG-* via gateway
- [x] T10.2 Minimal CNT approve path for NEEDS_REVIEW → APPROVED
- [x] T10.3 AIO eval harness + synthetic gold until P-2
- [ ] T10.4 Q-01/02/03 minimal read UIs

### S11 — Marketing & settings
- [x] T11.1 A-01/02/03/05/08 CMS-backed or static content APIs
- [ ] T11.2 Shell-06 settings; Shell-10 legal + cookies
- [ ] T11.3 B-05 goals; B-08 target grade

### S12 — Staff content consoles
- [ ] T12.1 E-01 QC exceptions; E-02 authoring/import (ingestion PF-08)
- [ ] T12.2 M-01 spec tree; M-02 style profiles; M-04 tagging progress

## Standing rules reminder
- AI only via `ai-gateway`; `tutor_gateway` cannot read learner tables
- Numbers/totals/mastery/grades in **code**
- Forward-only migrations (V013+)
- K-01 gamification remains flag-off; `a_level_review` remains off
- Wired endpoints match `api/endpoints.json`; update traceability matrix

## Gate evidence (to collect)
1. Demo script: signup → verify → add child → enrol AQA Chem → diagnostic → practise → mark &lt; 8s → exception path
2. `verify_db_gate.sh` still green after V013
3. Nightly gen dry-run produces ≥1 APPROVED (or seeded APPROVED + gen path tested)
4. Eval harness runs on synthetic gold
5. Traceability `w1_status=W1_BUILT` for the 36 screens (or partial with explicit deferrals)
6. `docs/waves/W1_gate_report.md`

## Deviations / assumptions (living)
- W1 uses stub entitlement (no Stripe) — billing is W2
- Demo bank seed required because V009 has catalogue only
- Photo marking (P-MK-06) may ship as FEATURE_DISABLED until camera UX ready
- P-2 gold set unvalidated; harness + synthetic only
