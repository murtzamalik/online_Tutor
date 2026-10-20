# Documentation index

Study Loop docs are grouped by purpose. Start at the repo root `00_START_HERE.md` or `CURSOR_MASTER_PROMPT.md`.

## Product specification (locked baseline)

Numbered docs `01`–`22` plus:

| Path | Contents |
|------|----------|
| `screens/` | Screen specs by epic |
| `traceability/` | Story → screen matrices |
| `waves/` | Wave plans and gate reports |
| `erd/` | ERD artefacts (generated; PNGs gitignored) |

## Application handoff

| Path | Contents |
|------|----------|
| [`handoff/E2E_GAPS_FOR_COLLEAGUE.md`](handoff/E2E_GAPS_FOR_COLLEAGUE.md) | Open E2E gaps (P0–P2) for the next fix round |
| [`handoff/AI_FIX_ROUND_BUGLIST.md`](handoff/AI_FIX_ROUND_BUGLIST.md) | Prior AI/UI fix-round buglist |
| `handoff/StudyLoop_Client_Status_Update.pdf` | Client status PDF (if present) |

> Local-only demo passwords live in `handoff/LOCAL_DEMO_ACCOUNTS.md` on your machine and are **gitignored** — do not commit.

## QA reports

| Path | Contents |
|------|----------|
| `qa/` | Browser smoke, student deep QA, system QA, retest notes (MD + JSON) |

## Auth-wiring audit trail

| Path | Contents |
|------|----------|
| `auth-wiring/` | Plans, tasks, state, summaries from the auth wiring audit |

## Related repo paths (outside `docs/`)

| Path | Contents |
|------|----------|
| `../api/` | API catalogue + endpoints JSON |
| `../ai_prompts/` | Prompt packs + index |
| `../db/migrations/` | Flyway migrations |
| `../infra/` | Docker Compose, Caddy, LiteLLM, scripts |
| `../supporting_docs/` | Original client/planning documents |
