# Auth wiring bug report (Study Loop)

**Stack:** Docker `studyloop` — Caddy `http://localhost:8080`, Mailpit `http://localhost:8025`  
**QA run:** 2026-09-30

---

## BUG-LOGIN-001 (P0) — Login HTTP 200 → UI “Unable to sign in”

| Field | Detail |
|-------|--------|
| **Location** | `web/src/lib/api/auth.ts:4-11`, `web/src/lib/api/auth-extra.ts:29-36`, `web/src/app/(auth)/login/page.tsx:40` |
| **Root cause** | Jackson `@JsonInclude(NON_NULL)` omits null keys (e.g. `mfaChallengeToken` on success login). Zod used `.nullable()` which requires the key to be present as `null`; missing key → `ZodError` in `apiFetch` → login catch showed generic error despite HTTP 200. |
| **Fix** | Token fields → `.nullish()`; shared `TokenResponseSchema`; `SchemaParseError` in `client.ts`; login page branches parse vs API errors. |
| **Verify** | **curl:** `./infra/scripts/auth-smoke.sh <email> <password>` → HTTP 200 + `accessToken`. **Browser:** `http://localhost:8080/login` with ACTIVE parent → no “Unable to sign in”; redirect `/home`; `sessionStorage.accessToken` set. **Unit:** `cd web && npm test` (`auth.schema.test.ts` Jackson fixture without `mfaChallengeToken`). |

**QA status:** **Fixed / verified** (browser + curl on throwaway account `qa.throwaway.1790753831@studyloop-qa.local`).

---

## BUG-VERIFY-001 (P1) — verify-email HTTP 200 empty body → client parse failure

| Field | Detail |
|-------|--------|
| **Location** | `web/src/lib/api/client.ts:46-55`, `web/src/lib/api/auth-extra.ts:21` |
| **Root cause** | Spring void endpoints return **200/202 with zero-length body**; strict JSON parse or loose `z.any().optional()` was inconsistent with empty success responses. |
| **Fix** | `EmptyResponseSchema`; `apiFetch` treats empty text as `undefined` before `safeParse`; `verifyEmail` uses `EmptyResponseSchema`. |
| **Verify** | **curl:** `POST /api/v1/auth/verify-email` with valid code → HTTP **200**, body length **0**. **Browser:** `/verify-email` after Mailpit code → success copy (not “Verification failed.”). |

**QA status:** **Fixed / verified** (API empty 200 on throwaway signup path).

---

## BUG-ME-001 (P1) — Post-login `/me` Zod failure on omitted collections

| Field | Detail |
|-------|--------|
| **Location** | `web/src/lib/api/auth.ts:13-25`, `web/src/lib/api/client.ts:26-29` |
| **Root cause** | `MeSchema` required nullable keys for omitted Jackson fields; `apiFetch` generic used Zod input type vs output after `.default([])` → Docker `next build` failure on `home/page.tsx`. |
| **Fix** | `.nullish()` on optional ids; `.default([])` / `.default({})` on collections; `apiFetch<S extends z.ZodTypeAny>` returns `z.output<S>`. |
| **Verify** | **Browser:** login → `/home` renders “Hello, {displayName}” without auth wiring banner. **Build:** `docker compose … build web` succeeds. |

**QA status:** **Fixed / verified** (browser landed on `/home` after login).

---

## FINDING-STORAGE-001 (P4, open) — billing/w2 token storage mismatch

| Field | Detail |
|-------|--------|
| **Location** | `web/src/lib/api/billing.ts:4`, `web/src/lib/api/w2.ts` (same pattern) vs login `sessionStorage` |
| **Root cause** | Login stores tokens in **sessionStorage**; billing helpers read **localStorage** → billing flows may appear unauthenticated until aligned. |
| **Fix** | Not in scope of auth wiring audit (documented FE-010). |
| **Verify** | After login, `sessionStorage.accessToken` set; `localStorage.accessToken` null unless manually copied. |

**QA status:** **Open / documented** (no user-visible break on login→home).

---

## BUG-REFRESH-001 (P2) — Refresh HTTP 500 for parent sessions (null `student_id`)

| Field | Detail |
|-------|--------|
| **Location** | `backend/core-api/src/main/java/com/karsaaz/studyloop/identity/application/AuthService.java:267-275` (`refresh` JDBC row mapper) |
| **Root cause** | `Map.of(..., "studentId", rs.getObject("student_id"), ...)` — `Map.of` rejects **null** `student_id` for parent/account sessions → `NullPointerException` → HTTP **500** on `POST /auth/refresh`. |
| **Fix** | Session row mapping uses `HashMap` + `put` (same pattern as other JDBC mappers in `AuthService`); deployed via core-api Docker rebuild (DO-002 / SB-003). |
| **Verify** | Register parent → Mailpit verify → `POST /api/v1/auth/login` → **200** with `refreshToken` → `POST /api/v1/auth/refresh` body `{"refreshToken":"<token>"}` → **200** JSON with `accessToken`, `refreshToken`, `tokenType`, `expiresInSeconds`, `mfaRequired` (not **500**). **2026-09-30 retest:** `qa.refresh.1790754112@studyloop-qa.local` path → refresh **200**. |

**QA status:** **Fixed / verified** (post AuthService NPE fix + core-api rebuild).

---

## SB-002 gate

**SKIPPED** — P0 login and browser E2E pass after FE fixes; no Jackson DTO change required for login contract (see `TokenResponseSerializationTest`).
