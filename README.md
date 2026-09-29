# Study Loop — build pack + application monorepo

UK exam-prep platform. Spec lives in `docs/`, `api/`, `db/`, `ai_prompts/`. Application code: `backend/`, `web/`, `embedding-service/`, `infra/`.

See `00_START_HERE.md`, `AGENTS.md`, and `docs/waves/W0_plan.md`.

## Quick start (Wave 0)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d postgres redis minio mailpit
# Wait for healthy postgres, then:
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) mvn -q verify
cd ../web && npm ci && npm run build
docker compose -f infra/docker-compose.yml up --build
```

## Layout

| Path | Role |
|---|---|
| `backend/` | Maven multi-module: `common`, `core-api`, `ai-gateway`, `testkit` |
| `web/` | Next.js 15 App Router |
| `embedding-service/` | FastAPI embeddings |
| `infra/` | Docker Compose, Caddy, scripts |
| `db/migrations/` | Flyway V001–V011 (forward-only) |
