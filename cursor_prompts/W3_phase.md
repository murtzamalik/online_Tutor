# Cursor prompt — W3: Phase 2

You are implementing the Study Loop platform. First re-read `00_START_HERE.md`, `AGENTS.md`, `docs/02_decisions_register.md`, `docs/05_repo_structure_and_standards.md` and the docs named below. Do NOT re-decide anything in the decisions register; if something seems wrong, write it under "Questions" in `docs/CURSOR_UNDERSTANDING.md` and continue with the safest assumption.
Rules: (1) vertical slices, real endpoints, no mocked data on main; (2) every screen has all states + a11y; (3) AI only via the gateway, no personal data in prompts (D-15); (4) numbers/totals in code; (5) update the traceability matrix; (6) tests with each PR; (7) stop at the wave gate and report.

**Read for this wave:** docs docs/screens (W3 rows), ai_prompts/revision_content, 09 (A-Level), 10.

**Scope:**
- Mocks (D-02/03/11), multi-version drill (D-05), custom quizzes (D-07), daily goals (D-08), re-explain & Socratic chat UI (F-06/F-07), self-mark (F-03), surprise quizzes (G-01)
- Revision content (I-*), predicted grade & misconception views (H-02/04/08), plan reveal (B-07), student standalone signup (B-03), pricing/compare/upgrade (C-01/04/05)
- A-Level go-live: provisional marking + review workbench (F-05/F-09) after reviewer vetting (P-1)
- Support: help centre, live chat (P-01/02); notifications centre (Shell-05); in-app search (Shell-08); marking-flag dashboard (M-03); marketing Phase 2 pages

**Screens:** see `docs/18_implementation_plan_waves.md` table for W3 and each screen's spec in `docs/screens/`.

**Definition of done:** Gate: per-feature acceptance from screen specs; A-Level review SLA drill.

**Output at the end of the wave:** (a) built vs scope list; (b) traceability rows updated; (c) deviations/assumptions; (d) open questions; (e) demo script.

**First action:** produce a task breakdown (epics → tasks) for this wave in `docs/waves/W3_plan.md`; stop only on a genuine blocker, otherwise start implementing in the listed order.
