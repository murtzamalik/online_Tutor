# 02 · Decisions Register (final)

## A. Locked decisions (from Project_Open_Items_Tracker → Decision Log)
| ID | Date | Decision |
|---|---|---|
| D-01 | 14 Sep | LLM vendor: Anthropic Claude, direct API |
| D-02 | 14 Sep | Hosting: self-hosted Docker (Hetzner-style) |
| D-03 | 14 Sep | Database: PostgreSQL for everything |
| D-04 | 14 Sep | Vector store: pgvector in the same Postgres |
| D-05 | 14 Sep | Voice: Google Cloud Speech (STT + TTS) |
| D-06 | 14 Sep | Vision/handwriting: Claude vision (no new vendor) |
| D-07 | 14 Sep | Mobile: native Swift (iOS) + Kotlin (Android) |
| D-08 | 14 Sep | Safety classifier: second, independently prompted Claude call |
| D-09 | 14 Sep | Age assurance (OSA): lightweight in-house, swappable interface |
| D-10 | 14 Sep | DBS: uCheck |
| D-11 | 14 Sep | Push: OneSignal |
| D-12 | 14 Sep | Transactional email: Postmark |
| D-13 | 14 Sep | Events: Redis Streams / direct DB for pilot; Kafka deferred |
| D-14 | 21 Sep | Standing rule: client-stated requirements are implemented, never removed |
| D-15 | 21 Sep | **AI data boundary:** no personal data (name, DOB, email, school, stable user id) to any AI vendor; all AI calls via AI Gateway that tokenises and redacts text/images |
| D-16 | 21 Sep | A-Level: AI-assisted marking with **mandatory human review**; AI mark provisional |
| D-17 | 21 Sep | GCSE/iGCSE: **no routine human review**; exceptions only (low confidence, pass disagreement, dispute) |
| D-18 | 21 Sep | AI question QC automated (grounding, spec tag, mark-scheme consistency, duplicate, answerability); humans handle failures only |
| D-19 | 21 Sep | Marking accuracy (≥ 95%) measured per marking point vs examiner gold set by board and question type; prompts promoted only if they beat live |
| D-20 | 21 Sep | Voice is the one path where a vendor receives personal data (audio→Google). Separate parent consent; transcripts kept 30 days, parent-visible |
| D-21 | 21 Sep | Gamification held to Phase 2 (client Round 1) |
| D-22 | 21 Sep | Business model: consumer subscription + per-pupil school invoice at the same tier price; Stripe for both |
| D-23 | 21 Sep | B2B MVP: assignments, class insights, MIS/CSV rostering, Google/Microsoft SSO, online DPA, invoice billing |
| D-24 | 21 Sep | Embeddings: self-hosted open-source model (exam content only, never learner data) |
| D-25 | 21 Sep | Question generation is bank-first: nightly batch through 5 QC checks; on-demand only for thin cells |
| D-26 | 21 Sep | Calculations: Claude writes template, **code computes every number** |
| D-27 | 21 Sep | Diagrams: reusable apparatus library + code-drawn graphs; no AI images |
| D-28 | 21 Sep | Model-agnostic AI Gateway; per-task routing; Claude for the pilot |

## B. Build decisions (made for the implementation phase — challenge before Wave 0 if you disagree)
| ID | Decision | Rationale |
|---|---|---|
| B-01 | **Backend:** Java 21 + Spring Boot 3.x, Maven multi-module **modular monolith** `core-api`; separate deployables: `ai-gateway` (Java), `voice-service` (Java, WebSocket), `embedding-service` (Python, `bge-base-en-v1.5`, 768-dim, ONNX/FastAPI) | Team strength; monolith speed with hard module boundaries (ArchUnit); AI boundary enforced by a separate process + DB role |
| B-02 | **Web:** Next.js 15 (App Router) + TypeScript + Tailwind, single codebase with route groups `(public)`, `(auth)`, `(parent)`, `(student)`, `(school)`, `(staff)`; TanStack Query, Zod, KaTeX + mhchem, Storybook, Vitest, Playwright | Client choice: one codebase |
| B-03 | **Data access:** jOOQ + Spring JDBC (typed SQL, no JPA/lazy-loading); Flyway migrations `V001–V011` in `db/migrations` are the schema source of truth | Explicit SQL, RLS-friendly |
| B-04 | **Jobs:** JobRunr (Postgres storage) for schedules (weekly reports, purge, nightly generation); Redis Streams via transactional outbox for domain events (answers→mastery, engagement, billing) | D-13 |
| B-05 | **Auth:** Spring Security; JWT access (15 min) + rotating refresh tokens (httpOnly, SameSite, reuse-detection); TOTP MFA mandatory for all staff/reviewer/school-admin; child picture-PIN separate flow with lockout | Fintech-grade session hygiene |
| B-06 | **Tenancy:** consumer data by ownership checks; school data by Postgres RLS (`app.school_id`, `app.rls_bypass`); integration tests prove cross-tenant isolation | Defence in depth |
| B-07 | **Retention** (config in `app_config`): voice transcripts 30 d; chat transcripts 90 d (confirm in DPIA); masked answer photos 30 d; raw engagement events 90 d; gateway payload 14 d; audit log 7 y | See V010 |
| B-08 | **Support chat** is in-house (no third-party chat vendor) | Avoid another sub-processor |
| B-09 | **Object storage:** MinIO (S3 API) for PDFs, photos, exports; signed URLs only | Self-hosted, S3-portable |
| B-10 | **Observability:** OpenTelemetry → Grafana stack (Loki/Tempo/Prometheus); no personal data in logs/traces | AADC/GDPR |
| B-11 | **MIS rostering:** CSV always on; Wonde adapter behind flag `wonde_mis` (needs commercial agreement) | D-23 |
| B-12 | **Prompts** live in the repo (`ai_prompts/`) and are loaded into `prompt_version`; only one LIVE version per prompt (partial unique index); promotion through the eval gate (Q-01/Q-03) | D-19 |
| B-13 | **Reverse proxy/TLS:** Caddy; Docker Compose for dev/pilot; Compose→Swarm/K8s only when needed | D-02 |
| B-14 | **Delivery order:** waves W0–W4 (see 18); mobile is a separate phase after web pilot | User decision |
| B-15 | **Numbers & totals in code:** marks totals, mastery, grades, prices, VAT never come from an LLM | D-26 extended |
| B-16 | **API style:** REST/JSON `/api/v1`, OpenAPI 3.1 generated from code, SSE for marking/tutor streaming, WebSocket only for voice | Mobile-ready |
| B-17 | **Money:** integer pence, GBP; Stripe is the source of truth for payment state (webhooks, idempotent) | Fintech |
| B-18 | **IDs:** UUID v4 for entities exposed externally; internal bigints where declared | V001–V011 |
