# W0 Plan — Foundation

**Wave:** W0 · Foundation  
**Gate:** `docker compose up` → working empty system; migrations pass; boundary + RLS + PII-log tests green; CI green.  
**Do not start W1 until gate report is signed off.**

## Scope checklist (from `docs/18` + `cursor_prompts/W0_foundation.md`)

| # | Epic | Deliverable |
|---|---|---|
| E1 | Monorepo & CI | Layout per `docs/05`; GitHub Actions (build/test/lint/migrate-check/OpenAPI diff) |
| E2 | Local infra | Docker Compose: postgres+pgvector, redis, minio, mailpit, caddy; `.env.example`; secrets not committed |
| E3 | Database | Flyway V001–V011 migrate clean; login roles for `tutor_app` / `tutor_gateway`; RLS harness; ERD script |
| E4 | `common` | RFC7807 ProblemDetail, UUIDs, money (pence), Clock, tracing/correlation id; ArchUnit module rules; PII-log lint test |
| E5 | Identity skeleton | AUTH-01 register-parent, AUTH-04 login, AUTH-09 refresh, AUTH-10 logout, AUTH-11/12 password, AUTH-05–08 MFA TOTP scaffold, AUTH-17 `/me`; JWT; audit hash-chain writer |
| E6 | `ai-gateway` | Prompt loader → `prompt_version`, routing, redaction, schema validation, logging; stub mode + fixtures; GW-01/08; `tutor_gateway` role test |
| E7 | `embedding-service` | FastAPI + bge-base-en-v1.5 (ONNX or stub vector in local); `/embed` via gateway GW-08 |
| E8 | Web shell | Next.js 15 app shell; `tokens.json` → Tailwind; Storybook; Shell-03/04/07/09; typed API client |
| E9 | Contracts | OpenAPI from springdoc; catalogue diff CI; role-map equality test vs `api/endpoints.json` |

## Task breakdown

### E1 — Monorepo & CI
- [ ] T1.1 Create `backend/`, `web/`, `embedding-service/`, `infra/`, `.github/workflows/`
- [ ] T1.2 Root README + `.gitignore` (secrets, `.env`, build artefacts)
- [ ] T1.3 CI: Maven test, npm lint/test, Flyway migrate-check, OpenAPI↔catalogue diff, Semgrep placeholder

### E2 — Infra
- [ ] T2.1 `infra/docker-compose.yml` (pgvector, redis, minio, mailpit, caddy, app services)
- [ ] T2.2 `infra/Caddyfile`, init scripts for DB roles/passwords
- [ ] T2.3 `.env.example` documenting required secrets

### E3 — Database
- [ ] T3.1 Wire Flyway to `db/migrations` (V001–V011 unchanged)
- [ ] T3.2 Post-migrate role LOGIN grants via infra init (passwords from env — not in migrations)
- [ ] T3.3 Integration test: migrate empty DB
- [ ] T3.4 RLS harness: school A teacher cannot see school B rows
- [ ] T3.5 ERD generation script (`infra/scripts/generate-erd.sh`)

### E4 — `common` + platform skeleton
- [ ] T4.1 Problem+JSON error model + exception handler
- [ ] T4.2 Money (`long` pence), Ids, Clock bean, TraceId filter
- [ ] T4.3 ArchUnit: cross-module only via `api` packages; no Anthropic/Google SDK in feature modules
- [ ] T4.4 PII-log lint: fail if email/name patterns appear in captured logs

### E5 — Identity
- [ ] T5.1 Register parent (AUTH-01) + email verification stub via Mailpit (AUTH-02 minimal for activate)
- [ ] T5.2 Login / refresh / logout (AUTH-04/09/10) with rotating refresh + reuse detection
- [ ] T5.3 Password forgot/reset (AUTH-11/12) — always 202 on forgot
- [ ] T5.4 MFA TOTP enroll/verify/recovery (AUTH-05–08) scaffolding
- [ ] T5.5 `GET /me` (AUTH-17) bootstrap
- [ ] T5.6 Audit log writer with hash chain on login / MFA / password events
- [ ] T5.7 Role-map annotation + equality test for AUTH endpoints

### E6 — AI Gateway
- [ ] T6.1 Spring Boot `ai-gateway` service; service-token auth
- [ ] T6.2 Prompt loader (filesystem → optional DB sync); stub vendor with recorded fixtures
- [ ] T6.3 Redaction pipeline (regex email/phone/name-like); schema validate
- [ ] T6.4 GW-01 run, GW-08 embed proxy; logging to AI tables as `tutor_gateway`
- [ ] T6.5 Boundary test: `tutor_gateway` SELECT on `student_profile` fails

### E7 — Embedding service
- [ ] T7.1 FastAPI `/health`, `/embed` returning 768-d vectors
- [ ] T7.2 Local mode: deterministic hash-embedding when model weights absent
- [ ] T7.3 Dockerfile + compose wire-up; gateway calls service

### E8 — Web
- [ ] T8.1 Next.js 15 App Router route groups; tokens → Tailwind
- [ ] T8.2 Shell-07 state components + Storybook
- [ ] T8.3 Shell-04 `/login` + forgot/reset wired to AUTH-04/09/10/11/12
- [ ] T8.4 Shell-09 `/staff/login` + MFA challenge/enroll UI wired to AUTH-05–08
- [ ] T8.5 Shell-03 app layout nav (role-aware from `/me`)
- [ ] T8.6 Typed client from OpenAPI (generated stub + fetch wrapper)

### E9 — Gate evidence
- [ ] T9.1 Update `docs/traceability/traceability_matrix.csv` for Shell-03/04/07/09 + W0 infra rows
- [ ] T9.2 Demo script + `docs/waves/W0_gate_report.md`
- [ ] T9.3 Update `docs/CURSOR_UNDERSTANDING.md` living notes for W0

## Implementation order
1. Plan (this file) → commit  
2. Infra + Flyway migrate → commit  
3. `common` + identity vertical slice (DB→API→tests) → commit  
4. ai-gateway + embedding + boundary tests → commit  
5. Web shell screens → commit  
6. CI + contract gates + gate report → commit  

## Screens in W0 (UI)
| ID | Route | Notes |
|---|---|---|
| Shell-03 | layout | Nav shell; `/me` bootstrap |
| Shell-04 | `/login` | Parent/student login, forgot/reset |
| Shell-07 | components | Empty/loading/error/offline/forbidden |
| Shell-09 | `/staff/login` | Staff MFA |

AUTH-13/14 (OIDC) and AUTH-15 (picture PIN) remain stubbed-as-contract (501 Feature Deferred) until W1 B-11 / Shell-04 OIDC — documented as deviation under flags, not deleted.

## Assumptions (safest)
- Local AI gateway runs in **stub mode** by default (`AI_GATEWAY_STUB=true`).
- Embedding model weights optional locally; deterministic 768-d fallback when missing.
- OIDC providers not configured in local → endpoints return RFC7807 `FEATURE_DISABLED`.
- K-01 gamification flag remains off (seed already).
- Java build targets **17** (available JDK); Spring Boot 3.4.x.
