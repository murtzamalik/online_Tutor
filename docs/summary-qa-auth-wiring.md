# QA summary — auth wiring

**Date:** 2026-09-30  
**Stack:** `http://localhost:8080` (Caddy), web image rebuilt per DO-001.

## Results

| Task | Result | Evidence |
|------|--------|----------|
| QA-001 | **PASS** | `POST /auth/login` → **200**, JSON with `accessToken`, `mfaRequired` false (throwaway account). DB: both team emails **ACTIVE** + verified. Wrong password → **401**. |
| QA-002 | **PASS** | `npm test` in `web/` — 7/7 pass (`auth.schema.test.ts` omits `mfaChallengeToken`). Browser login → `/home`, no “Unable to sign in”; `sessionStorage` has `accessToken` + `refreshToken`. |
| QA-003 | **PASS** | Register **201** `{accountId,status}`; Mailpit code; verify-email **200** zero body; account can login. |
| QA-004 | **PASS** (P2 scope) | Forgot password **202** empty **PASS**. Refresh **200** + rotated tokens after DO-002/SB-003 (`AuthService.java:267-275` HashMap fix; retest 2026-09-30). Staff MFA, picture-pin, student register **N/A**. |
| QA-005 | **PASS** | `docs/report-auth-wiring-bugs.md` |

## P0 resolution

**Login 200 → UI error:** **RESOLVED** (FE TokenResponse `.nullish()` + empty-body handling + rebuilt web).

## P2 resolution

**Refresh 500 (parent session):** **RESOLVED** (backend `AuthService.refresh` null-safe session map + core-api rebuild; QA refresh **200**).

## SB-002

**SKIPPED** — QA-002 pass; backend TokenResponse omission contract unchanged.

## Artifacts

- Bug report: `docs/report-auth-wiring-bugs.md`
- Throwaway test account (local only): `qa.throwaway.1790753831@studyloop-qa.local` / password used in QA session (not committed).
