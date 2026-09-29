# W1 Gate Report — Core learning loop + content engine

**Wave:** W1  
**Date:** 29 Sep 2026  
**Author:** Cursor agent (implementation)  
**Verdict:** **PARTIAL** (critical path demoable; full 36-screen inventory not complete)

## Built vs scope

### Critical path (gate) — built

| Slice | Status | Evidence |
|---|---|---|
| S1 Catalogue CAT-01..07 | Done | Controllers + V009 data; public GETs permitted |
| S2 Parent signup / verify / age / legal | Done | AUTH-01..03, AGE-*, CON-05/06; `/signup`, `/verify-email` |
| S3 Child + picture PIN + under-13 | Done | STU-01/02/04, AUTH-15, CON-02; `/parent/children/new`, `/child-login` |
| S4 Enrolment + V013 demo bank | Done | STU-06/07; ≥14 APPROVED AQA 8462 Qs + schemes + gold + prompt/blueprint stubs |
| S5 Diagnostic DIA-01..04 | Done | IRT theta update in code; `/onboarding/diagnostic` |
| S6 Practice PRA-01..05,07–09 | Done | Adaptive bank select; D-01 + D-12 chem fields |
| S7 Marking MRK-* | Done | Mcq/Numeric code; P-MK-01/02 via GatewayClient (+ local stub fallback); PassCompare; confidence 0.70 |
| S8 Exceptions EXC-* + dispute | Done | Queue/claim/resolve; F-04/F-10 |
| S9 Mastery BKT + homes | Done | BktEngine defaults; MAS-01/02/07; Shell-01/02 wired |
| S10 Gen + eval minimal | Done | GEN-01/03 dry-run path; CNT-06; AIO-01/04/06 on synthetic gold |

### Deferred / partial (still in inventory)

- Marketing A-02/03/05/08 (only A-01 minimal)
- B-05 goals, B-08 target grade, Shell-06/09/10 polish
- D-11 mock depth, PRA-06 photo (`FEATURE_DISABLED` OK)
- Staff E-01/E-02, M-01/02/04, Q-01/02/03 UIs
- Stripe trial (stub entitlement used)
- K-01 / `a_level_review` remain flag-off

## Deviations

1. **List envelopes:** catalogue/students/exceptions return `{items:[…]}` for web contract (not bare arrays).
2. **Hints:** static levels (no live P-TU-02) — allowed by plan.
3. **Marking AI:** GatewayClient called; on failure local stub pass used so MCQ/numeric vertical slice works without gateway up.
4. **GEN-03:** creates `generation_run` and promotes seeded `BP-W1-DEMO-*` blueprint — dry-run / stub path, not full C1–C10 nightly JobRunr.
5. **Picture PIN field:** `pictureSequence` (catalogue/web); alias `pictureKeys` accepted on STU-04.

## Open questions

- Confirm under-13 lock semantics: W1 blocks enrolment until CON-02 rather than setting `student_profile.status=LOCKED`.
- Ops staff seed account for F-10 demo (OPS role + MFA).
- Whether JobRunr nightly should land before W1 sign-off or explicitly slip to W1.1.

## Demo script (critical path)

1. Open `/` → catalogue counts load (CAT).
2. `/signup` → parent register → `/verify-email` with Mailpit code → `/login`.
3. `/parent/children/new` → add child + picture PIN (+ under-13 consent if U13).
4. `/onboarding/subjects` → enrol AQA 8462.
5. `/child-login` with handle + sequence → student JWT.
6. `/onboarding/diagnostic` → answer items → theta/mastery seeded.
7. Start practice → answer MCQ/calc → mark &lt; 8s (objective path) → F-01 result → F-02 scheme → optional dispute.
8. Staff `/staff/marking/exceptions` with OPS token → claim/resolve.
9. Optional: GEN/AIO internal endpoints against seeded gold.

## Test evidence

- `mvn -pl common,core-api -am test -Dtest='!*IT,!ArchUnit*'` → **BUILD SUCCESS** (CatalogueRoleMap, BktEngine, McqMarker, PassCompare, Pii lint, MoneyPence).
- Flyway V013 forward-only (V001–V012 untouched).

## Gate verdict

**PARTIAL** — seeded student can complete signup → enrol Chemistry → diagnostic → practise → marked with exceptions routed; demo bank + eval harness present. Full 36-screen W1 and full nightly gen/QC UIs remain for wave-complete sign-off.

**Recommend:** architect can accept **PARTIAL** for critical-path progression to W2 billing, with explicit backlog for S11/S12 screens; or hold W2 until A-* / staff consoles land.
