# DevOps summary — auth wiring

**Mission:** DO-001 (web rebuild), DO-002 (core-api rebuild after AuthService.refresh NPE fix), DO-003 (auth smoke + stack verify).

## DO-001 — Rebuild `web`

| Step | Result |
|------|--------|
| `docker compose -p studyloop --project-directory . -f infra/docker-compose.yml build web` | **PASS** — Next.js 15.2.4 build + typecheck succeeded (2026-09-30 retry after FE fix) |
| `up -d web caddy` | **PASS** — `studyloop-web-1` recreated and Up; `studyloop-caddy-1` Up on `:8080` |
| Running containers | `NEXT_PUBLIC_API_BASE=http://localhost:8080/api/v1` on `studyloop-web-1`; Caddy `/` HTTP **200**, web `:3000/` HTTP **200** |

**Impact:** New frontend auth/Zod/apiFetch bundle is in the running `web` image.

## DO-002 — Rebuild `core-api`

| Step | Result |
|------|--------|
| `docker compose -p studyloop --project-directory . -f infra/docker-compose.yml build core-api` | **PASS** — Maven package succeeded (~87s compile); image `studyloop-core-api:latest` |
| `up -d core-api` | **PASS** — `studyloop-core-api-1` recreated and Up; `8081→8080` |
| Health `http://localhost:8081/actuator/health` | **200** `{"status":"UP"}` |
| Caddy `:8080` | **UP** — `/` HTTP **200**; `POST /api/v1/auth/login` HTTP **401** `AUTH_INVALID_CREDENTIALS` (API reachable, no credentials in repo) |
| `web` / `caddy` | **running** (unchanged) |

**Impact:** AuthService.refresh NPE fix deployed in running `core-api` container.

## DO-003 — Smoke + verify

| Check | Result |
|-------|--------|
| `POST http://localhost:8080/api/v1/auth/login` | **Reachable** — HTTP **401** with wrong password (post DO-002 rebuild) |
| Caddy `/` | HTTP 200 |
| Web `:3000/` | HTTP 200 |
| Script | **`infra/scripts/auth-smoke.sh`** — executable; expects valid credentials for exit 0 |

## Account status (postgres)

| Email | Status | Email verified |
|-------|--------|----------------|
| murtzamlk@gmail.com | ACTIVE | yes |
| murtzamlk1@gmail.com | ACTIVE | yes |

## Handoff

- **QA:** Use `./infra/scripts/auth-smoke.sh <email> <password>` with real credentials for HTTP 200 + `accessToken`; re-test refresh flow after DO-002.
- **Frontend:** DO-001 unblocked; web image rebuild complete.
