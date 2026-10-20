# Session Notes — Auth Wiring Audit (2026-09-30)

## Summary

Study Loop completed an end-to-end auth wiring audit across the Next.js web app, Spring Boot `core-api`, Docker stack, and QA. P0 login (HTTP 200 but UI “Unable to sign in”) and P2 refresh (HTTP 500 for parent sessions with null `student_id`) were fixed and verified. Docker images for `web` and `core-api` were rebuilt; QA passed login, `/me`, verify-email, forgot-password, and refresh flows. Backend Jackson DTO changes (SB-002) were skipped after QA-002 passed.

## What Was Built / Fixed

- **BUG-LOGIN-001 (P0)** — `TokenResponseSchema` aligned with Jackson `non_null` (`.nullish()` token fields); shared schema in `auth-extra.ts`; `SchemaParseError` + `safeParse` in `client.ts`; login page error branching — `web/src/lib/api/auth.ts`, `auth-extra.ts`, `client.ts`, `web/src/app/(auth)/login/page.tsx`
- **BUG-VERIFY-001 (P1)** — `EmptyResponseSchema` and empty-body handling in `apiFetch`; `verifyEmail` uses empty schema — `web/src/lib/api/client.ts`, `auth-extra.ts`
- **BUG-ME-001 (P1)** — `MeSchema` `.nullish()` / collection defaults; `apiFetch` returns `z.output<S>` — `web/src/lib/api/auth.ts`, `client.ts`
- **BUG-REFRESH-001 (P2)** — `AuthService.refresh` session row mapping: `HashMap` + `put` instead of `Map.of` for null `student_id` — `backend/core-api/.../AuthService.java` (lines ~267–275)
- **SB-001** — `TokenResponseSerializationTest` documents omitted vs present JSON keys for login vs MFA challenge — `backend/core-api/src/test/java/com/karsaaz/studyloop/identity/TokenResponseSerializationTest.java`
- **Frontend helpers/tests** — `EmptyResponseSchema`, `refreshSession`, `logout`, `resetPassword`, `resendVerificationEmail`; `web/src/lib/api/auth.schema.test.ts`, `web/src/lib/api/client.test.ts`
- **DevOps** — DO-001: rebuild `web` + `up -d web caddy`; DO-002: rebuild `core-api` + health 200; DO-003: auth reachability + `infra/scripts/auth-smoke.sh`
- **Documentation** — `docs/report-auth-wiring-bugs.md` (QA-005)

## Decisions Made

- **Decision:** Fix frontend Zod contracts for omitted Jackson keys rather than change backend `AuthDtos` (SB-002).
  **Rationale:** QA-002 and browser E2E passed; `TokenResponseSerializationTest` documents contract; no DTO override needed.
  **Made by:** Spring Boot lead / QA gate.

- **Decision:** SB-002 marked **SKIPPED-PENDING-QA** → **SKIPPED** after QA-002 pass.
  **Rationale:** Revisit only if QA fails after FE fixes; it did not.
  **Made by:** Spring Boot lead.

- **Decision:** FINDING-STORAGE-001 (billing/w2 `localStorage` vs login `sessionStorage`) out of scope for this audit.
  **Rationale:** FE-010 scan; no break on login→home; separate storage wiring follow-up.
  **Made by:** Frontend lead / documented in bug report.

## Agents Involved

- Orchestrator
- Frontend lead (FE-001–FE-010, Zod/client/login fixes, tests)
- Spring Boot lead (SB-001, SB-003; SB-002 skipped)
- DevOps lead (DO-001, DO-002, DO-003)
- QA lead (QA-001–QA-005)
- Architect (roster completed per master state)

## Known Issues / Unresolved Items

- **FINDING-STORAGE-001 (P4)** — `web/src/lib/api/billing.ts`, `web/src/lib/api/w2.ts` read `localStorage` for tokens while login uses `sessionStorage` — Status: **open / deferred** (documented FE-010)
- **SB-002** — Backend DTO/Jackson override — Status: **skipped** (no change unless contract regressions)
- **QA-004 partial scope** — Staff MFA, picture-pin, student register — Status: **N/A** in this run

## Dependencies & External Contracts

- **API base** — `NEXT_PUBLIC_API_BASE=http://localhost:8080/api/v1` on running `web` container
- **Stack** — Caddy `:8080`, web `:3000`, `core-api` `8081→8080`, Postgres, Mailpit `:8025` for verify-email QA
- **TokenResponse JSON** — Success login omits `mfaChallengeToken`; MFA challenge omits `accessToken`/`refreshToken` (Jackson `non_null`)
- **Smoke script** — `./infra/scripts/auth-smoke.sh <email> <password>` (requires real credentials; not in repo)

## Key File Paths

| Area | Path |
|------|------|
| Frontend auth API | `web/src/lib/api/auth.ts`, `auth-extra.ts`, `client.ts` |
| Login UI | `web/src/app/(auth)/login/page.tsx` |
| Tests | `web/src/lib/api/auth.schema.test.ts`, `client.test.ts` |
| Backend refresh fix | `backend/core-api/.../identity/application/AuthService.java` |
| Serialization test | `backend/core-api/src/test/java/.../TokenResponseSerializationTest.java` |
| Compose / smoke | `infra/docker-compose.yml`, `infra/scripts/auth-smoke.sh` |
| Summaries / report | `docs/summary-*-auth-wiring.md`, `docs/report-auth-wiring-bugs.md` |

## Next Steps (Suggested)

- Align billing/w2 token reads with session storage (or shared auth token helper) for FINDING-STORAGE-001
- Run `auth-smoke.sh` in CI with injected test credentials if automated regression is desired
- Re-open SB-002 only if frontend parse failures reappear against live TokenResponse payloads
