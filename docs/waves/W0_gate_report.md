# W0 Gate Report — Foundation

**Date:** 29 Sep 2026  
**Wave:** W0  
**Verdict:** **PASS (with documented local deviations)**

## Gate checklist

| Criterion | Result | Evidence |
|---|---|---|
| `docker compose` empty system / infra up | PASS | `infra/docker-compose.yml` brings up postgres+pgvector, redis, minio, mailpit, caddy, core-api, ai-gateway, embedding-service, web |
| All migrations pass (V001–V011 + V012) | PASS | `infra/scripts/verify_db_gate.sh` → Flyway applied 12 migrations to empty DB |
| Boundary test (`tutor_gateway` cannot read learner tables) | PASS | `NOTICE: BOUNDARY OK: student_profile denied` in verify script |
| RLS harness (school A ≠ school B) | PASS | `RLS OK school A` / `RLS OK school B empty` |
| PII-log lint | PASS | `PiiLogLintTest`, `PiiPatternsTest` |
| ArchUnit / no vendor SDKs in feature modules | PASS | `ArchUnitModuleTest` |
| Role-map equality vs `api/endpoints.json` | PASS | `CatalogueRoleMapTest` + `infra/scripts/check_catalogue_roles.py` (17 AUTH annotations) |
| Unit tests (Maven) | PASS | `mvn test` (IT excluded by default; profile `-Pintegration`) |
| Embedding service tests | PASS | `pytest` 2 passed |
| Web build + Shell-07 unit test | PASS | `npm run build`, `npm test` |
| Testcontainers IT on this laptop | FAIL / DEFERRED | Docker Desktop API client mismatch with Testcontainers 1.20/1.21; compose harness is the local gate. CI runs `-Pintegration` on Ubuntu. |

## Built vs scope

**Built**
- Monorepo layout (`backend/`, `web/`, `embedding-service/`, `infra/`, `.github/workflows/`)
- Docker Compose stack + Caddy + `.env.example`
- Flyway V001–V011 unchanged; **V012** login-role grants only
- `common`: RFC7807 problems, money pence, ids, clock, tracing, PII patterns
- `core-api` identity skeleton: AUTH-01…17 (OIDC/picture-PIN/student-register return `FEATURE_DISABLED` 501)
- JWT access + rotating refresh, MFA TOTP enroll/verify/recovery scaffold, audit hash-chain writer
- `ai-gateway`: service-token auth, prompt loader, redaction, stub fixtures, GW-01 run + GW-08 embed proxy
- `embedding-service`: FastAPI `/health` + `/embed` (deterministic 768-d stub when weights absent)
- Next.js shell: Shell-03 nav, Shell-04 login/forgot, Shell-07 states (+ Storybook stories), Shell-09 staff MFA
- Typed Zod client wrapper; tokens.json → Tailwind
- CI workflow + catalogue role-map script + DB gate script
- Traceability `w0_status=W0_BUILT` for Shell-03/04/07/09

**Partial / deferred within W0**
- Full OpenAPI YAML artefact diff vs every catalogue path (role-map gate in place; springdoc enabled; export automation light)
- Live Anthropic/Google calls (stub mode default — intentional)
- OIDC + picture PIN wired UIs (contract endpoints present as 501 until W1)
- Testcontainers green on macOS Docker Desktop (compose harness substitutes locally)

## Deviations / assumptions
1. **V012** added for LOGIN role membership — does not edit V001–V011.
2. Local AI gateway defaults to **stub** (`AI_GATEWAY_STUB=true`); embeddings default to deterministic stub vectors.
3. AUTH-13/14/15/16 return RFC7807 `FEATURE_DISABLED` rather than fake success (D-14: deferred, not deleted).
4. MFA challenge store is in-memory (single-node W0); Redis-backed challenges in later hardening.
5. Java target **17** (available JDK); Spring Boot 3.4.4.
6. K-01 remains flag-off (seed unchanged).

## Open questions
- None blocking W1. Raise in `docs/CURSOR_UNDERSTANDING.md` if legal wants OIDC providers named for pilot before B-01.
- Confirm Docker Desktop / Testcontainers API alignment for local IT (or always use `verify_db_gate.sh`).

## Demo script (≈10 min)

1. `cp .env.example .env && ./infra/scripts/verify_db_gate.sh` — show migrations + BOUNDARY OK + RLS OK.  
2. `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) mvn -q test` — unit + ArchUnit + role-map + PII lint green.  
3. `docker compose -f infra/docker-compose.yml up --build` (or run core-api + web locally).  
4. Open `/login` (Shell-04): register is API-only in W0; use SQL or `POST /api/v1/auth/register-parent` then verify-email code from Mailpit (`localhost:8025`), then login → `/home` shows Shell-03 nav + `/me` data.  
5. Staff path: set `mfa_required` on an account, login → MFA challenge UI on `/staff/login` (Shell-09).  
6. `curl -H "X-Service-Token: $GATEWAY_SERVICE_TOKEN" -d '{"promptId":"P-MK-01","variables":{"answer":"H2O"},"requestId":"demo-1"}' http://localhost:8090/gateway/v1/run` — stub fixture.  
7. `curl -X POST http://localhost:8100/embed -d '{"texts":["mole"]}' -H 'content-type: application/json'` — 768-d vector.  
8. Storybook: `cd web && npm run storybook` — Shell-07 states.

## Do not start W1 until architect sign-off on this report.
