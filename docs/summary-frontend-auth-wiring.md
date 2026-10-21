# Frontend Auth Wiring — Summary

## Bugs found and fixed

| Location | Root cause | Fix |
|----------|------------|-----|
| `web/src/lib/api/auth.ts:4-11` | `TokenResponseSchema` used `z.string().nullable()` on token fields; Jackson `non_null` **omits** keys (e.g. `mfaChallengeToken` on success login). Missing key ≠ null → `ZodError` in `apiFetch` → login catch showed generic error despite HTTP 200. | Switched token fields to `.nullish()`, `expiresInSeconds` to `z.coerce.number()`, defaults on `tokenType` / `mfaRequired`. |
| `web/src/lib/api/client.ts:47` | `schema.parse(json)` threw raw `ZodError`; indistinguishable from network failures in UI. | `safeParse` + `SchemaParseError`; dev-only issue logging (no token values). |
| `web/src/lib/api/auth-extra.ts:29-36` | Duplicate strict inline `TokenResponseSchema` (same omission bug as login). | Import shared `TokenResponseSchema` from `auth.ts`. |
| `web/src/lib/api/auth-extra.ts:21` | `verifyEmail` used `z.any().optional()` — inconsistent with empty 200 bodies. | `EmptyResponseSchema`. |
| `web/src/lib/api/auth.ts:13-25` | `MeSchema` nullable fields required keys; omitted collections could fail post-login `/me`. | `.nullish()` on ids/email/studentId; `.default([])` / `.default({})` on collections/flags. |
| `web/src/app/(auth)/login/page.tsx:40` | Catch treated all non-`ApiError` as "Unable to sign in." (masked P0 parse failure). | Branch on `SchemaParseError` vs unknown. |
| `web/src/lib/api/client.ts:26-29` | `apiFetch` typed `Promise<T>` from `z.ZodType<T>` used Zod **input** type; after FE-005 `MeSchema` defaults, `z.infer<MeSchema>` (output) requires `roles`/`children` arrays but `getMe()` was typed with optional fields → Docker `next build` failed at `home/page.tsx:35` (`setMe(profile)`). | Generic `apiFetch<S extends z.ZodTypeAny>` returns `Promise<z.output<S>>`; `parseResponse` returns `z.output<S>`. |

## FE-001 evidence (no live 200 — wrong password on curl)

Reproduced locally with Jackson-shaped fixture (no `mfaChallengeToken` key):

- **Before:** `ZodError` path `mfaChallengeToken`, expected string, received undefined.
- **After:** `TokenResponseSchema.parse(fixture)` succeeds (`auth.schema.test.ts`).

## FE-010 scan (settings / billing / w2)

- **settings.ts:** `changePassword`, `revokeSession` — void/empty OK; aligned to `EmptyResponseSchema`. `patchMe` returns JSON `MeResponse` — `z.record` OK.
- **billing.ts:** All callers use `.passthrough()` / loose objects — no empty-body void mismatch found.
- **w2.ts:** Predominantly `z.any()` — no strict-object empty-body risk in auth audit scope.
- **Follow-up (not fixed):** `billing.ts` / `w2.ts` read `localStorage` for token; login stores `sessionStorage` — separate storage wiring issue.

## New helpers / tests

- `EmptyResponseSchema`, `refreshSession`, `logout`, `resetPassword`, `resendVerificationEmail`
- `web/src/lib/api/auth.schema.test.ts`, `web/src/lib/api/client.test.ts`

## Verify steps

1. `cd web && npm test` — all tests pass.
2. Rebuild web Docker image (DO-001).
3. Browser: ACTIVE parent login → no "Unable to sign in"; `sessionStorage` has `accessToken`; redirect `/home`.
4. curl: `POST http://localhost:8080/api/v1/auth/login` with valid credentials → JSON without null keys parses via `TokenResponseSchema`.

## Docker rebuild web

**Yes** — Next.js bundle must include updated `web/src/lib/api/*` and auth pages.
