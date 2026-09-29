# 05 · Repository Structure & Engineering Standards

## Monorepo layout (created in Wave 0; the *build pack* folder is copied into `docs/`, `ai_prompts/`, `db/`, `api/`, `data/`)
```
studyloop/
├─ AGENTS.md  .cursor/rules/*.mdc            # agent rules (from pack)
├─ docs/                                     # this pack's docs (read-only spec; changes via PR + decision log)
├─ ai_prompts/                               # prompts + schemas (source of truth; loaded to prompt_version)
├─ api/                                      # endpoints.json, screens.json, API_CATALOGUE.md; openapi.yaml generated
├─ db/migrations/                            # Flyway V001..V011 (+V012+)
├─ data/                                     # past_papers manifest, seeds
├─ backend/                                  # Maven multi-module
│  ├─ pom.xml  (parent, BOM, enforcer)
│  ├─ core-api/                              # modular monolith (modules per 03 §2)
│  ├─ ai-gateway/                            # separate Spring Boot app
│  ├─ voice-service/                         # Spring Boot WebSocket
│  ├─ common/                                # error model, ids, money, time, tracing
│  └─ testkit/                               # Testcontainers base, fixtures, gateway stub
├─ embedding-service/                        # Python FastAPI + ONNX bge-base-en-v1.5
├─ web/                                      # Next.js 15
│  ├─ src/app/(public)|(auth)|(parent)|(student)|(school)|(staff)/…
│  ├─ src/components/{ui,domain}/  src/lib/{api,auth,flags,a11y}/  src/styles/tokens.json
│  └─ e2e/ (Playwright)  .storybook/
├─ mobile/                                   # later phase (ios/, android/)
├─ infra/                                    # docker-compose*.yml, Caddyfile, grafana, scripts
└─ .github/workflows/ (or GitLab CI)         # build, test, lint, sast, image scan, migrate-check
```

## Backend standards
- Java 21, Spring Boot 3.x, Maven; `-Xlint`, ErrorProne, Checkstyle/Spotless (google-java-format), SpotBugs; JaCoCo ≥ 80% on `marking`, `mastery`, `billing`, `identity`, `safety` (critical modules ≥ 90% branch on decision logic).
- Package by module (`api`, `application`, `domain`, `infra`). Only `api` is importable across modules (ArchUnit tests fail the build otherwise).
- Errors: RFC 7807 `application/problem+json` with stable `code` (`AUTH_INVALID_CREDENTIALS`, `CONSENT_REQUIRED`, `ENTITLEMENT_REQUIRED`, `RATE_LIMITED`, …). Never leak stack traces or PII.
- Validation with Jakarta Validation at the edge + domain invariants; idempotency keys (`Idempotency-Key`) on payment and submit endpoints.
- Time: `Clock` injected; UTC in DB; parent timezone stored on account for scheduling.
- Money: `long pence` + ISO currency; never floating point. Scientific values: `BigDecimal` (MathContext 12).
- Logging: JSON, correlation id, **no personal data, no free-text learner content**; log ids only. PII lint test scans log output in tests.
- Config: `application.yml` + env; secrets never in repo; feature flags read from DB (`feature_flag`) with 30 s cache.
- Jobs: JobRunr; every job idempotent; dead-letter table + alert.
- OpenAPI 3.1 generated (springdoc) and diffed in CI against `api/endpoints.json` (fail on undeclared endpoints/roles).

## Frontend standards
- TypeScript strict; ESLint + Prettier; no `any` (except generated types); Zod schemas for every API response (generated from OpenAPI, typed client).
- Server Components for public/SEO pages; client components for interactive practice/tutor. TanStack Query for data; SSE hooks for marking/tutor; React Hook Form + Zod for forms.
- Design tokens from `tokens.json` (see 15) → Tailwind theme; Storybook stories for every UI component with a11y addon; Playwright e2e per flow; axe checks in CI.
- Feature-flag gating via `useFlag()` (from `/api/v1/me` bootstrap); role gating in layouts + server checks (never trust the client).
- Analytics/telemetry: first-party events only (`ENG-01`), no third-party trackers for logged-in child areas (AADC).

## Git & delivery
Trunk-based with short-lived branches; PR template requires: story/screen IDs, tests, migration note, prompt-version note, security/PII checklist. Conventional commits. Migrations: forward-only, reviewed by architect; never edit applied files. CI gates: build, unit, integration (Testcontainers), contract (OpenAPI diff), a11y, SAST (Semgrep), dependency + image scan, migration dry-run on empty and on snapshot DB.
Definition of Done (per screen): wired to real endpoints (no mocks in main), all states (loading/empty/error/offline/forbidden), a11y AA, responsive, tests, traceability row updated, audit/RBAC verified.
