# AGENTS.md — rules for every AI coding agent working in this repo

You are building **Study Loop** (placeholder brand): a UK exam-prep platform (AI tutor, adaptive practice, instant marking, parents & schools). The **spec is in this repo** — read `00_START_HERE.md` first, then `docs/`. This file is the short, non-negotiable rule set.

## Non-negotiables
1. **AI data boundary (D-15):** no personal data (name, DOB, email, school, stable user id, free-text identity) ever reaches an AI vendor. All AI calls go through `ai-gateway` via `gatewayclient`. Never import an Anthropic/Google SDK in feature code. The `tutor_gateway` DB role must not read learner tables.
2. **Numbers in code (D-26, B-15):** mark totals, numeric answers, mastery, grades, money and dates are computed by deterministic code, never by a model.
3. **Spec is locked (D-14):** do not remove or reinterpret a client-stated requirement. Deferred = feature flag, not deletion. Decisions in `docs/02_decisions_register.md` are final; raise questions in `docs/CURSOR_UNDERSTANDING.md`.
4. **Wired, not mocked:** every screen uses real endpoints from `api/API_CATALOGUE.md`; every endpoint has role checks equal to the catalogue, tests, and OpenAPI. No `TODO` stubs on main.
5. **Migrations are forward-only** (`db/migrations`); never edit an applied file; add `V012+`.
6. **Children's data:** privacy-by-default (AADC), no third-party trackers in learner areas, no dark patterns, no streak-loss/urgency mechanics (gamification is Phase 2, flag off).
7. **Safety fails closed:** if the safety classifier is unavailable, learner-facing tutor chat pauses. Safeguarding responses are scripted (`ai_prompts/safety/safeguarding_templates.md`), never model-generated.
8. **Logs/traces contain ids only** — no personal data or learner free text.
9. **Prompts are versioned assets** in `ai_prompts/`; change them via PR + eval; only one LIVE version per prompt.
10. **Tests with every change**; accessibility AA; all UI states (loading/empty/error/offline/forbidden).

## Where things are
Spec map → `00_START_HERE.md` · Screens → `docs/screens/` · Endpoints → `api/API_CATALOGUE.md` · Story trace → `docs/traceability/` · Prompts → `ai_prompts/PROMPT_INDEX.md` · Schema → `db/migrations/` · Waves → `docs/18_implementation_plan_waves.md`.

## Working style
Plan → implement vertical slice → test → update traceability → report. Ask (in `docs/CURSOR_UNDERSTANDING.md` → *Questions*) instead of guessing on legal/pricing/safeguarding matters; choose the safest option meanwhile.
