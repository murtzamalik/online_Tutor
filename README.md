# Study Loop (online_Tutor)

UK exam-prep platform — build pack + application monorepo.

**Remote:** https://github.com/murtzamalik/online_Tutor

## Quick start (Docker)

```bash
cp .env.example .env
# Fill API keys / secrets in .env (never commit .env)

docker compose -p studyloop --project-directory . -f infra/docker-compose.yml up -d --build
```

App (via Caddy): http://localhost:8080  
Mailpit: http://localhost:8025

See `00_START_HERE.md`, `AGENTS.md`, and [`docs/README.md`](docs/README.md).

## Layout

| Path | Role |
|------|------|
| `backend/` | Maven multi-module: `common`, `core-api`, `ai-gateway`, `testkit` |
| `web/` | Next.js 15 App Router |
| `embedding-service/` | FastAPI embeddings |
| `infra/` | Docker Compose, Caddy, LiteLLM, scripts |
| `db/migrations/` | Flyway (forward-only) |
| `docs/` | Spec + QA + handoff ([index](docs/README.md)) |
| `api/` | API catalogue |
| `ai_prompts/` | Prompt packs |

## Docs map (short)

| Folder | Purpose |
|--------|---------|
| `docs/01`–`22` | Locked product specification |
| `docs/handoff/` | Colleague fix gaps, AI buglist, client PDF |
| `docs/qa/` | E2E / smoke / student deep QA reports |
| `docs/auth-wiring/` | Auth wiring audit trail |
| `docs/screens/`, `waves/`, `traceability/` | Screens, wave gates, matrices |

## Security notes

- `.env` is gitignored — use `.env.example` as the template.
- Large past-paper ZIP / extracted binaries are gitignored under `data/past_papers/`.
- Local demo account passwords file is gitignored (`docs/handoff/LOCAL_DEMO_ACCOUNTS.md`).
