# QA Browser Smoke Report — Study Loop

**URL:** http://localhost:8080  
**Run date:** 2026-09-30  
**Stack:** Caddy (HTTP proxy) → Next.js frontend, Spring Boot core-api, Mailpit (localhost:8025)  
**QA account:** qa.e2e.1790758651@studyloop.local  
**Staff account:** reviewer@studyloop.local  
**Tool:** cursor-ide-browser MCP (Chromium)

---

## 1. Stack Health

| Check | Result | Detail |
|-------|--------|--------|
| Caddy / frontend | ✅ PASS | `GET /` → HTTP 200, `Via: 1.1 Caddy`, `X-Powered-By: Next.js` |
| Backend API | ✅ PASS | `POST /api/v1/auth/login` → HTTP 200 with `accessToken` |
| Mailpit | ✅ PASS | `GET http://localhost:8025/api/v1/messages` → 200, messages visible |

---

## 2. Auth Flow

### 2.1 Parent Registration → Email Verification → Login

| Step | API / UI | HTTP | Result | Notes |
|------|----------|------|--------|-------|
| Register | `POST /api/v1/auth/register-parent` | 201 | ✅ PASS | Body empty (expected) |
| Mailpit verification code | `GET /api/v1/messages` | 200 | ✅ PASS | Code received in < 2 s |
| Verify email | `POST /api/v1/auth/verify-email` | 200 | ✅ PASS | Empty body (expected per BUG-VERIFY-001 fix) |
| API login | `POST /api/v1/auth/login` | 200 | ✅ PASS | Returns `accessToken`, `refreshToken`, `tokenType`, `expiresInSeconds`, `mfaRequired:false` |
| Browser login → redirect | `/login` form submit | UI | ✅ PASS | Credentials accepted; browser redirected to `/home`; "Hello, QA E2E" displayed |

### 2.2 Staff Login

| Step | Detail | Result | Notes |
|------|--------|--------|-------|
| `GET /staff/login` | Renders "Staff login" form, "Two-step verification is required" copy | ✅ PASS | — |
| Staff login submit | reviewer@studyloop.local / ReviewerDemo!23 | ✅ PASS | Redirected to `/home`; "Hello, Demo A-Level Reviewer" displayed |

---

## 3. Public & Authenticated Route Smoke Test

> All routes return **HTTP 200** from Caddy (verified via curl with follow-redirects).  
> UI column records the actual rendered content observed in the browser.

| Route | HTTP | UI Result | PASS / FAIL | Notes |
|-------|------|-----------|-------------|-------|
| `/` | 200 | Homepage with hero, "Start free as a parent", "Log in", school demo form, cookie banner | ✅ PASS | Cookie consent visible and dismissable |
| `/pricing` | 200 | Page title renders but **content area shows raw JSON** (pricing array) instead of formatted UI | ❌ FAIL | Note reads "Placeholder prices until client confirms." — JSON dump not a user-facing UI |
| `/pricing/compare` | 200 | Page title "Plan comparison" renders but **content area shows raw JSON** (matrixJson) | ❌ FAIL | Same raw-dump pattern as `/pricing` |
| `/faq` | 200 | FAQ renders correctly with H2 Q&A sections for Marking, Boards, Cost, Parents | ✅ PASS | — |
| `/library` | 200 | "Free resource library" with filter dropdown; library items load (lead magnets, guides) | ✅ PASS | Some items marked "Email-gated" as expected |
| `/try` | 200 | Page title "Try a sample question" renders but **content area shows raw JSON** (sample question data) | ❌ FAIL | "Mark option A" button visible but question body is JSON not rendered MCQ UI |
| `/plan-quiz` | 200 | Form renders ("Which plan is right for us?", "Get recommendation" button) but **pricing JSON block visible below** | ❌ FAIL | Raw pricing API JSON rendered inside quiz page |
| `/case-studies` | 200 | "Case studies" title renders but **content area shows raw JSON** (case study items) | ❌ FAIL | Note reads "Wired to live API." — JSON dump instead of formatted case study cards |
| `/signup` | 200 | "Create a parent account" form renders correctly (name, email, password, terms, Sign up button) | ✅ PASS | — |
| `/login` | 200 | "Log in" form renders correctly (email, password, Continue, Forgot password, child/staff links) | ✅ PASS | — |
| `/verify-email` | 200 | "Verify your email" form renders correctly (email, code, Verify button) | ✅ PASS | — |
| `/child-login` | 200 | "Child login" renders with handle input, 12-image picture-PIN grid, Continue, Parent login link | ✅ PASS | — |
| `/staff/login` | 200 | "Staff login" form renders correctly with MFA note | ✅ PASS | — |
| `/student/signup` | 200 | Form renders (email, password, name, age, checkboxes) but **JSON debug block visible below form** (`{"form":"ready","note":"Under-13 must use parent signup"}`) | ❌ FAIL | Debug JSON not stripped from production-facing build |
| `/parent` | 200 | "Your children" renders with "No children yet" empty state and "Add child" button | ✅ PASS | Requires parent auth — correctly accessible |
| `/parent/children/new` | 200 | "Add a child" form renders correctly (display name, year group, birth month, picture PIN grid) | ✅ PASS | — |
| `/parent/billing` | 200 | "Manage subscription" page renders but shows **"Something went wrong — Could not load subscription"** | ❌ FAIL | Likely FINDING-STORAGE-001: login stores token in `sessionStorage` but billing.ts reads `localStorage` |
| `/parent/checkout` | 200 | "Start free trial" renders with Stripe disclaimer and "Start trial" button | ✅ PASS | — |
| `/home` | 200 | Authenticated home renders "Hello, QA E2E" / "Hello, Demo A-Level Reviewer" with nav + CTA cards | ✅ PASS | Confirmed as login redirect target |
| `/search` | 200 | Renders "Something went wrong — Student access required" when logged in as parent | ❌ FAIL | Role gate fires for parent — no fallback/redirect for non-student roles |
| `/notifications` | 200 | "Notifications centre" renders but **shows raw JSON** (`{"items":[]}`) instead of empty-state UI | ❌ FAIL | Same JSON-dump pattern as content pages |
| `/help` | 200 | "Help centre" renders but shows **"Something went wrong — Forbidden"** | ❌ FAIL | 403 from API; no fallback UI for parent role |
| `/settings` | 200 | Settings page renders correctly: email, Profile section with display name, Password change form | ✅ PASS | — |
| `/age-check` | 200 | "Age assurance" renders with "Outcome: PENDING" and "Complete self-declared check" button | ✅ PASS | — |
| `/results` | 200 | "Trust & outcomes" renders but **shows raw JSON** (outcomes array with stat data) | ❌ FAIL | Note reads "Wired to live API." — JSON dump instead of rendered stats |
| `/exam-dates` | 200 | "Exam dates" renders correctly with region dropdown and illustrative GCSE Chemistry exam dates | ✅ PASS | — |

---

## 4. Staff Routes (reviewer@studyloop.local)

| Route | HTTP | UI Result | PASS / FAIL | Notes |
|-------|------|-----------|-------------|-------|
| `/staff/review` | 200 | "A-Level review workbench" title renders but shows **"Something went wrong — An unexpected error occurred"** | ❌ FAIL | Generic error — reviewer may lack API-level REVIEWER claim for this workbench endpoint |
| `/staff/content/qc` | 200 | "QC exceptions" title renders; shows **"Something went wrong — Content admin required"** | ❌ FAIL | Expected role restriction — reviewer does not have CONTENT_ADMIN role; error message is descriptive |
| `/staff/support` | 200 | "Support console" renders correctly with email/name search input and Search button | ✅ PASS | reviewer role has SUPPORT_AGENT access |
| `/staff/safety` | 200 | "AI safety flags" title renders but shows **"Something went wrong — Could not load"** | ❌ FAIL | Generic error — reviewer lacks required SAFETY role; error message is unhelpfully generic |
| `/staff/audit` | 200 | "Audit log" title renders but shows **"Something went wrong — Could not load"** | ❌ FAIL | Generic error — reviewer lacks AUDIT_ADMIN role; error message is unhelpfully generic |

---

## 5. Summary

### Pass / Fail Counts

| Verdict | Count |
|---------|-------|
| ✅ PASS | 15 |
| ❌ FAIL | 16 |

### PASS Routes

`/`, `/faq`, `/library`, `/signup`, `/login`, `/verify-email`, `/child-login`, `/staff/login`, `/parent`, `/parent/children/new`, `/parent/checkout`, `/home`, `/settings`, `/age-check`, `/exam-dates`, `/staff/support`

### FAIL Routes (All)

```
/pricing            — Raw JSON dump (pricing array) instead of formatted pricing UI
/pricing/compare    — Raw JSON dump (matrixJson) instead of plan comparison table
/try                — Raw JSON dump (sample question) instead of rendered MCQ component
/plan-quiz          — Raw pricing JSON block rendered below quiz form
/case-studies       — Raw JSON dump (case study items) instead of cards
/student/signup     — Debug JSON block visible below signup form
/notifications      — Raw JSON dump ({"items":[]}) instead of empty-state UI
/results            — Raw JSON dump (outcomes array) instead of rendered stats component
/parent/billing     — "Could not load subscription" (sessionStorage vs localStorage mismatch)
/search             — "Student access required" for parent role; no graceful fallback or redirect
/help               — "Forbidden" for parent role; no fallback UI
/staff/review       — "An unexpected error occurred" (generic; reviewer role insufficient)
/staff/content/qc   — "Content admin required" (reviewer lacks CONTENT_ADMIN role)
/staff/safety       — "Could not load" (reviewer lacks SAFETY role — generic error)
/staff/audit        — "Could not load" (reviewer lacks AUDIT_ADMIN role — generic error)
```

---

## 6. Bug Findings

### BUG-UI-JSON-001 (P1) — Multiple pages render raw API JSON instead of UI components

**Affected routes:** `/pricing`, `/pricing/compare`, `/try`, `/plan-quiz`, `/case-studies`, `/notifications`, `/results`, `/student/signup`  
**Symptom:** Pages contain a visible code/pre block rendering raw API JSON, e.g. `{"pricing": [...]}`, `{"sample": {...}}`, `{"items": []}`.  
**Context:** Several pages include developer notes such as "Placeholder prices until client confirms.", "Wired to live API.", "Anonymous sample — no account required." — indicating pages are in a stub/skeleton state where the API JSON response is passed directly to the view rather than consumed by a proper UI component.  
**Impact:** P1 for `/try` (public conversion) and `/pricing` (sales-critical); P1 for `/notifications` (authenticated feature); P2 for `/results`, `/case-studies`, `/plan-quiz`.

### BUG-UI-BILLING-001 (P2) — `/parent/billing` fails with "Could not load subscription"

**Symptom:** Authenticated parent navigates to `/parent/billing`; error state renders.  
**Root cause (likely):** FINDING-STORAGE-001 documented in `report-auth-wiring-bugs.md` — `billing.ts:4` reads token from `localStorage` but login stores tokens in `sessionStorage`.  
**Workaround:** None visible to user.

### BUG-UI-SEARCH-ROLE-001 (P3) — `/search` shows "Student access required" with no fallback for parents

**Symptom:** Authenticated parent navigating to `/search` sees an error state; no redirect to parent search or alternative page.  
**Expected:** Redirect to a parent-appropriate search, or hide the route from parent-role navigation.

### BUG-UI-HELP-403-001 (P3) — `/help` returns "Forbidden" for parent role

**Symptom:** Authenticated parent navigates to `/help`; "Something went wrong — Forbidden" is displayed.  
**Expected:** Help centre should be accessible to all authenticated users, or unauthenticated/unauthorized users should be redirected gracefully.

### BUG-STAFF-REVIEW-001 (P2) — `/staff/review` shows generic error for reviewer account

**Symptom:** reviewer@studyloop.local logs in via `/staff/login`, navigates to `/staff/review`, sees generic "An unexpected error occurred".  
**Expected:** Either reviewer role should have access to the A-Level review workbench, or the page should display a clear "Insufficient permissions — REVIEWER role required" message.

### BUG-STAFF-SAFETY-AUDIT-GENERIC-001 (P3) — `/staff/safety` and `/staff/audit` show unhelpful "Could not load"

**Symptom:** Same reviewer account; both pages fail with "Could not load" — indistinguishable from network errors.  
**Expected:** Clear "insufficient permissions" message citing the required role (e.g. SAFETY_REVIEWER, AUDIT_ADMIN).

---

## 7. Auth Flow Notes

| Flow | Result |
|------|--------|
| `POST /api/v1/auth/register-parent` | HTTP 201, empty body — registration succeeds |
| Mailpit verification email delivery | < 2 s latency, 6-digit code visible in message snippet |
| `POST /api/v1/auth/verify-email` | HTTP 200, empty body — verification succeeds |
| `POST /api/v1/auth/login` | HTTP 200, full token set returned |
| Browser login `/login` → `/home` redirect | End-to-end pass; "Hello, {displayName}" shows correct name |
| Browser staff login `/staff/login` → `/home` | End-to-end pass; "Hello, Demo A-Level Reviewer" displayed |
| Token storage note | Login stores tokens in `sessionStorage`; `billing.ts` reads `localStorage` → `/parent/billing` broken (FINDING-STORAGE-001, open) |

---

## 8. Overall Verdict

> **DO NOT SHIP** — 16 FAIL routes out of 31 tested.  
> Critical P1 failures exist on public conversion paths (`/pricing`, `/try`) and authenticated features (`/notifications`, `/parent/billing`).  
> Multiple pages render raw API JSON where UI components should appear — systematic stub-state issue.  
> Core auth flows (register, verify email, parent login, staff login) work correctly end-to-end.
