# DevOps state — Study Loop (auth wiring)

**Updated:** 2026-09-30  
**Project:** `studyloop`  
**Compose:** `infra/docker-compose.yml` (run from repo root with `--project-directory .`)

## Stack status

| Service | Container | Status | Notes |
|---------|-----------|--------|-------|
| caddy | studyloop-caddy-1 | Up | `:8080` → API + web proxy |
| web | studyloop-web-1 | Up (rebuilt) | `:3000`; env `NEXT_PUBLIC_API_BASE=http://localhost:8080/api/v1` |
| core-api | studyloop-core-api-1 | Up | `:8081` direct |
| postgres | studyloop-postgres-1 | Up (healthy) | `:5432` |
| redis | studyloop-redis-1 | Up (healthy) | |
| ai-gateway | studyloop-ai-gateway-1 | Up | |
| embedding-service | studyloop-embedding-service-1 | Up | |
| mailpit | studyloop-mailpit-1 | Up (healthy) | `:8025` UI |
| minio | studyloop-minio-1 | Up | |

## Task completion

| ID | Status | Detail |
|----|--------|--------|
| DO-001 | **Done** | `docker compose -p studyloop build web` passed; `up -d web caddy` recreated web with new image. |
| DO-002 | Skipped | Per mission (no core-api prod change). |
| DO-003 | Done | Login via Caddy returns **401** for unknown/wrong password (endpoint healthy); Caddy + web HTTP 200. |

## Auth wiring

- Public API: `http://localhost:8080/api/v1/*` (Caddy)
- Login: `POST /api/v1/auth/login`
- Smoke script: `infra/scripts/auth-smoke.sh` (requires EMAIL + PASSWORD args; no secrets in repo)

## Rebuild commands (reference)

```bash
cd online_tutor_build_pack
docker compose -p studyloop --project-directory . -f infra/docker-compose.yml build web
docker compose -p studyloop --project-directory . -f infra/docker-compose.yml up -d web caddy
```

## Blockers

- None for auth wiring DevOps tasks. QA login **200** still needs valid passwords via secret store / team.
