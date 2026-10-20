# Frontend Tasks — Auth Wiring Audit

**Lead:** frontend-lead  
**Target devs:** React Component Dev, Node.js Middleware Dev (api client)

---

## Frontend TODO

- [ ] FE-001: Capture login JSON vs Zod — [SEQUENTIAL:first]
- [ ] FE-002: Fix TokenResponseSchema — [SEQUENTIAL:depends-on-FE-001]
- [ ] FE-009: Vitest schema fixtures — [SEQUENTIAL:depends-on-FE-002]
- [ ] FE-003: Unify picture-pin schema — [SEQUENTIAL:depends-on-FE-002]
- [ ] FE-004: apiFetch SchemaParseError — [PARALLEL]
- [ ] FE-005: MeSchema nullish — [SEQUENTIAL:depends-on-FE-002]
- [ ] FE-006: Void auth schemas — [PARALLEL]
- [ ] FE-007: Auth page error mapping — [SEQUENTIAL:depends-on-FE-004]
- [ ] FE-008: refresh/logout helpers — [PARALLEL]
- [ ] FE-010: P4 api module scan — [PARALLEL:after-P1]

---

TASK-FE-001: Capture login JSON vs Zod failure mode
Status: pending
Parallelism: [SEQUENTIAL:first]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Reproduce the P0 login bug with evidence: HTTP 200 body shape from core-api under Jackson `non_null`, and confirm Zod rejection before applying fixes.

## Implementation Strategy
1. With Docker stack up (or local core-api on 8081), `curl` login for an ACTIVE account.
2. Save exact JSON keys (note omitted nulls).
3. In a temporary vitest or node REPL, run current `TokenResponseSchema.parse(json)` and capture `ZodError.issues`.
4. Document findings in PR description or comment (not a new markdown doc unless QA asks).

## Interface Contracts
- Endpoint: `POST /api/v1/auth/login`
- Request: `{ "email": string, "password": string }`
- Expected success body (Java `AuthDtos.TokenResponse`, camelCase, nulls omitted): at minimum `accessToken`, `refreshToken`, `tokenType`, `expiresInSeconds`, `mfaRequired`; omit `mfaChallengeToken` when null.

## Acceptance Criteria
- **Given** ACTIVE credentials,
- **When** curl returns 200,
- **Then** captured JSON is attached to the task/PR and Zod failure mode (if any) is identified with field paths.

## Files to Create / Modify
- CREATE (optional): `web/src/lib/api/auth.schema.test.ts` stub with captured fixture (completed in FE-009)

## Relevant Context
- `backend/core-api/src/main/resources/application.yml` (`jackson.default-property-inclusion: non_null`)
- `web/src/lib/api/auth.ts` — `TokenResponseSchema`
- `web/src/app/(auth)/login/page.tsx` line 40 generic catch

## TODO Template
- [ ] curl login via `http://localhost:8080/api/v1/auth/login`
- [ ] Record JSON keys and values (redact tokens in logs)
- [ ] Reproduce ZodError with current schema
- [ ] Hand off fixture to FE-002/FE-009

---

TASK-FE-002: Fix TokenResponseSchema for Jackson non_null
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-001]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Update `TokenResponseSchema` so successful login/MFA/refresh/picture-pin responses parse when Jackson omits null properties.

## Implementation Strategy
In `web/src/lib/api/auth.ts`:
- Export `TokenResponseSchema` (already exported).
- Change nullable token fields to `z.string().nullish()` (`accessToken`, `refreshToken`, `mfaChallengeToken`).
- Use `expiresInSeconds: z.coerce.number()` (accept JSON number; tolerate string if ever sent).
- Use `tokenType: z.string().default("Bearer")` if key sometimes omitted (only if proven; otherwise keep required).
- Use `mfaRequired: z.boolean().default(false)` if key omitted on token responses (verify against curl — likely always present).
- Do **not** change Java DTOs in this task.

## Interface Contracts
```typescript
// Parsed type must satisfy login page usage:
// tokens.mfaRequired, tokens.mfaChallengeToken, tokens.accessToken, tokens.refreshToken
export const TokenResponseSchema = z.object({ /* hardened fields */ });
```

Sample JSON fixture (success, non-MFA parent):
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "mfaRequired": false
}
```
Note: no `mfaChallengeToken` key.

## Acceptance Criteria
- **Given** FE-001 fixture JSON,
- **When** `TokenResponseSchema.parse(fixture)`,
- **Then** parse succeeds and `accessToken` is a non-empty string.
- **Given** MFA challenge JSON `{ "tokenType":"Bearer","expiresInSeconds":0,"mfaRequired":true,"mfaChallengeToken":"<uuid>" }` (null tokens omitted),
- **When** parsed,
- **Then** `mfaRequired === true` and challenge token present.

## Files to Create / Modify
- MODIFY: `web/src/lib/api/auth.ts`

## Relevant Context
- TASK-FE-001 fixture
- `AuthDtos.TokenResponse` in `backend/core-api/.../AuthDtos.java`

## TODO Template
- [ ] Apply nullish/coerce/default pattern to all TokenResponse fields
- [ ] Run `npm test` in `web/`
- [ ] Manual: login page no generic error on 200

---

TASK-FE-009: Vitest schema fixtures for TokenResponse
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-002]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Add regression tests so Jackson `non_null` login bodies never break login again.

## Implementation Strategy
Create `web/src/lib/api/auth.schema.test.ts` using vitest:
- Test case: success login body without `mfaChallengeToken`.
- Test case: MFA challenge body without `accessToken`/`refreshToken`.
- Test case: full body with explicit nulls (if backend ever sends them) still parses.

## Interface Contracts
Import `TokenResponseSchema` from `./auth`.

## Acceptance Criteria
- **When** `npm test` runs in `web/`,
- **Then** all new tests pass.

## Files to Create / Modify
- CREATE: `web/src/lib/api/auth.schema.test.ts`

## Relevant Context
- TASK-FE-002 schema

## TODO Template
- [ ] Add fixtures from FE-001
- [ ] Three parse tests minimum
- [ ] CI green via `npm test`

---

TASK-FE-003: Unify picture-pin schema with TokenResponseSchema
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-002]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Remove duplicate inline Zod object in `auth-extra.ts` and import `TokenResponseSchema` from `auth.ts`.

## Implementation Strategy
- In `picturePinLogin`, set `schema: TokenResponseSchema`.
- Delete duplicated inline `z.object({ accessToken: ... })`.

## Interface Contracts
`POST /auth/student/picture-pin` → same as login token shape.

## Acceptance Criteria
- **When** picture-pin returns 200 with omitted nulls,
- **Then** parse succeeds (same tests pattern as FE-009 optional single test import).

## Files to Create / Modify
- MODIFY: `web/src/lib/api/auth-extra.ts`

## Relevant Context
- TASK-FE-002

## TODO Template
- [ ] Import TokenResponseSchema
- [ ] Remove duplicate schema block
- [ ] Run `npm test`

---

TASK-FE-004: apiFetch SchemaParseError and safeParse
Status: pending
Parallelism: [PARALLEL]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
When Zod validation fails on a 2xx response, throw a distinguishable error (not generic Error) and log parse issues in development only.

## Implementation Strategy
In `web/src/lib/api/client.ts`:
1. Add `export class SchemaParseError extends Error` with `issues: z.ZodIssue[]` (no response body in message).
2. Replace `init.schema.parse(json)` with `safeParse`; on failure throw `SchemaParseError`.
3. Keep existing empty-body and 204/205 behavior unchanged.
4. Optional: `if (process.env.NODE_ENV === "development") console.error("apiFetch schema mismatch", path, result.error.issues)` — never log token values.

## Interface Contracts
```typescript
export class SchemaParseError extends Error {
  constructor(public issues: z.ZodIssue[]) { super("Response schema mismatch"); }
}
```

## Acceptance Criteria
- **Given** intentional wrong schema on a test endpoint in unit test (mock fetch),
- **When** apiFetch completes with 200 JSON,
- **Then** throws `SchemaParseError`, not `ApiError`.
- **Given** empty 200 body and `z.void().or(z.undefined())`,
- **When** apiFetch runs,
- **Then** resolves without throw.

## Files to Create / Modify
- MODIFY: `web/src/lib/api/client.ts`
- CREATE: `web/src/lib/api/client.test.ts` (minimal mock fetch test)

## Relevant Context
- verify-email partial fix already in client.ts lines 38-47

## TODO Template
- [ ] Add SchemaParseError
- [ ] safeParse path
- [ ] Unit test mock fetch
- [ ] npm test

---

TASK-FE-005: MeSchema nullish for GET /me after login
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-002]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Align `MeSchema` with Jackson `non_null` so post-login `/home` or settings does not fail silently on `/me`.

## Implementation Strategy
In `web/src/lib/api/auth.ts` `MeSchema`:
- `accountId`, `email`, `studentId`: `z.string().nullish()` (UUID as string).
- Keep `displayName`, `kind`, `status`, `roles`, arrays as today; use `.default([])` / `.default({})` for omitted empty collections if curl shows omissions.
- Cross-check `AuthDtos.MeResponse` — no `studentId` in Java; keep optional `studentId` as nullish optional only.

Also align duplicate `/me` in `web/src/lib/api/settings.ts` if it defines a separate schema — **must use same MeSchema or import from auth.ts** (single source).

## Interface Contracts
`GET /api/v1/me` with Bearer access token → `MeSchema`.

## Acceptance Criteria
- **Given** valid access token after login,
- **When** `getMe(token)` called,
- **Then** no SchemaParseError and object has `displayName`, `kind`, `status`.

## Files to Create / Modify
- MODIFY: `web/src/lib/api/auth.ts`
- MODIFY: `web/src/lib/api/settings.ts` (if duplicate Me schema exists)

## Relevant Context
- `AuthDtos.MeResponse`
- `web/src/app/(student)/home/page.tsx` may call getMe

## TODO Template
- [ ] curl GET /me with login token; capture JSON
- [ ] Adjust MeSchema
- [ ] Deduplicate settings.ts schema import
- [ ] Test parse

---

TASK-FE-006: Void/empty schemas for verify, forgot, reset, resend
Status: pending
Parallelism: [PARALLEL]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Standardize void response schemas across auth helpers for Spring empty 200/202 bodies.

## Implementation Strategy
1. Define shared `export const EmptyResponseSchema = z.void().or(z.undefined()).or(z.null())` in `client.ts` or `auth.ts`.
2. `verifyEmail`: replace `z.any().optional()` with `EmptyResponseSchema`.
3. `forgotPassword`: already void — switch to shared constant.
4. Add `resetPassword(token, newPassword)` and `resendVerificationEmail(email)` in `auth-extra.ts` or `auth.ts` using `EmptyResponseSchema` (202 for resend) — **no UI required**; functions for future/smoke.
5. Confirm `apiFetch` treats 202 + empty text as success (already does via `!text` branch).

## Interface Contracts
- `POST /auth/verify-email` → 200 empty
- `POST /auth/password/forgot` → 202 empty
- `POST /auth/password/reset` → 200 empty
- `POST /auth/verify-email/resend` → 202 empty, body `{ email }`

## Acceptance Criteria
- **When** verify-email returns 200 empty,
- **Then** `verifyEmail()` resolves.
- **When** forgot returns 202 empty,
- **Then** `forgotPassword()` resolves.

## Files to Create / Modify
- MODIFY: `web/src/lib/api/auth-extra.ts`
- MODIFY: `web/src/lib/api/auth.ts`
- MODIFY: `web/src/lib/api/client.ts` (only if exporting EmptyResponseSchema)

## Relevant Context
- `VerifyEmailClient.tsx`
- `login/page.tsx` forgot mode

## TODO Template
- [ ] Shared EmptyResponseSchema
- [ ] Update verify + forgot
- [ ] Add reset + resend helpers
- [ ] curl each endpoint empty body

---

TASK-FE-007: Auth pages distinguish SchemaParseError vs network
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-004]
Assigned-to: frontend-lead
Target-dev: React Component Dev

## Description
Update auth page catch blocks to show accurate messages: credentials/rate limit for `ApiError`, contract hint for `SchemaParseError` (dev-safe), generic only for unknown network failures.

## Implementation Strategy
Files and behavior:
1. `web/src/app/(auth)/login/page.tsx`: import `SchemaParseError`; on catch: ApiError → existing invalid credentials copy; SchemaParseError → "Sign-in response could not be read. Try again or contact support." (no token details); else → "Unable to sign in."
2. `web/src/app/(auth)/verify-email/VerifyEmailClient.tsx`: SchemaParseError → "Verification response invalid."
3. `web/src/app/(auth)/signup/page.tsx`: same pattern for register.
4. `web/src/app/(auth)/staff/login/page.tsx`: SchemaParseError → distinct from "Unable to reach API."
5. `web/src/app/(auth)/child-login/page.tsx`: SchemaParseError message.

Do not change redirect logic: `/home`, MFA redirect to staff login with challenge query.

## Interface Contracts
Uses `login`, `verifyMfa`, `forgotPassword`, `registerParent`, `verifyEmail`, `picturePinLogin` from api modules.

## Acceptance Criteria
- **Given** FE-002 fixed login (200 parse OK),
- **When** user submits valid credentials,
- **Then** no error state; redirect `/home` or MFA.
- **Given** simulated SchemaParseError in dev test,
- **When** caught,
- **Then** UI shows contract message, not "Invalid credentials."

## Files to Create / Modify
- MODIFY: `web/src/app/(auth)/login/page.tsx`
- MODIFY: `web/src/app/(auth)/verify-email/VerifyEmailClient.tsx`
- MODIFY: `web/src/app/(auth)/signup/page.tsx`
- MODIFY: `web/src/app/(auth)/staff/login/page.tsx`
- MODIFY: `web/src/app/(auth)/child-login/page.tsx`

## Relevant Context
- TASK-FE-004 SchemaParseError

## TODO Template
- [ ] Import SchemaParseError in each page
- [ ] Update catch branches
- [ ] Smoke login + verify UX

---

TASK-FE-008: Add refresh and logout client helpers
Status: pending
Parallelism: [PARALLEL]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Add minimal API wrappers for refresh/logout so 204/TokenResponse patterns are consistent (P3).

## Implementation Strategy
In `web/src/lib/api/auth.ts`:
```typescript
export function refreshSession(refreshToken: string) {
  return apiFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    schema: TokenResponseSchema,
  });
}
export function logout(refreshToken?: string) {
  return apiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    schema: EmptyResponseSchema, // from FE-006
  });
}
```

## Interface Contracts
- AUTH-09 refresh → 200 TokenResponse
- AUTH-10 logout → 204 empty

## Acceptance Criteria
- **When** logout called after login,
- **Then** apiFetch resolves without throw on 204.

## Files to Create / Modify
- MODIFY: `web/src/lib/api/auth.ts`

## Relevant Context
- TASK-FE-006 EmptyResponseSchema
- AuthController logout 204

## TODO Template
- [ ] Implement refresh + logout
- [ ] curl logout with bearer optional body

---

TASK-FE-010: Scan settings, billing, w2 for empty-body / strict Zod
Status: pending
Parallelism: [PARALLEL]
Assigned-to: frontend-lead
Target-dev: Node.js Middleware Dev

## Description
Document and fix only clear mismatches (void endpoints with strict objects) in high-traffic API modules.

## Implementation Strategy
1. Grep `web/src/lib/api/settings.ts`, `billing.ts`, `w2.ts` for `z.void`, `z.object`, PATCH/DELETE/POST that return void in backend catalogue.
2. For each void Spring endpoint called with non-void strict schema and empty body risk, switch to `EmptyResponseSchema` or `z.any()` per architect minimal fix rule.
3. Output list for QA-005 bug report (file:line, root cause, fix) — append to `docs/auth-wiring-bug-report.md` only when QA task creates it; until then add comment block at bottom of this task file or PR description.

**Known pattern:** `settings.ts` already uses `z.void().or(z.undefined()).or(z.null())` for password change — verify sufficient.

**Token storage note:** `w2.ts` and `billing.ts` read `localStorage` for token; login stores `sessionStorage` — document as separate finding in report (do not refactor storage in this audit unless page breaks).

## Acceptance Criteria
- **When** scan completes,
- **Then** at least 3 endpoints reviewed per file with pass/fail noted for QA report.
- **When** clear empty-body bug found,
- **Then** fixed in same PR or filed as explicit follow-up line in report.

## Files to Create / Modify
- MODIFY: (as needed) `web/src/lib/api/settings.ts`, `billing.ts`, `w2.ts`

## Relevant Context
- requirements P4

## TODO Template
- [ ] Grep and catalogue endpoints
- [ ] Fix clear bugs only
- [ ] Hand findings to QA-005
