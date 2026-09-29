# Cursor prompt — W2: Pilot completion

You are implementing the Study Loop platform. First re-read `00_START_HERE.md`, `AGENTS.md`, `docs/02_decisions_register.md`, `docs/05_repo_structure_and_standards.md` and the docs named below. Do NOT re-decide anything in the decisions register; if something seems wrong, write it under "Questions" in `docs/CURSOR_UNDERSTANDING.md` and continue with the safest assumption.
Rules: (1) vertical slices, real endpoints, no mocked data on main; (2) every screen has all states + a11y; (3) AI only via the gateway, no personal data in prompts (D-15); (4) numbers/totals in code; (5) update the traceability matrix; (6) tests with each PR; (7) stop at the wave gate and report.

**Read for this wave:** docs 04 (PF-05,06,09,10,11,12), 11, 13, 16, docs/screens C,G,H,J,L,O,P, ai_prompts/tutor, voice, safety, reporting.

**Scope:**
- Billing (C-*): Stripe trial/checkout, manage/cancel, dunning, invoices; entitlements
- Parent dashboards & controls (H-01, H-09, H-10 API), weekly report job, notifications basics
- Tutor backend (TUT-*), safety layers (P-SF-*), scripted responses, DSL consoles (L-04, Q-05); voice tutor (J-01, J-06) with consent; G-02..G-04
- Privacy: settings (L-03), deletion/export (L-02), legal pages & cookies (Shell-10)
- Schools (O-*): classes, assignments, insights, onboarding (CSV, SSO), DPA & invoices, KCSIE
- Support console (P-03), audit viewer (P-04), staff vetting (uCheck), AI cost (Q-04)

**Screens:** see `docs/18_implementation_plan_waves.md` table for W2 and each screen's spec in `docs/screens/`.

**Definition of done:** Gate: end-to-end pilot scenario for consumers and one pilot school; safeguarding drill; boundary attestation 14 days clean; pen test scheduled/passed.

**Output at the end of the wave:** (a) built vs scope list; (b) traceability rows updated; (c) deviations/assumptions; (d) open questions; (e) demo script.

**First action:** produce a task breakdown (epics → tasks) for this wave in `docs/waves/W2_plan.md`; stop only on a genuine blocker, otherwise start implementing in the listed order.
