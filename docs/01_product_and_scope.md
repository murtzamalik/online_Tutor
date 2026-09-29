# 01 · Product & Scope

**Product:** UK exam-preparation platform (placeholder brand "Study Loop", open item P-8). Client: Arshad Ashraf. Delivery: Karsaaz Solutions (Murtaza Malik).
**One-line:** an AI tutor + adaptive practice + instant exam-style marking for 11+, GCSE, iGCSE and A-Level students, with parents in the loop and a schools (B2B) channel launched in parallel.

## Users & roles
| Role | Who | Primary surfaces |
|---|---|---|
| Visitor | prospective parent/student | Marketing site (A-*) |
| Parent (PAR) | pays, sets goals, consents, monitors | B-*, C-*, H-*, L-*, Shell |
| Student (STU) | 11+ child (picture PIN), 13+ standalone (email) | D-*, F-*, G-*, I-*, J-*, Shell |
| Teacher (TCH) / School admin (SADM) / School business manager (SBM) | schools channel | O-* |
| Staff: Content admin (CNT), A-Level reviewer (REV), Ops reviewer (OPS), Support (SUP), Compliance (CMP), AI engineer (AIE), Safeguarding lead (DSL), Owner (OWN) | internal | E-*, F-05, F-10, L-04, M-*, P-03/04, Q-* |

## Scope (baseline v1.0 LOCKED, 21 Sep 2026)
- **121 screens** in epics A–Q + Shell; **130 user stories**. Full lists: `docs/screens/`, `docs/traceability/`, supporting_docs.
- **Pilot content:** GCSE + iGCSE **Chemistry** across **7 board-tracks**: AQA 8462, Edexcel 1CH0, OCR Gateway A J248, Eduqas, WJEC (Wales), Edexcel Intl 4CH1, Cambridge 0620/0971. The *platform* is built subject-agnostic (catalogue-driven) so more subjects are data, not code.
- **In (MVP/pilot):** everything marked Pilot/Ongoing in the inventory, including schools (assignments, class insights, CSV/Wonde rostering, Google/Microsoft SSO, DPA, invoice billing), voice tutor (with separate consent), photo marking, A-Level flow (behind flag until reviewers are vetted).
- **Phase 2/3:** built after pilot per waves W3/W4 (see `18_implementation_plan_waves.md`).
- **Flag-off & specced only:** K-01 gamification (Phase 2 per client), N-01…N-03 tutor marketplace (Won't yet), cohort benchmark until n ≥ 50, 11+ entrance test (Phase 3), micro-subscriptions/referrals (Phase 3).
- **Standing rule D-14:** a requirement the client stated is never removed — only deferred/flagged.
- **Mobile:** native Swift/Kotlin, separate later phase. The API is mobile-ready from day 1; see `19_mobile_phase_spec.md`.

## Success criteria (pilot)
Marking accuracy ≥ 95% per marking point vs examiner-marked gold set, reported by board × question type (D-19); p95 GCSE marking latency < 8 s; zero personal-data egress to AI vendors (attested daily); DSL SLA met on flags; ≥ 12 approved bank items per spec-point cell.

## Non-goals (for now)
Tutor marketplace; AI-generated images; webcam/biometric affect sensing (decided out); third-party content scraping; own LLM hosting (gateway is model-agnostic so it can be added).
