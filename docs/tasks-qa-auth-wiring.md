# QA Tasks — Auth Wiring Audit

**Lead:** qa-lead

---

## QA TODO

- [x] QA-001: P0 curl login — [SEQUENTIAL:depends-on-DO-003]
- [x] QA-002: P0 browser login — [SEQUENTIAL:depends-on-QA-001]
- [x] QA-003: P1 signup + verify-email — [SEQUENTIAL:depends-on-QA-002]
- [x] QA-004: P2 auth matrix — [SEQUENTIAL:depends-on-QA-003] (partial: refresh 500 open)
- [x] QA-005: Compact bug report — [SEQUENTIAL:depends-on-QA-004,FE-010]

---

TASK-QA-001: P0 curl login smoke (ACTIVE accounts)
Status: pending
Parallelism: [SEQUENTIAL:depends-on-DO-003]
Assigned-to: qa-lead
Target-dev: QA

## Description
Verify login HTTP contract on Docker Caddy 8080 for known ACTIVE accounts before browser testing.

## Implementation Strategy
1. Bring up stack per DO-003.
2. Run `infra/scripts/auth-smoke.sh` for:
   - `murtzamlk1@gmail.com`
   - `murtzamlk@gmail.com`
   (Passwords from team secret store — **do not** commit.)
3. Manual curl record: status, body length, presence of `accessToken`, absence of error `code` field.
4. If 401/403: verify account `status=ACTIVE` in DB or admin tool before filing wiring bug.

## Interface Contracts
`POST http://localhost:8080/api/v1/auth/login`  
Body: `{"email":"<email>","password":"<password>"}`

## Acceptance Criteria
- **Given** ACTIVE accounts,
- **When** curl login,
- **Then** HTTP 200, JSON includes non-null `accessToken`, `mfaRequired` false for parent accounts under test.

## Files to Create / Modify
- None (execution); optional notes in bug report

## Relevant Context
- requirements P0 curl smoke
- DO-003 script

## TODO Template
- [ ] Stack up
- [ ] Smoke both emails
- [ ] Record results for QA-002

---

TASK-QA-002: P0 browser login end-to-end
Status: pending
Parallelism: [SEQUENTIAL:depends-on-QA-001]
Assigned-to: qa-lead
Target-dev: QA

## Description
Confirm login UI no longer shows "Unable to sign in" on successful API 200; tokens stored; navigation works.

## Implementation Strategy
1. Open `http://localhost:3000/login` (or Caddy-fronted web URL if used).
2. DevTools Network: confirm `POST .../auth/login` → 200, response JSON.
3. Application tab: `sessionStorage` keys `accessToken`, optionally `refreshToken`.
4. UI: no ErrorState "Unable to sign in"; lands on `/home` (or student home route — document actual URL).
5. If fails after FE fixes: file SB-002 gate with response body + Zod/console evidence.

## Acceptance Criteria
- **When** valid ACTIVE parent credentials submitted,
- **Then** no "Unable to sign in" or SchemaParseError user message.
- **And** sessionStorage contains accessToken.
- **And** user reaches home route without auth wiring error banner.

## Files to Create / Modify
- None

## Relevant Context
- `login/page.tsx` line 40
- TASK-FE-002

## TODO Template
- [ ] Browser login both test emails
- [ ] Capture screenshots/network HAR if fail
- [ ] Pass/fail for SB-002 gate

---

TASK-QA-003: P1 register-parent and verify-email
Status: pending
Parallelism: [SEQUENTIAL:depends-on-QA-002]
Assigned-to: qa-lead
Target-dev: QA

## Description
Validate signup 201 parsing and verify-email 200 empty body UX.

## Implementation Strategy
1. `/signup` — new unique email or test inbox; expect redirect `/verify-email?email=...`.
2. Mailpit `http://localhost:8025` — copy 6-digit code.
3. `/verify-email` — submit; expect success copy "Email verified. You can log in." not "Verification failed."
4. Record: register POST 201 with `accountId`; verify POST 200 zero-length body.

## Acceptance Criteria
- **When** signup succeeds,
- **Then** 201 body parsed and redirect occurs.
- **When** valid code submitted,
- **Then** success UI; no false failure on empty 200.

## Files to Create / Modify
- None

## Relevant Context
- AUTH-01, AUTH-02
- FE-006

## TODO Template
- [ ] Full signup path
- [ ] Mailpit code
- [ ] Verify success UI

---

TASK-QA-004: P2 auth matrix (forgot, MFA, picture-pin, student register)
Status: pending
Parallelism: [SEQUENTIAL:depends-on-QA-003]
Assigned-to: qa-lead
Target-dev: QA

## Description
Exercise remaining auth endpoints from requirements matrix with status + body length + UI checks.

## Implementation Strategy
| Flow | Steps | Pass condition |
|------|-------|----------------|
| Forgot password | Login page forgot mode | 202 empty; success message; no error |
| Staff MFA | `/staff/login` staff user with MFA | Step 2 shown; not "Unable to reach API" on 200 challenge |
| Picture-pin | `/child-login` if test child exists | 200; tokens; redirect home |
| Student register | `/student/signup` if feasible | 201; page continues without generic error |
| Refresh/logout | curl or console calling new FE-008 helpers | 200 tokens / 204 no throw |

Edge cases (expect real errors, not wiring bugs):
- Wrong password → 401 ApiError messaging
- Rate limit → 429 if triggered

## Acceptance Criteria
- Each row in requirements auth matrix AUTH-04 through AUTH-16 exercised or marked N/A with reason.
- No success HTTP treated as UI failure for tested flows.

## Files to Create / Modify
- None

## Relevant Context
- requirements table
- staff/login, child-login pages

## TODO Template
- [ ] Forgot password
- [ ] Staff MFA happy path
- [ ] Picture-pin / student if data exists
- [ ] refresh/logout smoke

---

TASK-QA-005: Compact auth wiring bug report
Status: pending
Parallelism: [SEQUENTIAL:depends-on-QA-004,FE-010]
Assigned-to: qa-lead
Target-dev: QA

## Description
Publish single artifact listing every bug found/fixed with verification steps.

## Implementation Strategy
CREATE `docs/auth-wiring-bug-report.md` with sections per bug:
1. **ID** (e.g. BUG-LOGIN-001)
2. **file:line** (root cause location)
3. **Root cause** (one sentence — e.g. Jackson non_null vs Zod nullable)
4. **Fix summary** (PR/commit reference)
5. **Verify** — curl command + browser path

Include FE-010 scan findings (billing localStorage vs sessionStorage if not fixed).

Minimum bugs to document:
- Login 200 → UI error (P0)
- verify-email empty 200 (P1) — note client.ts prior fix

## Acceptance Criteria
- **When** implementation phase complete,
- **Then** report exists with at least P0 and P1 entries and verify steps reproducible on Docker studyloop stack.

## Files to Create / Modify
- CREATE: `docs/auth-wiring-bug-report.md`

## Relevant Context
- All FE/SB tasks
- FE-010 findings

## TODO Template
- [ ] Collect file:line from devs
- [ ] Write report
- [ ] Cross-check acceptance criteria in requirements doc
