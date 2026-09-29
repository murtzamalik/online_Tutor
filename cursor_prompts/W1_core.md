# Cursor prompt — W1: Core learning loop + content engine

You are implementing the Study Loop platform. First re-read `00_START_HERE.md`, `AGENTS.md`, `docs/02_decisions_register.md`, `docs/05_repo_structure_and_standards.md` and the docs named below. Do NOT re-decide anything in the decisions register; if something seems wrong, write it under "Questions" in `docs/CURSOR_UNDERSTANDING.md` and continue with the safest assumption.
Rules: (1) vertical slices, real endpoints, no mocked data on main; (2) every screen has all states + a11y; (3) AI only via the gateway, no personal data in prompts (D-15); (4) numbers/totals in code; (5) update the traceability matrix; (6) tests with each PR; (7) stop at the wave gate and report.

**Read for this wave:** docs 04 (PF-01,02,07,08), 09, 10, 14, docs/screens A,B,D,E,F,M,Q,Shell, ai_prompts/marking, question_generation, content_ingestion.

**Scope:**
- Public marketing site & catalogue (A-*), sign-up/verify/age check/child profiles/picture PIN (B-*), consents (L-01 minimal)
- Practice engine (D-01, D-12, D-06 photo, D-09 redrill) with adaptive selection, hints, confidence hooks
- Marking pipeline GCSE/iGCSE: pre-checks, P-MK-01/02/03/05/06/07, validation, SSE result, exceptions (F-01/02/04/10)
- Mastery consumer (BKT, IRT cold start, FSRS scaffolding), misconception classifier
- Content consoles: QC exceptions (E-01), authoring & paper import (E-02), spec tree (M-01), style profiles (M-02), tagging progress (M-04)
- Ingestion pipeline (P-IN-*), generation pipeline (P-QG-*) with C1–C10 + QC1–5 nightly batch
- AI ops: eval dashboard (Q-01), boundary log (Q-02), prompt/model config (Q-03)
- Student home (Shell-01), parent home (Shell-02) basics

**Screens:** see `docs/18_implementation_plan_waves.md` table for W1 and each screen's spec in `docs/screens/`.

**Definition of done:** Gate: a seeded student can sign up, run a diagnostic, practise chemistry across a board-track, get marked in < 8 s p95 with exceptions routed; nightly generation produces APPROVED items; gold-set eval harness runs (data pending P-2).

**Output at the end of the wave:** (a) built vs scope list; (b) traceability rows updated; (c) deviations/assumptions; (d) open questions; (e) demo script.

**First action:** produce a task breakdown (epics → tasks) for this wave in `docs/waves/W1_plan.md`; stop only on a genuine blocker, otherwise start implementing in the listed order.
