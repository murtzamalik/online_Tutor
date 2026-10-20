# Study Loop — System QA Report

**Date:** 2026-09-30  
**Base URL:** `http://localhost:8080` (Caddy → web + core-api)  
**Stack:** Docker Compose `studyloop-*` (web, core-api, postgres, redis, mailpit, ai-gateway, minio, embedding)  
**Catalogue:** `docs/21_use_case_catalogue.md` (UC-01…UC-45)  
**Method:** curl/HTTP route probes (follow redirects), auth API E2E via Mailpit, authenticated parent + staff API matrix. **No production fixes applied.**  
**Browser smoke:** `docs/QA_BROWSER_SMOKE.md` **present** ([Browser E2E route smoke QA](7131d74d-4169-426e-aa91-4cbaf6cb666c)): auth E2E PASS; **15 PASS / 16 FAIL** interactive routes (HTTP shells often 200 while UI fails). Dominant FAIL pattern: pages dump raw API JSON instead of components.  
**Throwaway parent:** `qa.system.1790758732@studyloop.local` / `QaSystemTest!234`  
**Staff:** `reviewer@studyloop.local` / `ReviewerDemo!23` (role `REVIEWER` only; no other seeded staff logins found)

---

## Executive summary

Parent **register → Mailpit verify → login → `/me`** works end-to-end. Public marketing/catalog surfaces and **76/76** probed Next.js routes return **HTTP 200**. Parent home, child create, under-13 consent, enrolment (with `specificationId`), accessibility prefs, setup-intent, invoices (empty), referral, and notifications prefs are usable.

Critical gaps block the learning loop: **picture-PIN login 500** (`Map.of` NPE on null `locked_until`), **GET/POST billing subscription paths 500**, **data deletion/export 500** (JDBC `Instant` binding), **exam-dates SQL 500**, and most student learning APIs are unreachable without a working child session. Staff beyond A-Level review queue is **BLOCKED** — only the reviewer seed exists; other roles correctly 403. OIDC is **501**. Full practice/tutor/mock/revision/school flows remain **BLOCKED** or **PARTIAL** pending student/school credentials and billing entitlement.

| Status | Count (UC-01…45) |
|--------|------------------|
| PASS | 8 |
| PARTIAL | 18 |
| FAIL | 5 |
| BLOCKED | 12 |
| NOT_BUILT | 2 |
| **Total** | **45** |

---

## Probe inventory

### Frontend routes (curl `-L`, final status)

All probed routes returned **200** (no redirect failures). Sample coverage:

| Area | Examples | Final status |
|------|----------|--------------|
| Marketing | `/`, `/pricing`, `/faq`, `/try`, `/library`, `/gcse/maths`, `/a-level/physics` | 200 |
| Auth | `/login`, `/signup`, `/verify-email`, `/child-login`, `/staff/login`, `/student/signup` | 200 |
| Parent | `/parent`, `/parent/checkout`, `/parent/billing/*`, `/parent/children/new` | 200 |
| Student | `/home`, `/practice/*`, `/onboarding/*`, `/revise/*`, `/mock/new` | 200 |
| Staff | `/staff/review`, `/staff/content/*`, `/staff/ai/*`, `/staff/safeguarding` | 200 |
| School | `/school/dashboard`, `/school/onboarding`, `/school/billing` | 200 |
| Shell | `/search`, `/notifications`, `/help`, `/legal/*`, `/settings` | 200 |

`QA_ROUTE_SMOKE_RAW.txt` independently confirms 49 marketing/auth/parent/staff/school paths **200** with “Study Loop” title.

### Auth API E2E

| Step | Result | Evidence |
|------|--------|----------|
| `POST /api/v1/auth/register-parent` | **201** | `{accountId, status: PENDING_VERIFICATION}` |
| Mailpit `GET :8025/api/v1/messages` | code found | `741367` |
| `POST /api/v1/auth/verify-email` | **200** empty body | body_len=0 |
| `POST /api/v1/auth/login` | **200** | `accessToken`, `refreshToken`, `mfaRequired=false` |
| `GET /api/v1/me` (Bearer) | **200** | `kind=PARENT`, `status=ACTIVE`, roles=`[PARENT]` |
| `POST /api/v1/auth/refresh` | **200** | rotated tokens |
| Wrong password | **401** | `AUTH_INVALID_CREDENTIALS` |
| `POST /api/v1/auth/password/forgot` | **202** empty | OK |
| `GET /api/v1/auth/oidc/google/start` | **501** | `FEATURE_DISABLED` / OIDC deferred |

### Authenticated parent APIs (sample)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /parents/home` | 200 | children list after create |
| `GET /catalog/qualifications\|subjects\|boards\|pricing\|plans/compare\|specifications` | 200 | seeded catalogue |
| `GET /catalog/exam-dates` | **500** | bad SQL grammar on `exam_date` |
| `POST /students` | **201** | U13 child; `requiresUnder13Consent` |
| `POST …/consents/under13` | 200 | clears consent gate |
| `POST …/enrolments` `{specificationId}` | **201** | enrolment created |
| `PATCH /enrolments/{id}` `{targetGrade,examDate}` | 200 | invalid `goalType` values → 500 check constraint |
| `GET/PUT …/accessibility` | 200 | prefs persisted |
| `GET/PUT …/ai-controls` | 200 | PUT body fields partially ignored |
| `POST …/consents/voice` + `googleProcessingAcknowledged` | 200 | |
| `GET /billing/invoices` | 200 | `items:[]` |
| `GET /billing/subscription` | **500** | NPE (no sub row) |
| `POST /billing/setup-intent` | 200 | fake Stripe setup intent |
| `POST /billing/subscriptions` | **500** | NPE missing item fields / create path |
| `POST /billing/subscription/cancel-preview` | **500** | |
| `GET /billing/dunning` | **500** | |
| `GET /billing/referral` + invite | 200 | |
| `POST /billing/micro-subscriptions` | **500** | NPE |
| `POST …/deletion-request` / data-export | **500** | `PSQLException` Instant binding |
| `GET /notifications`, `/notification-preferences` | 200 | |
| `PUT …/picture-pin` | 200 | returns `loginHandle` |
| `POST /auth/student/picture-pin` | **500** | `Map.of` NPE null `locked_until` |

### Staff (`REVIEWER`)

| Endpoint | Status | Notes |
|----------|--------|-------|
| Login + `/me` | 200 | roles=`[REVIEWER]`, `mfaRequired=false` |
| `GET /internal/reviews/queue` | 200 | `items:[]` |
| `GET /internal/reviews/sla` | **500** | Instant JDBC binding |
| QC / specs / style / generation / safety / support / audit / AI ops | **403** | correct RBAC; **no seeded CNT/OPS/DSL/SUP/CMP/AIE accounts** |

Other guessed demo emails (`content@`, `ops@`, …) → **401**.

---

## Use-case results (UC-01…UC-45)

Legend: **PASS** / **PARTIAL** / **FAIL** / **BLOCKED** / **NOT_BUILT**

### Visitor & onboarding

| UC | Status | Evidence |
|----|--------|----------|
| **UC-01** Explore & try | **PASS** | Routes `/`, `/pricing`, `/faq`, `/try`, `/gcse/*` 200. APIs: FAQ/resources/case-studies/outcomes/sample-question 200; sample answer 200; lead capture **201**; school demo **201**; plan-quiz 200. |
| **UC-02** Parent registers | **PASS** | Register 201 → Mailpit code → verify 200 → login 200 → `/me` ACTIVE. Age-assurance start 200 + complete with `{passed:true}` 200. |
| **UC-03** Add child | **PARTIAL** | Create child **201**; under-13 consent 200; picture-PIN **set** 200. **Child login broken** (UC-08). |
| **UC-04** Student standalone sign-up | **PARTIAL** | Works with `{ageYears:16}` or `{ageYears:14,parentAware:true}` → **201**. DOB-centric payloads always fail as under-13 (contract expects `ageYears`, not DOB). Screens `/student/signup` 200. |
| **UC-05** Choose subjects & goals | **PARTIAL** | Spec list 200; enrolment **201** with `specificationId`. Goals patch works for `targetGrade`/`examDate`; arbitrary `goalType` → **500** DB check. UI routes 200. |
| **UC-06** Baseline diagnostic | **BLOCKED** | `/onboarding/diagnostic` 200 shell only. `GET /diagnostics/current` **500** as parent; no working student JWT (picture-PIN fail). |
| **UC-07** Weekly plan | **BLOCKED** | `/onboarding/plan` 200 shell. `GET /plans/current` **500** without student session. |
| **UC-08** Child login | **FAIL** | `POST /auth/student/picture-pin` **500**; `AuthService.loginPicturePin` `Map.of(..., lockedUntil, null)` NPE when `locked_until` is null. |

### Subscription

| UC | Status | Evidence |
|----|--------|----------|
| **UC-09** Trial & checkout | **FAIL** | Setup-intent / payment-method setup **200** (fake Stripe). Plan-preview accepts `{planId}` but totals 0; create subscription **500** (NPE on item fields). GET subscription **500**. Checkout UI 200. |
| **UC-10** Manage/cancel/reactivate | **PARTIAL** | Cancel/reactivate return **404** “No subscription” (sensible). Cancel-preview **500**. Cannot exercise happy path without UC-09. |
| **UC-11** Payment failure | **FAIL** | `GET /billing/dunning` **500**; `/parent/billing/payment-failed` page 200 only. |
| **UC-12** Billing history & family | **PASS** | `GET /billing/invoices` **200** `items:[]`; history page 200. |
| **UC-13** Micro-sub / referral | **PARTIAL** | Feature flags `referrals`/`micro_subscriptions` true. Referral GET+invite **200**. Micro-sub POST **500**. |

### Learning

| UC | Status | Evidence |
|----|--------|----------|
| **UC-14** Practice | **BLOCKED** | Practice routes 200. `POST /practice/sessions` **403** “Student access required” as parent; child JWT unavailable. |
| **UC-15** Photo answer | **BLOCKED** | Flag `photo_marking=true`; `/practice/photo` 200; no student session to exercise OCR flow. |
| **UC-16** Mock paper | **BLOCKED** | Flag `mock_papers=true`; `/mock/new` 200; no entitled student session. |
| **UC-17** Multi-version / custom / redrill | **BLOCKED** | Routes 200; APIs student-gated. |
| **UC-18** 11+ entrance test | **NOT_BUILT** | Flag `entrance_test_11plus=true` but Phase-3 behaviour; `/entrance/[runId]` shell only; not exercised. |
| **UC-19** Dispute a mark | **BLOCKED** | Depends on practice marking result; unreachable. |
| **UC-20** A-Level answer review | **PARTIAL** | Reviewer login OK; `GET /internal/reviews/queue` **200**. SLA endpoint **500** (Instant JDBC). End-to-end provisional→final not exercised (no queue items). |

### Tutor, voice, engagement

| UC | Status | Evidence |
|----|--------|----------|
| **UC-21** Ask the tutor | **BLOCKED** | Tutor routes 200; `POST /tutor/sessions` **403** student-only. |
| **UC-22** Voice tutor | **PARTIAL** | Voice consent API **200** with `googleProcessingAcknowledged`. `/voice/consent` 200. Live voice session not exercised. |
| **UC-23** Nudges & surprise quiz | **PARTIAL** | Flag `surprise_quiz=true`; `/surprise` 200; engagement APIs not fully exercised. |
| **UC-24** Revision | **BLOCKED** | Revision routes 200; `GET /revision/decks` **403** student-only. |
| **UC-25** Accessibility | **PASS** | `GET/PUT /students/{id}/accessibility` **200**; prefs stored as JSON; onboarding/settings pages 200. |

### Parent monitoring & privacy

| UC | Status | Evidence |
|----|--------|----------|
| **UC-26** Monitor progress | **PARTIAL** | Parent home 200 with children; weekly reports `[]`; alerts `[]`; action-plan stub **200**; predicted/misconceptions pages 200 shells without rich data. |
| **UC-27** Control AI/voice & transcripts | **PARTIAL** | AI controls GET/PUT 200; voice consent 200; transcripts `[]`. PUT did not flip `voiceEnabled` from body alone (consent path enables voice). |
| **UC-28** Consent & privacy | **PARTIAL** | Under-13, cookie consent, legal pages, consents list **OK**. Deletion request + data export **500** (`Instant` → Postgres). |

### Schools

| UC | Status | Evidence |
|----|--------|----------|
| **UC-29** School onboarding | **BLOCKED** | Pages 200; no school-admin account; Wonde flag `wonde_mis=false`. |
| **UC-30** Set homework | **BLOCKED** | Class/assignment APIs require school roles; no seed login. |
| **UC-31** Class insight | **BLOCKED** | Same. |
| **UC-32** School dashboard & billing | **BLOCKED** | Pages 200; APIs unauthenticated/unauthorized without school tenant. |

### Staff

| UC | Status | Evidence |
|----|--------|----------|
| **UC-33** QC exceptions | **BLOCKED** | Endpoints exist; reviewer → **403** “Content admin required”. No CNT seed. |
| **UC-34** Author & import papers | **BLOCKED** | Same (questions/past-papers **403**). |
| **UC-35** Spec/style management | **BLOCKED** | `/internal/specs`, `/internal/style-profiles` **403**. |
| **UC-36** Marking exceptions | **BLOCKED** | OPS required → **403**. |
| **UC-37** A-Level review | **PARTIAL** | Queue **200**; claim/confirm not exercised (empty); SLA **500**. |
| **UC-38** Safeguarding | **BLOCKED** | DSL endpoints **403**. |
| **UC-39** Support | **BLOCKED** | Support accounts **403**. |
| **UC-40** Audit & compliance | **BLOCKED** | Audit-log / verify-chain **403** CMP. |
| **UC-41** AI operations | **BLOCKED** | Eval/prompts/cost/routing **403** AIE/OWN. |

### Cross-cutting

| UC | Status | Evidence |
|----|--------|----------|
| **UC-42** Notifications | **PASS** | `GET /notifications` 200; preferences GET 200; `/notifications` page 200. |
| **UC-43** Search | **PARTIAL** | `/search` page 200; `GET /api/v1/search?q=` **403** student-required. |
| **UC-44** Auth & MFA | **PARTIAL** | Parent auth matrix PASS; forgot 202; refresh 200; OIDC **501**; staff MFA not enforced on reviewer demo; picture-PIN FAIL (UC-08). |
| **UC-45** Empty/error/offline/maintenance | **PARTIAL** | Empty lists return well-formed JSON; RFC7807 errors present. Dedicated maintenance/offline routes not distinct; many 500s leak as generic `INTERNAL_ERROR`. |

---

## Prioritized bugs (do not fix in this report)

### P0 — blocks core journeys

| ID | Title | Evidence |
|----|-------|----------|
| **BUG-PIN-001** | Picture-PIN login 500 | `POST /api/v1/auth/student/picture-pin` → 500. `AuthService.loginPicturePin` uses `Map.of` with nullable `locked_until` → NPE (`AuthService.java` ~572). Blocks UC-08 and all student-gated learning UCs. |
| **BUG-BILL-001** | Subscription create / read 500 | `POST /billing/subscriptions` NPE at `BillingService.createSubscription` (~178) when item map lacks expected keys; `GET /billing/subscription` NPE with no row. Blocks UC-09/10/11. |
| **BUG-ENROL-500** | Enrolment without `specificationId` → 500 | Missing key → NPE `req.get("specificationId").toString()` (`StudentService.java:173`) instead of 400 validation. |

### P1 — privacy / billing / catalogue / UI stub breakage

| ID | Title | Evidence |
|----|-------|----------|
| **BUG-PRIV-001** | Deletion request & data export 500 | `PSQLException: Can't infer SQL type … java.time.Instant` on deletion-request and data-export. UC-28 incomplete. |
| **BUG-BILL-002** | Dunning & cancel-preview 500 | `GET /billing/dunning`, `POST …/cancel-preview` → 500. UC-10/11. |
| **BUG-BILL-003** | Micro-subscription 500 | `POST /billing/micro-subscriptions` NPE. UC-13. |
| **BUG-CAT-001** | Exam dates endpoint 500 | `GET /catalog/exam-dates` BadSqlGrammarException on `exam_date` query. |
| **BUG-REV-001** | Reviewer SLA endpoint 500 | `GET /internal/reviews/sla` Instant JDBC binding failure. UC-37. |
| **BUG-UI-JSON-001** | Marketing/shell pages dump raw API JSON | Browser FAIL on `/pricing`, `/pricing/compare`, `/try`, `/plan-quiz`, `/case-studies`, `/notifications`, `/results`, `/student/signup` (debug JSON). See `QA_BROWSER_SMOKE.md`. |

### P2 — correctness / contract

| ID | Title | Evidence |
|----|-------|----------|
| **BUG-STU-REG-001** | Standalone signup ignores DOB | API requires `ageYears` (+ `parentAware` for 13–15). Sending `dateOfBirth` always yields under-13 error — silent contract mismatch vs catalogue B-03. |
| **BUG-GOAL-001** | Invalid `goalType` → 500 | `PATCH /enrolments/{id}` with `goalType=GRADE` etc. hits DB check constraint → 500 instead of 400. Valid path omits `goalType` and sets grade/date OK. |
| **BUG-AI-CTRL-001** | AI controls PUT ignores voice flag | PUT body `voiceEnabled` not reflected; voice enabled via consent endpoint only. |
| **BUG-FE-STORAGE-001** | Token storage mismatch (partially mitigated) | Login writes `sessionStorage`; billing/w2 were updated to prefer sessionStorage. `/parent/billing` still FAIL primarily from **BUG-BILL-001** NPE (“Could not load subscription”). |
| **BUG-UI-ROLE-001** | Parent hits student-only / help 403 with no fallback | Browser: `/search` “Student access required”; `/help` “Forbidden”. |
| **BUG-STAFF-REVIEW-UI-001** | `/staff/review` generic 500/error for reviewer | Browser FAIL despite REVIEWER seed; queue API 200 elsewhere — UI/endpoint mismatch. |
| **BUG-ACTUATOR-001** | `/actuator/health` served as Next HTML 200 | Health probe via Caddy hits web app, not Spring actuator. |

### P3 — gaps / deferred

| ID | Title | Evidence |
|----|-------|----------|
| **GAP-OIDC-001** | OIDC deferred | `GET /auth/oidc/{provider}/start` → **501** `FEATURE_DISABLED`. |
| **GAP-STAFF-SEED-001** | Only REVIEWER demo seeded | CNT/OPS/DSL/SUP/CMP/AIE/OWN logins 401 — staff UCs 33–36, 38–41 untestable. |
| **GAP-BROWSER-001** | ~~Browser smoke missing~~ **CLOSED** | `QA_BROWSER_SMOKE.md`: **15 PASS / 16 FAIL** interactive (auth PASS; JSON-dump + billing + role gates FAIL). |
| **GAP-SEARCH-001** | Search API student-only | Parent cannot use `/api/v1/search` (403). |

---

## Coverage notes & limitations

1. **Browser E2E complete** — see `QA_BROWSER_SMOKE.md` (15/16 interactive). HTTP 200 HTML shells alone overstate health.  
2. **Learning loop** (practice → mark → mastery → tutor) not executed — blocked by BUG-PIN-001.  
3. **Stripe** is stub/fake (`seti_fake_*`); SCA/card decline paths not real.  
4. **School & most staff** UCs blocked by missing seed accounts, not necessarily missing code.  
5. Controllers exist for nearly all catalogue surfaces; several marketing pages still stub-render JSON.  
6. Prior auth-wiring bugs (login Zod, verify empty body, refresh NPE) retested **PASS** on throwaway accounts.

---

## Recommended next QA actions (informational only)

1. Fix BUG-PIN-001, re-login as child, then run practice/diagnostic/plan smoke.  
2. Seed CNT/OPS/DSL/SUP/CMP/AIE demo users for staff matrix.  
3. Fix Instant JDBC binding (privacy + SLA) and exam-dates SQL.  
4. Browser smoke delivered — after P0/P1 fixes, re-run especially `/pricing`, `/try`, `/parent/billing`, picture-PIN → practice.  
5. Document OpenAPI field names for enrolment (`specificationId`) and student register (`ageYears`).

---

*Report generated from live Docker stack probes on 2026-09-30. Bugs listed only — no code changes made.*
