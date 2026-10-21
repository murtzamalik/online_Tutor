# DevOps Tasks — Auth Wiring Audit

**Lead:** devops-lead

---

## DevOps TODO

- [ ] DO-001: Rebuild studyloop web — [SEQUENTIAL:depends-on-FE-002,FE-003,FE-004,FE-005,FE-006,FE-007]
- [ ] DO-002: Rebuild core-api if SB-002 — [SEQUENTIAL:depends-on-SB-002]
- [ ] DO-003: Auth smoke script + stack verify — [SEQUENTIAL:depends-on-DO-001]

---

TASK-DO-001: Rebuild Docker web image after frontend auth fixes
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-002,FE-003,FE-004,FE-005,FE-006,FE-007]
Assigned-to: devops-lead
Target-dev: DevOps (compose)

## Description
Rebuild and restart the `web` service so browser uses fixed client bundles with `NEXT_PUBLIC_API_BASE=http://localhost:8080/api/v1`.

## Implementation Strategy
From repo root `online_tutor_build_pack/infra`:
```bash
docker compose -p studyloop build web
docker compose -p studyloop up -d web caddy
```
Verify:
- `curl -sf http://localhost:3000/` returns HTML (optional)
- Web container env shows `NEXT_PUBLIC_API_BASE=http://localhost:8080/api/v1` per `docker-compose.yml` lines 114-117

Do not rebuild entire stack unless needed for time savings; `core-api` unchanged in happy path.

## Interface Contracts
- Public API via Caddy: `http://localhost:8080/api/v1/*`
- Web direct: `http://localhost:3000`

## Acceptance Criteria
- **When** rebuild completes,
- **Then** `docker compose -p studyloop ps` shows `web` and `caddy` running.
- **When** browser loads `/login` via Caddy proxy (if configured) or `:3000`,
- **Then** login request targets port 8080 API base (check Network tab).

## Files to Create / Modify
- None (ops only); reference `infra/docker-compose.yml`, `infra/Caddyfile`

## Relevant Context
- Frontend auth tasks merged

## TODO Template
- [ ] build web
- [ ] up -d web caddy
- [ ] Confirm container health

---

TASK-DO-002: Rebuild core-api after SB-002 only
Status: pending
Parallelism: [SEQUENTIAL:depends-on-SB-002]
Assigned-to: devops-lead
Target-dev: DevOps (compose)

## Description
Rebuild `core-api` image only when backend auth DTO/Jackson change lands.

## Implementation Strategy
```bash
cd online_tutor_build_pack/infra
docker compose -p studyloop build core-api
docker compose -p studyloop up -d core-api caddy
```
Wait for health: `curl -sf http://localhost:8081/api/v1/...` or login via 8080.

## Acceptance Criteria
- **When** SB-002 merged,
- **Then** new core-api container running and login curl returns 200.

## Files to Create / Modify
- None

## Relevant Context
- TASK-SB-002

## TODO Template
- [ ] build core-api
- [ ] restart dependent services
- [ ] curl login smoke

---

TASK-DO-003: Auth curl smoke script and stack health
Status: pending
Parallelism: [SEQUENTIAL:depends-on-DO-001]
Assigned-to: devops-lead
Target-dev: DevOps (compose)

## Description
Add a small executable smoke script for QA/dev verifying auth endpoints against Caddy 8080, and document stack bring-up.

## Implementation Strategy
1. CREATE `infra/scripts/auth-smoke.sh` (bash, `set -euo pipefail`):
   - Args: `EMAIL` `PASSWORD` (no default secrets in repo).
   - `curl -sS -w "\n%{http_code}" -X POST http://localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"`
   - Assert HTTP code 200; body contains `"accessToken"`.
   - Optional: `POST verify-email` dry-run not included (needs code).
2. Script header comment: full stack start:
   ```bash
   cd infra && docker compose -p studyloop up -d --build
   ```
3. `chmod +x infra/scripts/auth-smoke.sh`

## Interface Contracts
Login: `POST http://localhost:8080/api/v1/auth/login`

## Acceptance Criteria
- **Given** stack up and valid ACTIVE credentials passed as args,
- **When** `./infra/scripts/auth-smoke.sh email pass` runs,
- **Then** exit 0.
- **Given** wrong password,
- **When** script runs,
- **Then** exit non-zero (401).

## Files to Create / Modify
- CREATE: `infra/scripts/auth-smoke.sh`

## Relevant Context
- QA-001 will use same curl patterns
- Mailpit: `http://localhost:8025`

## TODO Template
- [ ] Write script
- [ ] Test locally with ACTIVE account
- [ ] Hand script path to QA
