# Enriched Requirements Document — Auth Frontend↔Backend Wiring Audit

## Original Requirements

Align team and thoroughly audit frontend↔backend wiring for auth and related flows. Find bugs where HTTP success is treated as UI failure (or failures are mishandled). Fix them and redeploy Docker `web` / `core-api` as needed so the local Docker stack works.

**Confirmed bugs**

1. MailConfig hardcoded SMTP localhost — fixed; Mailpit works via `MAIL_HOST=mailpit`.
2. verify-email: API returns 200 empty body; `apiFetch` only handled 204 then called `res.json()` → UI "Verification failed" despite success. Partial fix in `web/src/lib/api/client.ts` (empty body → parse undefined).
3. **NEW:** login page shows "Unable to sign in" while Network shows `POST http://localhost:8080/api/v1/auth/login` → 200 OK with JSON. Same class — schema mismatch or response handling.

**Repo**

- Root: `online_tutor_build_pack`
- Web: `web/src` — `client.ts`, `lib/api/*.ts`, `app/(auth)/**`
- Backend: `backend/core-api` — `AuthService`, `AuthController`, `AuthDtos.TokenResponse`
- Docker: `infra/docker-compose.yml` project `studyloop`; public API via Caddy `http://localhost:8080/api/v1`

**Audit scope**

Auth: register-parent, verify-email, verify-email/resend, login, MFA verify, refresh, logout, forgot/reset password, student picture-pin, student register. Compare Java DTO field names/nullability with Zod schemas and page handlers. `apiFetch`: empty bodies, 200/202/204, Zod parse failures as generic errors. Token storage + redirects after login. Expand to other high-traffic `apiFetch` callers for the same pattern.

**Deliverables (later phases)**

1. Fix login 200→UI-error + rebuild Docker web (and core-api if needed)
2. Fix all similar auth wiring bugs
3. Compact report: bugs (file:line), root cause, fix, verify steps
4. No mobile. No user questions unless true blocker.
5. Verify curl login + ACTIVE accounts

---

## Clarification Rounds

**Round 1:** SKIPPED — per user directive; resolve from code, Docker, and documented assumptions.

**Round 2:** SKIPPED.

---

## Goals

1. **Primary:** Successful HTTP responses from auth endpoints must not surface as generic UI failures ("Unable to sign in", "Verification failed", etc.) when the backend succeeded.
2. **Systematic:** Align `AuthDtos` (Java records) with Zod schemas and auth page handlers across all in-scope endpoints.
3. **Centralize:** Harden `apiFetch` for Spring void/empty-body patterns (200/202/204/205) and improve diagnosability when Zod validation fails (without leaking secrets in production UI).
4. **Operational:** After fixes, rebuild and run the `studyloop` Docker stack so browser flows and curl checks pass against `http://localhost:8080`.

---

## Out of Scope

- Mobile clients and responsive design changes (Design Lead not active).
- New auth UI or visual redesign.
- OIDC (`/auth/oidc/*`) — backend explicitly deferred; no end-to-end OIDC wiring in this audit.
- Authenticated MFA enroll/recovery endpoints except where staff login already calls them.
- Broad refactors of non-auth modules unless the same `apiFetch`/empty-body/Zod pattern is found in high-traffic paths during audit.
- Production deployment, secrets rotation, or PCI/compliance certification.
- User-facing clarification questionnaires (assumptions used instead).

---

## Priority Order

| Priority | Item | Rationale |
|----------|------|-----------|
| P0 | Login (`POST /auth/login`) | Confirmed regression; blocks all signed-in flows |
| P1 | verify-email, verify-email/resend | Confirmed/partial fix; blocks account activation |
| P1 | register-parent (201 + body) | Onboarding gate before verify |
| P2 | forgot/reset password | Empty 202/200 bodies |
| P2 | MFA verify (+ staff login page) | TokenResponse + challenge flow |
| P2 | picture-pin, student register | Child/standalone auth paths |
| P3 | refresh, logout | API wrappers may be missing; fix if used or add minimal client helpers |
| P3 | `/me` after login | Token storage → `getMe` schema alignment |
| P4 | Sample high-traffic `apiFetch` in `settings.ts`, `billing.ts`, `w2.ts` | Same failure class outside auth |

---

## Auth Endpoint Matrix (Audit Checklist)

Base path: `/api/v1`. Public browser API base: `NEXT_PUBLIC_API_BASE` → `http://localhost:8080/api/v1` (via Caddy). Direct core-api host port: `8081` (bypass Caddy).

| ID | Method | Path | Backend response (expected) | Java DTO / notes | Frontend touchpoints | Audit focus |
|----|--------|------|----------------------------|------------------|----------------------|-------------|
| AUTH-01 | POST | `/auth/register-parent` | **201** JSON `RegisterParentResponse` | `accountId` (UUID), `status` | `auth-extra.ts` `registerParent`, `signup/page.tsx` | 201 OK; UUID as string in Zod |
| AUTH-02 | POST | `/auth/verify-email` | **200** empty body | `VerifyEmailRequest` | `auth-extra.ts` `verifyEmail`, `VerifyEmailClient.tsx` | Empty body + schema |
| AUTH-03 | POST | `/auth/verify-email/resend` | **202** empty body | body: `{ email }` (ForgotPasswordRequest shape) | *No dedicated client found* | Add/wire if UI resend exists |
| AUTH-04 | POST | `/auth/login` | **200** JSON `TokenResponse` | See token fields below | `auth.ts` `login`, `login/page.tsx`, `staff/login/page.tsx` | **P0 bug** — Zod vs JSON |
| AUTH-05 | POST | `/auth/mfa/verify` | **200** JSON `TokenResponse` | `MfaVerifyRequest` | `auth.ts` `verifyMfa`, staff login | Same schema as login |
| AUTH-09 | POST | `/auth/refresh` | **200** JSON `TokenResponse` | `RefreshRequest` | *No client in `auth.ts`* | Add if session refresh needed |
| AUTH-10 | POST | `/auth/logout` | **204** empty | optional `LogoutRequest` | *No client found* | 204 handling in `apiFetch` |
| AUTH-11 | POST | `/auth/password/forgot` | **202** empty | `{ email }` | `auth.ts` `forgotPassword`, login forgot mode | `z.void().or(z.undefined())` + empty body |
| AUTH-12 | POST | `/auth/password/reset` | **200** empty | `ResetPasswordRequest` | *No page/client found* | Empty body when UI added |
| AUTH-15 | POST | `/auth/student/picture-pin` | **200** JSON `TokenResponse` | `loginHandle`, `pictureSequence` | `auth-extra.ts`, `child-login/page.tsx` | TokenResponse schema duplicate |
| AUTH-16 | POST | `/auth/student/register` | **201** JSON map | dynamic `Map` | `w3.ts` `Any` schema, `student/signup/page.tsx` | Loose schema; verify page expectations |
| AUTH-17 | GET | `/me` | **200** JSON `MeResponse` | nullable UUIDs, lists | `auth.ts` `getMe`, settings/home | Post-login smoke |

### `TokenResponse` contract (backend source of truth)

Java (`AuthDtos.TokenResponse`):

- `accessToken`: String, nullable  
- `refreshToken`: String, nullable  
- `tokenType`: String (e.g. `"Bearer"`)  
- `expiresInSeconds`: long  
- `mfaRequired`: boolean  
- `mfaChallengeToken`: String, nullable  

Frontend (`TokenResponseSchema` in `web/src/lib/api/auth.ts`): same camelCase names; nullable strings; `expiresInSeconds` as `z.number()`.

**Likely failure modes (Architect):**

- Zod `safeParse` throws → caught as non-`ApiError` → generic "Unable to sign in" on login.
- Jackson omitting null fields → missing keys fail strict `z.object` unless `.optional()` or `.nullish()`.
- Numeric types: `expiresInSeconds` must accept JSON number (coerce if backend ever sends string).
- Duplicate schema in `auth-extra.ts` (picture-pin) must stay in sync with `TokenResponseSchema`.

**Void / empty endpoints (QA):**

- Treat **200, 202, 204, 205** with **zero-length body** as success for void/optional schemas.
- Do **not** call `res.json()` on empty bodies.

---

## Documented Assumptions

- **[ASSUMPTION — RISK: LOW]** Local verification uses Docker Compose project **`studyloop`** from `infra/docker-compose.yml`, with Caddy on host port **8080** proxying `/api/*` to `core-api:8080` and other routes to `web:3000`.
- **[ASSUMPTION — RISK: LOW]** Mailpit is the mail sink (`MAIL_HOST=mailpit`); parent registration and verify-email tests use Mailpit UI at `http://localhost:8025`.
- **[ASSUMPTION — RISK: MEDIUM]** Login E2E tests use accounts in **`ACTIVE`** status (email verified). Unverified accounts may correctly return **4xx** from the API; those are not "200 treated as failure" bugs.
- **[ASSUMPTION — RISK: MEDIUM]** The login bug root cause is **client-side response handling** (Zod validation or handler logic), not incorrect HTTP status from core-api when Network shows 200 + JSON. Implementation will confirm with response body capture.
- **[ASSUMPTION — RISK: LOW]** Backend JSON property names remain **camelCase** matching Java record components (no global snake_case naming strategy).
- **[ASSUMPTION — RISK: LOW]** `verify-email` partial fix in `client.ts` is correct direction; remaining verify UX issues, if any, are schema/handler-level.
- **[ASSUMPTION — RISK: LOW]** Refresh/logout/resend/reset may lack UI; audit still covers `apiFetch` helpers and any call sites; missing helpers are in scope only if referenced by existing pages or needed for Docker smoke.
- **[ASSUMPTION — RISK: LOW]** Mobile apps are excluded; web session storage (`sessionStorage` for tokens) is the intended browser mechanism per existing login pages.
- **[ASSUMPTION — RISK: LOW]** OIDC endpoints are not exercised in Docker smoke for this mission.

---

## Technical Decisions (confirmed by analysis — no user round)

| Decision | Choice |
|----------|--------|
| Fix preference | Align Zod schemas + `apiFetch` + page catch blocks before changing Java DTOs unless proven mismatch |
| API base URL | Browser calls `http://localhost:8080/api/v1` through Caddy in Docker |
| Error taxonomy | Preserve `ApiError` for HTTP errors; map Zod failures to a distinguishable error type or message in dev-oriented logs, user-safe message in UI |
| Token storage | Continue `sessionStorage` (`accessToken`, `refreshToken`) per existing auth pages |
| Deploy | Rebuild `web` image after frontend fixes; rebuild `core-api` only if backend contract change required |
| Mail | Mailpit via env (already fixed) |

---

## Acceptance Criteria (measurable)

### P0 — Login

- **Given** an **ACTIVE** parent account exists (registered + verify-email completed),
- **When** the user submits valid credentials on `/login`,
- **Then** the browser must **not** show "Unable to sign in",
- **And** `POST /api/v1/auth/login` returns **200** with parseable `TokenResponse`,
- **And** `accessToken` (and `refreshToken` when present) are stored in `sessionStorage`,
- **And** the browser navigates to `/home` (or MFA challenge flow when `mfaRequired` is true).

### P0 — curl smoke (login)

- **Given** Docker stack is up,
- **When** `curl -sS -X POST http://localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"<ACTIVE>","password":"<pwd>"}'`,
- **Then** HTTP status is **200** and body contains `"accessToken"` (non-null for non-MFA parent).

### P1 — verify-email

- **Given** a pending account and valid code from Mailpit,
- **When** user submits verify on `/verify-email`,
- **Then** UI shows success (not "Verification failed") and API returns **200** with empty body.

### P1 — register-parent

- **When** signup succeeds,
- **Then** API **201** body parses (`accountId`, `status`) and user is redirected to verify-email flow.

### P2 — forgot password

- **When** forgot mode submits email,
- **Then** API **202** empty body succeeds and UI shows neutral success copy (no false error).

### P2 — MFA (staff)

- **When** staff account requires MFA,
- **Then** login response with `mfaRequired: true` shows MFA step (staff page) without generic API reachability error.

### P2 — picture-pin / student register

- **When** valid child credentials or standalone student signup,
- **Then** **200/201** responses parse and redirect/store tokens consistent with login page.

### P3 — apiFetch hardening

- **When** any in-scope endpoint returns **200/202/204/205** with empty body and a void/optional schema,
- **Then** `apiFetch` resolves successfully without throwing parse/json errors.

### P3 — Regression scan

- **When** auditing `web/src/lib/api/*.ts`,
- **Then** document any additional endpoints with the same empty-body or strict-Zod pattern in the compact bug report (file:line, root cause, fix, verify steps).

### Docker success criteria (definition of done for ops verify)

1. From `infra/`: `docker compose -p studyloop up -d --build` (or rebuild `web` / `core-api` only after changes) completes healthy.
2. `curl -sf http://localhost:8080/api/v1/...` auth smoke passes for login + register/verify path documented in bug report.
3. Manual browser path: signup → Mailpit code → verify-email → login → `/home` loads without auth wiring errors.
4. No regression: verify-email success still works after login fix.

---

## Consultation Notes (Architect & QA Lead — inline)

**Architect:** Single choke point is `web/src/lib/api/client.ts` plus shared `TokenResponseSchema`. Prefer `.nullish()` / `z.coerce.number()` where Jackson omits nulls or type edges exist. Consider unifying picture-pin schema with `TokenResponseSchema`. Page handlers should not treat all non-`ApiError` exceptions identically if the failure is contract drift (optional: log parse detail server-side in dev). Caddy vs port 8081: document that **8080** is the canonical public API for browser and curl in Docker.

**QA Lead:** Each auth flow needs Given/When/Then with **HTTP status + body length + UI message**. Edge cases: MFA challenge (null tokens), rate limit (**429** → `ApiError`), invalid credentials (**401**), unverified account (**403/401** per backend). Forgot password must never enumerate accounts (always success UI on 202). Logout **204** must not throw in any future client. Student register **201** with arbitrary map needs spot-check against page fields.

---

## Expected Outputs from Implementation Phase

1. Code fixes (login first, then remaining auth matrix rows).
2. Docker rebuild instructions executed for `web` (and `core-api` if needed).
3. **Compact report** (separate artifact): each bug with `file:line`, root cause, fix summary, verify steps (curl + browser).
4. This document remains the requirements baseline; implementation must not contradict acceptance criteria without updating assumptions.
