# 17 · Testing Strategy

| Layer | Tooling | Must-cover |
|---|---|---|
| Unit | JUnit 5, AssertJ, Vitest | BKT/IRT/FSRS math, strategy controller, marking validation & decision logic, calc solver (parser whitelist, ECF), equation balancer, price/proration, redaction rules |
| Property-based | jqwik | Calc templates (constraints hold, no NaN, sig-fig rounding), balancer, money arithmetic |
| Integration | Spring Boot Test + Testcontainers (Postgres+pgvector, Redis, MinIO) | Every endpoint in the catalogue: happy path, 401/403/404, validation errors; Flyway migrate from empty; RLS isolation; outbox→stream→consumer |
| Contract | OpenAPI diff vs `api/endpoints.json`; Pact for gateway client | No undeclared endpoints; role map equality |
| AI-boundary | Custom tests | (a) `tutor_gateway` role cannot SELECT learner tables (assert failure); (b) PII corpus never appears in gateway payloads; (c) log-scrub test; (d) prompt variable completeness |
| AI-quality | Eval harness (Q-01) + recorded fixtures | Gold-set accuracy gate; safety recall; QC pipeline regression; runs offline against recorded responses in CI, live weekly |
| E2E | Playwright | PF-01 signup→trial; PF-02 practice→mark; PF-04 dispute; PF-05 tutor turn; PF-06 voice (fake audio); PF-10 school onboarding; PF-11 dunning (Stripe test clocks); role guard matrix |
| Security | Semgrep, ZAP baseline, dependency/container scans | OWASP top-10 checks, authZ matrix tests (every role × endpoint) |
| Accessibility | axe, manual SR | D-01, F-01, J-01, Shell-04, B-01, C-03 |
| Performance | k6 | Marking p95, practice next-question, 5k concurrent students, nightly job window |
| Resilience | Chaos-lite | Gateway down, vendor 5xx, Redis down, Stripe webhook replay/out-of-order |
| Data | Migration dry-run on snapshot; deletion e2e | Delete removes all learner rows/objects; export completeness |

**Test data:** synthetic only (no real children's data anywhere outside prod). `testkit` provides factories, a **gateway stub** with recorded responses per prompt id/version, Stripe test clocks, and a Mailpit inbox.
**Release gate (pilot):** all critical-module coverage thresholds, zero high/critical vulns, authZ matrix green, boundary tests green, marking gate ≥ 0.95 on gold set (once available — P-2), DSL drill executed, DR restore drill done.
