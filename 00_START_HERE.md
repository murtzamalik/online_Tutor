# 00 · START HERE — Study Loop Build Pack v1.0

**Audience:** Cursor (and any engineer). **Owner:** Karsaaz Solutions · **Client:** Arshad Ashraf · **Baseline:** Requirements v1.0 LOCKED (21 Sep 2026) · **Pack built:** 29 Sep 2026.

This folder is the single, complete specification to implement the platform: architecture, all 121 screens wired to a 339-endpoint API, a 147-table PostgreSQL schema (migrations verified on Postgres 16 + pgvector), 57 AI prompts with JSON schemas, process flows, standards, waves and Cursor rules.

## Reading order
1. `CURSOR_MASTER_PROMPT.md` — paste into Cursor (it tells Cursor what to read and to write `docs/CURSOR_UNDERSTANDING.md`).
2. `AGENTS.md` + `.cursor/rules/` — non-negotiable rules.
3. `docs/01`–`docs/22` — the specification (see map below).
4. `docs/screens/` + `api/` + `docs/traceability/` — screen-by-screen wiring.
5. `ai_prompts/` + `db/migrations/` + `data/` — AI and data assets.
6. `cursor_prompts/W0…W4` — per-wave prompts.

## Map
| Path | Contents |
|---|---|
| `docs/01_product_and_scope.md` | Users, scope, non-goals, success criteria |
| `docs/02_decisions_register.md` | **D-01…D-28 (locked)** + B-01…B-18 (build decisions) |
| `docs/03_system_architecture.md` | Deployables, modules, AI Gateway boundary (Mermaid) |
| `docs/04_process_flows.md` | 16 end-to-end flows (PF-01…PF-16) |
| `docs/05_repo_structure_and_standards.md` | Monorepo, backend/frontend/git standards, DoD |
| `docs/06_data_model.md` | 147 tables by migration; design points |
| `docs/07_auth_rbac_tenancy.md` | Identities, tokens, RBAC, RLS, audit |
| `docs/08_ai_architecture.md` | Gateway lifecycle, routing, prompt lifecycle, eval |
| `docs/09_marking_engine.md` | GCSE exception-based, A-Level provisional, decision logic |
| `docs/10_mastery_adaptive_engine.md` | BKT, IRT, FSRS, strategy controller, predicted grade |
| `docs/11_voice_and_safety.md` | Voice pipeline, safety layers, DSL workflow |
| `docs/12_api_contract.md` | Conventions, examples; catalogue in `api/` |
| `docs/13_billing_and_b2b.md` | Stripe, dunning, schools (roster, SSO, DPA, invoices) |
| `docs/14_content_and_past_papers.md` | Content model, licensing, bank-first generation |
| `docs/15_frontend_architecture.md` | Next.js structure, tokens, a11y |
| `docs/16_nfr_security_compliance.md` | UK regulatory frame, security, targets |
| `docs/17_testing_strategy.md` | Test layers and release gates |
| `docs/18_implementation_plan_waves.md` | W0–W4, screens per wave |
| `docs/19_mobile_phase_spec.md` | Mobile phase (later) |
| `docs/20_open_items_and_assumptions.md` | Open items, assumptions to challenge |
| `docs/21_use_case_catalogue.md` | 45 use cases + system use cases |
| `docs/screens/` | 121 screen specs by epic (route, roles, endpoints, tables, prompts, AC) |
| `docs/traceability/` | story→screen matrix (CSV + MD) |
| `api/` | `API_CATALOGUE.md`, `endpoints.json`, `screens.json` |
| `ai_prompts/` | `PROMPT_INDEX.md` + 8 packs (question_generation, marking, tutor, voice, safety, content_ingestion, revision_content, reporting) |
| `db/migrations/` | V001–V011 Flyway (schema, seeds, roles, RLS) |
| `data/past_papers/` | Manifest of official papers to ingest (verify-flagged) |
| `cursor_prompts/` | Wave prompts W0–W4 |
| `supporting_docs/` | Original client/planning documents |

## Numbers at a glance
121 screens · 130 stories (all mapped) · 339 endpoints · 147 tables · 57 prompts · 28 locked decisions + 18 build decisions · 5 build waves. Flag-off/deferred: K-01 gamification, N-01…N-03 marketplace.

## How to install in your project
Copy this whole folder to the project root (contents at repo root: `docs/`, `ai_prompts/`, `db/`, `api/`, `data/`, `cursor_prompts/`, `supporting_docs/`, `AGENTS.md`, `.cursor/`). Run `copy_supporting_docs.sh <folder-with-your-original-files>` to add the UI prototype HTML and design PDF (not included here). Then open Cursor and paste `CURSOR_MASTER_PROMPT.md`.

## Known gaps you should be aware of (details in `docs/20`)
Legal/licensing items, gold set (P-2), reviewer staffing (P-1), pricing/VAT, UK-only hosting, brand name, and verification of spec/paper codes flagged `VERIFY`. None block Wave 0–1.
