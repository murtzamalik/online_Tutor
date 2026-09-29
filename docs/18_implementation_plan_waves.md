# 18 · Implementation Plan — Waves W0–W4

Build order is by **risk and dependency**, not by epic. Every screen is assigned a wave from its inventory Phase/Priority (`api/screens.json`). **Pull-forward notes:** the tutor engine (TUT-*) and safety layers are needed by the pilot voice tutor (J-01) even though the chat UI screens F-06/F-07 are Phase 2 → build engines in W2, UIs in W3. Screen H-10 (parent mobile) belongs to the mobile phase (API only here).

Wave gates are hard: do not start the next wave until the gate is met and the architect signs off. Wave timings are indicative planning figures, not commitments.


## W0 — Foundation (indicative 2–3 weeks)

**Scope**

- Monorepo, CI/CD, Docker Compose (postgres+pgvector, redis, minio, mailpit, caddy), env & secrets
- Flyway V001–V011 migrate clean; DB roles; RLS harness; ERD generated
- `common` (errors RFC7807, ids, money, clock, tracing), ArchUnit module rules, PII-log lint test
- identity skeleton (register/login/refresh/logout, JWT, MFA TOTP scaffolding), audit log writer with hash chain
- `ai-gateway` skeleton: prompt loader → `prompt_version`, routing, redaction pipeline, schema validation, logging, **stub mode with recorded fixtures**; `tutor_gateway` role test
- `embedding-service` (FastAPI + bge-base-en-v1.5) + `/embed` via gateway
- Next.js app shell, tokens.json→Tailwind, Storybook, Shell-03/04/07/09 (nav, auth, states), typed API client from OpenAPI
- OpenAPI generation + catalogue diff CI gate; role-map equality test

**Gate: `docker compose up` gives a working empty system; all migrations pass; boundary + RLS + PII-log tests green; CI green.**


## W1 — Core learning loop + content engine (indicative 6–8 weeks)

**Scope**

- Public marketing site & catalogue (A-*), sign-up/verify/age check/child profiles/picture PIN (B-*), consents (L-01 minimal)
- Practice engine (D-01, D-12, D-06 photo, D-09 redrill) with adaptive selection, hints, confidence hooks
- Marking pipeline GCSE/iGCSE: pre-checks, P-MK-01/02/03/05/06/07, validation, SSE result, exceptions (F-01/02/04/10)
- Mastery consumer (BKT, IRT cold start, FSRS scaffolding), misconception classifier
- Content consoles: QC exceptions (E-01), authoring & paper import (E-02), spec tree (M-01), style profiles (M-02), tagging progress (M-04)
- Ingestion pipeline (P-IN-*), generation pipeline (P-QG-*) with C1–C10 + QC1–5 nightly batch
- AI ops: eval dashboard (Q-01), boundary log (Q-02), prompt/model config (Q-03)
- Student home (Shell-01), parent home (Shell-02) basics

**Gate: a seeded student can sign up, run a diagnostic, practise chemistry across a board-track, get marked in < 8 s p95 with exceptions routed; nightly generation produces APPROVED items; gold-set eval harness runs (data pending P-2).**

**Screens in this wave (36)**

| ID | Screen | Priority / Phase | Route | Endpoints |
|---|---|---|---|---|
| A-01 | Homepage | Must / Ongoing | / | 7 |
| A-02 | Qualification / Subject Landing Page | Must / Ongoing | /[qualification]/[subject] | 7 |
| A-03 | FAQ Page | Must / Ongoing | /faq | 1 |
| A-05 | Lead Magnet Download / Email-Gate Modal | Should / Ongoing | /resources/[slug] | 2 |
| A-08 | Exam Date Calendar | Could / Ongoing | /exam-dates | 2 |
| B-01 | Parent Sign-Up | Must / Pilot | /signup | 6 |
| B-02 | Add Child Profile | Must / Pilot | /parent/children/new | 5 |
| B-04 | Qualification / Board / Subject Selector | Must / Pilot | /onboarding/subjects | 7 |
| B-05 | Study Goal Setter | Must / Pilot | /onboarding/goals | 3 |
| B-06 | Adaptive Diagnostic / Baseline Test | Must / Pilot | /onboarding/diagnostic | 5 |
| B-08 | Parent Sets Target Grade | Must / Pilot | /parent/children/[id]/target | 3 |
| B-10 | Email Verification | Must / Pilot | /verify-email | 2 |
| B-11 | Child Login — Picture PIN | Must / Pilot | /child-login | 2 |
| D-01 | Practice Question Screen | Must / Pilot | /practice/[sessionId] | 13 |
| D-11 | Mock Paper Results & Review | Must / Pilot | /mock/[mockId]/results | 4 |
| D-12 | Chemistry Structured Answer Input | Must / Pilot | /practice/[sessionId] (input mode) | 2 |
| E-01 | AI Question QC — Exceptions | Must / Pilot | /staff/content/qc | 13 |
| E-02 | Question Authoring & Past-Paper Import | Must / Pilot | /staff/content/authoring | 17 |
| F-01 | Instant Marking Result | Must / Pilot | /practice/[sessionId]/result/[responseId] | 4 |
| F-02 | Full Mark Scheme Reveal | Must / Pilot | /practice/[sessionId]/scheme/[questionId] | 2 |
| F-04 | "Disagree With This Mark" Flag | Must / Pilot | /practice/[sessionId]/dispute/[responseId] | 2 |
| F-10 | Marking Exceptions — GCSE/iGCSE | Must / Pilot | /staff/marking/exceptions | 5 |
| M-01 | Spec / Topic Tree Manager | Must / Pilot | /staff/spec | 8 |
| M-02 | Board Style Profile Manager | Must / Pilot | /staff/style | 4 |
| M-04 | Spec-Point Tagging Progress Tracker | Must / Pilot | /staff/spec/tagging | 1 |
| Q-01 | Marking Accuracy Eval Dashboard | Must / Pilot | /staff/ai/eval | 7 |
| Q-02 | AI Gateway — Privacy Boundary Log | Must / Pilot | /staff/ai/boundary | 4 |
| Q-03 | Prompt & Model Configuration | Must / Pilot | /staff/ai/prompts | 10 |
| Shell-01 | Student Home Dashboard | Must / Pilot | /home | 6 |
| Shell-02 | Parent Home Dashboard | Must / Pilot | /parent | 4 |
| Shell-03 | Global Navigation / App Shell | Must / Pilot | (layout) | 3 |
| Shell-04 | Login / Forgot Password / Auth | Must / Pilot | /login | 8 |
| Shell-06 | Account & Profile Settings | Must / Pilot | /settings | 9 |
| Shell-07 | Empty / Loading / Error States | Must / Pilot | (components) | 0 |
| Shell-09 | Web Login, Reset & Staff MFA | Must / Pilot | /staff/login | 7 |
| Shell-10 | Legal Pages & Cookie Consent | Must / Pilot | /legal/[slug] | 3 |

## W2 — Pilot completion (indicative 6–8 weeks)

**Scope**

- Billing (C-*): Stripe trial/checkout, manage/cancel, dunning, invoices; entitlements
- Parent dashboards & controls (H-01, H-09, H-10 API), weekly report job, notifications basics
- Tutor backend (TUT-*), safety layers (P-SF-*), scripted responses, DSL consoles (L-04, Q-05); voice tutor (J-01, J-06) with consent; G-02..G-04
- Privacy: settings (L-03), deletion/export (L-02), legal pages & cookies (Shell-10)
- Schools (O-*): classes, assignments, insights, onboarding (CSV, SSO), DPA & invoices, KCSIE
- Support console (P-03), audit viewer (P-04), staff vetting (uCheck), AI cost (Q-04)

**Gate: end-to-end pilot scenario for consumers and one pilot school; safeguarding drill; boundary attestation 14 days clean; pen test scheduled/passed.**

**Screens in this wave (28)**

| ID | Screen | Priority / Phase | Route | Endpoints |
|---|---|---|---|---|
| C-02 | Plan Subject Selector | Must / Pilot | /parent/plan/subjects | 3 |
| C-03 | Free Trial Sign-Up / Card Capture | Must / Pilot | /parent/checkout | 4 |
| C-08 | Manage Subscription & Cancel | Must / Pilot | /parent/billing | 6 |
| C-09 | Payment Failed / Dunning | Must / Pilot | /parent/billing/payment-failed | 3 |
| C-10 | Billing History & Family Billing | Should / Pilot | /parent/billing/history | 3 |
| G-02 | Confidence Check Prompt | Should / Pilot | (overlay) | 2 |
| G-03 | Hint / Switch-Topic Nudge | Must / Pilot | (overlay) | 3 |
| G-04 | Frustration-Aware Tutor Response | Should / Pilot | (overlay) | 2 |
| H-01 | Parent Progress Dashboard | Must / Pilot | /parent/children/[id] | 6 |
| H-09 | Parent Controls & AI Transcripts | Must / Pilot | /parent/children/[id]/controls | 7 |
| H-10 | Parent Home (mobile) | Must / Pilot | (mobile) Parent Home | 3 |
| J-01 | Voice Tutor Conversation | Must / Pilot | /voice/[voiceSessionId] | 7 |
| J-06 | Voice Consent & Error States | Must / Pilot | /voice/consent | 4 |
| L-01 | Under-13 Parental Consent Flow | Must / Pilot | /parent/children/[id]/consent | 5 |
| L-03 | Privacy / Data Settings (High-Privacy Defaults) | Must / Pilot | /parent/children/[id]/privacy | 3 |
| L-04 | Safeguarding Disclosure — Internal Ops View | Must / Pilot | /staff/safeguarding | 9 |
| L-05 | Age Assurance | Must / Pilot | /age-check | 3 |
| O-01 | Teacher Class Management | Must / Pilot | /school/classes | 9 |
| O-02 | School Admin Class Dashboard | Must / Pilot | /school/dashboard | 3 |
| O-03 | KCSIE Compliance Confirmation | Must / Pilot | /school/kcsie | 3 |
| O-04 | Teacher Homework / Assignment Builder | Must / Pilot | /school/classes/[classId]/assignments/new | 6 |
| O-05 | Class Misconception Heatmap & Pupil Drill-Down | Must / Pilot | /school/classes/[classId]/insights | 3 |
| O-06 | School Onboarding — Rostering & SSO | Must / Pilot | /school/onboarding | 8 |
| O-07 | School DPA & Invoice Billing | Must / Pilot | /school/billing | 7 |
| P-03 | Support Admin Console | Must / Pilot | /staff/support | 10 |
| P-04 | Audit Log | Must / Pilot | /staff/audit | 5 |
| Q-04 | AI Cost & Usage | Should / Pilot | /staff/ai/cost | 2 |
| Q-05 | AI Safety Flags Queue | Must / Pilot | /staff/safety | 5 |

## W3 — Phase 2 (indicative as prioritised)

**Scope**

- Mocks (D-02/03/11), multi-version drill (D-05), custom quizzes (D-07), daily goals (D-08), re-explain & Socratic chat UI (F-06/F-07), self-mark (F-03), surprise quizzes (G-01)
- Revision content (I-*), predicted grade & misconception views (H-02/04/08), plan reveal (B-07), student standalone signup (B-03), pricing/compare/upgrade (C-01/04/05)
- A-Level go-live: provisional marking + review workbench (F-05/F-09) after reviewer vetting (P-1)
- Support: help centre, live chat (P-01/02); notifications centre (Shell-05); in-app search (Shell-08); marking-flag dashboard (M-03); marketing Phase 2 pages

**Gate: per-feature acceptance from screen specs; A-Level review SLA drill.**

**Screens in this wave (37)**

| ID | Screen | Priority / Phase | Route | Endpoints |
|---|---|---|---|---|
| A-04 | Live Sample Question (Try Before Signup) | Should / Phase 2 | /try | 2 |
| A-06 | Trust & Outcomes Page | Should / Phase 2 | /results | 2 |
| A-07 | Case Studies / Testimonials Page | Could / Phase 2 | /case-studies | 1 |
| A-09 | "Which Plan Is Right for Us" Quiz | Should / Phase 2 | /plan-quiz | 2 |
| B-03 | Student Standalone Sign-Up | Should / Phase 2 | /student/signup | 5 |
| B-07 | Personalised Weekly Plan Reveal | Should / Phase 2 | /onboarding/plan | 3 |
| C-01 | Pricing Page | Must / Phase 2 | /pricing | 3 |
| C-04 | Plan Comparison (What's Included) | Must / Phase 2 | /pricing/compare | 1 |
| C-05 | Upgrade / Downgrade / Change Subjects | Should / Phase 2 | /parent/billing/change | 4 |
| D-02 | Mock Paper Setup | Should / Phase 2 | /mock/new | 3 |
| D-03 | Mock Paper Sitting (Timed, Exam-Authentic Layout) | Should / Phase 2 | /mock/[mockId]/sit | 6 |
| D-05 | Multi-Version Drill Request | Should / Phase 2 | /practice/multi-version | 2 |
| D-06 | Photograph Completed Paper → Instant Score | Should / Phase 2 | /practice/photo | 3 |
| D-07 | Custom Mixed-Topic Quiz Builder | Could / Phase 2 | /practice/custom | 4 |
| D-08 | Daily Micro-Goal Widget (Home Dashboard Tile) | Should / Phase 2 | /home (widget) | 3 |
| D-09 | Wrong-Answers-Only Redrill Mode | Should / Phase 2 | /practice/redrill | 2 |
| F-03 | Self-Mark Mode | Could / Phase 2 | /practice/[sessionId]/self-mark | 3 |
| F-05 | A-Level Review Workbench | Must / Phase 2 (A-Level go-live) | /staff/review | 7 |
| F-06 | Re-Explain Concept (Diagram / Worked Example) | Should / Phase 2 | /tutor/reexplain/[questionId] | 2 |
| F-07 | Socratic Explain-Back Chat | Should / Phase 2 | /tutor/[tutorSessionId] | 6 |
| F-09 | A-Level Provisional Mark / In Review | Must / Phase 2 (A-Level go-live) | /practice/[sessionId]/provisional/[responseId] | 3 |
| G-01 | Surprise Micro-Quiz Pop-Up | Should / Phase 2 | (overlay) | 3 |
| H-02 | Misconception Detail View | Should / Phase 2 | /parent/children/[id]/misconceptions | 2 |
| H-03 | Weekly AI Narrative Report | Should / Phase 2 | /parent/children/[id]/reports/[reportId] | 3 |
| H-04 | Predicted Grade Band | Could / Phase 2 | /parent/children/[id]/predicted | 1 |
| H-08 | Printable Action-Plan Checklist | Could / Phase 2 | /parent/children/[id]/action-plan/print | 1 |
| I-01 | Flashcard Study Mode | Should / Phase 2 | /revise/decks/[deckId] | 4 |
| I-02 | Custom Flashcard Builder | Could / Phase 2 | /revise/decks/new | 2 |
| I-03 | Revision Notes Reader | Should / Phase 2 | /revise/notes/[topicId] | 1 |
| I-04 | One-Page Cheat Sheet | Could / Phase 2 | /revise/cheat-sheet/[topicId] | 2 |
| I-05 | 2-Minute Knowledge-Check Quiz | Should / Phase 2 | /revise/check/[topicId] | 3 |
| L-02 | Data Deletion Request | Must / Phase 2 | /parent/children/[id]/privacy/delete | 5 |
| M-03 | Marking-Flag Systemic Issue Dashboard | Should / Phase 2 | /staff/marking/systemic | 2 |
| P-01 | Help Centre / FAQ Search | Should / Phase 2 | /help | 3 |
| P-02 | Live Chat Widget | Could / Phase 2 | (widget) | 2 |
| Shell-05 | Notifications Centre | Should / Phase 2 | /notifications | 6 |
| Shell-08 | In-App Search | Should / Phase 2 | /search | 1 |

## W4 — Phase 3 & flag-offs (indicative as prioritised)

**Scope**

- 11+ entrance test (D-04), target-grade drill (D-10), photo-of-stuck (F-08), verbal discussion (J-02), accessibility panel/extra time/simplified (J-03/04/05), knowledge map & benchmark (H-06/07), sharing (I-06), micro-subscription/referral (C-06/07), free resource library (A-10), parent goal opt-in (K-02)
- K-01 gamification and N-01..03 marketplace remain **flag-off / not built** unless the client reopens

**Gate: per-feature acceptance.**

**Screens in this wave (16)**

| ID | Screen | Priority / Phase | Route | Endpoints |
|---|---|---|---|---|
| A-10 | Free Resource Library | Could / Phase 3 | /library | 1 |
| B-09 | Accessibility Preferences (Onboarding) | Should / Phase 3 | /onboarding/accessibility | 2 |
| C-06 | Micro-Subscription Purchase | Could / Phase 3 | /parent/billing/micro | 2 |
| C-07 | Referral Page | Could / Phase 3 | /parent/referral | 2 |
| D-04 | 11+ Adaptive Entrance Test (No Skip/Back) | Could / Phase 3 | /entrance/[runId] | 4 |
| D-10 | Target-Grade Adaptive Drill ("Keep Going Till Consistent") | Should / Phase 3 | /practice/keep-going | 3 |
| F-08 | Photo-of-Stuck-Question Walkthrough | Could / Phase 3 | /tutor/photo | 2 |
| H-05 | Early-Warning Drift Alert | Should / Phase 3 | /parent/children/[id]/alerts | 2 |
| H-06 | Student Knowledge Map / Skill Tree | Could / Phase 3 | /student/map | 3 |
| H-07 | Anonymised Cohort Benchmark | Could / Phase 3 | /student/benchmark | 1 |
| I-06 | Share Deck / Quiz Set | Could / Phase 3 | /revise/share | 3 |
| J-02 | Verbal Discussion Mode (English Lang/Lit) | Could / Phase 3 | /voice/discussion | 3 |
| J-03 | Accessibility Settings Panel | Should / Phase 3 | /settings/accessibility | 2 |
| J-04 | Extended-Time Exam Simulation | Could / Phase 3 | /mock/[mockId]/sit (extra time) | 2 |
| J-05 | Simplified-Language Toggle | Could / Phase 3 | (toggle) | 2 |
| K-02 | Daily Micro-Goal Opt-In Toggle | Should / Phase 3 | /parent/children/[id]/controls#goals | 2 |

## Deferred / flag-off

| ID | Screen | Status |
|---|---|---|
| K-01 | Badges & Streaks (Mastery-Based) | Won't (MVP) / Phase 2 |
| N-01 | Tutor Browse & Book | Won't (yet) / Deferred |
| N-02 | Tutor Profile & Availability Editor | Won't (yet) / Deferred |
| N-03 | Tutor's View of Student Mastery Data | Won't (yet) / Deferred |

## Cross-wave rules
- Every wave delivers **vertical slices** (DB→API→UI→tests) per screen; no screen is “done” with mocked data.
- Update `docs/traceability/traceability_matrix.csv` status per screen in the PR.
- Prompts go live only via the eval gate; until gold data exists (P-2) run with QC/consistency metrics and mark accuracy claims “unvalidated”.
- Each wave ends with a demo script, a regression run and an updated `docs/CURSOR_UNDERSTANDING.md` (living doc).
