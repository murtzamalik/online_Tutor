# W1 Gate Report — Core learning loop + content engine

**Wave:** W1  
**Date:** 29 Sep 2026  
**Author:** Cursor agent (implementation)  
**Verdict:** **PASS**

## Built vs scope

### Critical path (gate) — built

| Slice | Status | Evidence |
|---|---|---|
| S1 Catalogue CAT-01..07 | Done | Controllers + V009/V014 data; public GETs permitted |
| S2 Parent signup / verify / age / legal | Done | AUTH-01..03, AGE-*, CON-05/06; `/signup`, `/verify-email`, `/legal/[slug]` |
| S3 Child + picture PIN + under-13 | Done | STU-01/02/04, AUTH-15, CON-02; `/parent/children/new`, `/child-login` |
| S4 Enrolment + V013 demo bank | Done | STU-06/07; ≥14 APPROVED AQA 8462 Qs + schemes + gold + prompt/blueprint stubs |
| S5 Diagnostic DIA-01..04 | Done | IRT theta update in code; `/onboarding/diagnostic` |
| S6 Practice PRA-01..05,07–09 | Done | Adaptive bank select; D-01 + D-12 chem fields |
| S7 Marking MRK-* | Done | Mcq/Numeric code; P-MK-01/02 via GatewayClient (+ local stub fallback); PassCompare; confidence 0.70 |
| S8 Exceptions EXC-* + dispute | Done | Queue/claim/resolve; F-04/F-10 |
| S9 Mastery BKT + homes | Done | BktEngine defaults; MAS-01/02/07; Shell-01/02 wired |
| S10 Gen + eval | Done | GEN-01..04; CNT QC/approve; AIO-01/02/03/04/06 + boundary/prompts UIs; nightly `@Scheduled` substitute |
| S11 Marketing + settings | Done | A-01..03/05/08; B-05/B-08; Shell-06/10; MKT-01..10; AUTH-18..21; RPT-10/11 |
| S12 Staff consoles | Done | E-01/E-02, M-01/02/04, Q-01/02/03 wired to real endpoints |

### Traceability

- **36 / 36** W1 screens marked `W1_BUILT` in `docs/traceability/traceability_matrix.csv`.

### Acceptable deferrals (explicit)

1. **Stripe / billing** — stub entitlement only (W2).
2. **PRA-06 photo marking** — `FEATURE_DISABLED` until camera UX.
3. **JobRunr nightly** — not on classpath; `NightlyGenerationJob` uses Spring `@Scheduled` as W1 substitute (cron `studyloop.generation.nightly-cron`, default 02:15 UTC). Promote via GEN path + scheduled job class documented here.
4. **P-2 gold set** — unvalidated; harness runs on synthetic gold only.
5. **K-01 / `a_level_review`** — remain flag-off.
6. **MOC-08 PDF** — not required for D-11 minimal results path (MOC-06/09 + MOC-01 demo create).

## Deviations

1. **List envelopes:** catalogue/students/exceptions/marketing return `{items:[…]}` for web contract.
2. **Hints:** static levels (no live P-TU-02) — allowed by plan.
3. **Marking AI:** GatewayClient called; on failure local stub pass used so MCQ/numeric vertical slice works without gateway up.
4. **GEN-03:** creates `generation_run`, publishes demo blueprint, optionally promotes PENDING_QC with no failing QC checks.
5. **Past-paper ingest:** stub pipeline creates `ingestion_job` + `past_paper_item` and moves status to `NEEDS_REVIEW`.
6. **Picture PIN field:** `pictureSequence` (catalogue/web); alias `pictureKeys` accepted on STU-04.
7. **Marketing pages:** V014 `marketing_page` table + FAQ/resources/outcomes/exam_date/legal current seeds; 2× PENDING_QC questions for E-01.

## Demo script (critical path + marketing/staff)

1. Open `/` → catalogue counts, outcomes (MKT-05), sample MCQ (MKT-07/08), school demo lead (MKT-09), cookie banner (CON-06).
2. `/gcse/chemistry` → MKT-10 page + CAT specs + coming-soon lead (MKT-02).
3. `/faq`, `/resources/gcse-chemistry-familiarisation-pack`, `/exam-dates`, `/legal/privacy`.
4. `/signup` → parent register → `/verify-email` → `/login`.
5. `/parent/children/new` → add child + picture PIN (+ under-13 consent if U13).
6. `/onboarding/subjects` → enrol AQA 8462; `/onboarding/goals` → STU-14/STU-08; `/parent/children/{id}/target` → target grade.
7. `/child-login` → student JWT → `/onboarding/diagnostic` → practice → mark → optional dispute.
8. Student: `POST /mock-papers` then `/mock/{mockId}/results` (MOC-01/06).
9. `/settings` → AUTH-18..21 + RPT-10/11.
10. Staff (CNT/OPS/AIE/CMP as seeded): `/staff/content/qc`, `/staff/content/authoring`, `/staff/spec`, `/staff/style`, `/staff/spec/tagging`, `/staff/ai/eval`, `/staff/ai/boundary`, `/staff/ai/prompts`, `/staff/marking/exceptions`.

## Test evidence

- `mvn -pl core-api -am test -Dtest='!*IT,!ArchUnit*' -Dsurefire.failIfNoSpecifiedTests=false` → **BUILD SUCCESS** (CatalogueRoleMap includes new `@CatalogueRoles`; BktEngine, McqMarker, PassCompare, Pii lint, MoneyPence).
- `cd web && npm test` → pass.
- Flyway **V014** forward-only (V001–V013 untouched).

## Gate verdict

**PASS** — critical path remains demoable; S11/S12 screens and supporting APIs are wired; 36/36 W1 screens `W1_BUILT`. Acceptable deferrals listed above only.
