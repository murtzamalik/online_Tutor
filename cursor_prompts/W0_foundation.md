# Cursor prompt — W0: Foundation

You are implementing the Study Loop platform. First re-read `00_START_HERE.md`, `AGENTS.md`, `docs/02_decisions_register.md`, `docs/05_repo_structure_and_standards.md` and the docs named below. Do NOT re-decide anything in the decisions register; if something seems wrong, write it under "Questions" in `docs/CURSOR_UNDERSTANDING.md` and continue with the safest assumption.
Rules: (1) vertical slices, real endpoints, no mocked data on main; (2) every screen has all states + a11y; (3) AI only via the gateway, no personal data in prompts (D-15); (4) numbers/totals in code; (5) update the traceability matrix; (6) tests with each PR; (7) stop at the wave gate and report.

**Read for this wave:** docs 03, 05, 06, 07, 08, 12, 15, 16, 17.

**Scope:**
- Monorepo, CI/CD, Docker Compose (postgres+pgvector, redis, minio, mailpit, caddy), env & secrets
- Flyway V001–V011 migrate clean; DB roles; RLS harness; ERD generated
- `common` (errors RFC7807, ids, money, clock, tracing), ArchUnit module rules, PII-log lint test
- identity skeleton (register/login/refresh/logout, JWT, MFA TOTP scaffolding), audit log writer with hash chain
- `ai-gateway` skeleton: prompt loader → `prompt_version`, routing, redaction pipeline, schema validation, logging, **stub mode with recorded fixtures**; `tutor_gateway` role test
- `embedding-service` (FastAPI + bge-base-en-v1.5) + `/embed` via gateway
- Next.js app shell, tokens.json→Tailwind, Storybook, Shell-03/04/07/09 (nav, auth, states), typed API client from OpenAPI
- OpenAPI generation + catalogue diff CI gate; role-map equality test

**Screens:** see `docs/18_implementation_plan_waves.md` table for W0 and each screen's spec in `docs/screens/`.

**Definition of done:** Gate: `docker compose up` gives a working empty system; all migrations pass; boundary + RLS + PII-log tests green; CI green.

**Output at the end of the wave:** (a) built vs scope list; (b) traceability rows updated; (c) deviations/assumptions; (d) open questions; (e) demo script.

**First action:** produce a task breakdown (epics → tasks) for this wave in `docs/waves/W0_plan.md`; stop only on a genuine blocker, otherwise start implementing in the listed order.
