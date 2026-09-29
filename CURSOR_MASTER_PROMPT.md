# CURSOR MASTER PROMPT  (paste this into Cursor as the first message)

> You are the lead engineer for **Study Loop**, a UK exam-preparation platform (AI tutor + adaptive practice + instant marking; parents and schools). The complete specification is already in this repository. Your first job is to **absorb it fully and prove you understood it**; your second job is to build it in waves.

## Step 0 — Load the specification (do this before writing any code)
Read, in this order, completely:
1. `AGENTS.md` and `.cursor/rules/*.mdc`
2. `00_START_HERE.md`
3. `docs/01_product_and_scope.md` → `docs/02_decisions_register.md` (decisions D-01…D-28 are **final**; B-01…B-18 are the build decisions)
4. `docs/03_system_architecture.md` → `docs/04_process_flows.md` (all 16 process flows, PF-01…PF-16)
5. `docs/05` … `docs/17` (standards, data model, auth/RBAC/tenancy, AI architecture, marking, mastery, voice & safety, API contract, billing & B2B, content & past papers, frontend, NFR/security, testing)
6. `docs/21_use_case_catalogue.md` and `docs/20_open_items_and_assumptions.md`
7. `docs/screens/README.md` and **every** epic file in `docs/screens/` (121 screens, each wired to endpoints/tables/prompts)
8. `api/API_CATALOGUE.md` (339 endpoints), `api/screens.json`, `api/endpoints.json`
9. `docs/traceability/story_to_screen.md` and `traceability_matrix.csv` (130 stories → screens → endpoints → tables → prompts)
10. `ai_prompts/PROMPT_INDEX.md` and every pack README (question_generation, marking, tutor, voice, safety, content_ingestion, revision_content, reporting) plus `ai_prompts/safety/safeguarding_templates.md`
11. `db/migrations/V001…V011` (the schema: 147 tables) and `data/past_papers/README.md`
12. `docs/18_implementation_plan_waves.md` and `docs/19_mobile_phase_spec.md`
`supporting_docs/` holds the original client material; consult it when a doc references it, but the pack wins on conflicts (client-stated requirements are never removed — D-14).

## Step 1 — Prove understanding: write `docs/CURSOR_UNDERSTANDING.md`
Create this living document with the sections below. Do **not** copy text from the docs; explain in your own words, concisely but completely:
1. **System in one page** — what is built, for whom, the pilot scope, what is deferred/flag-off and why.
2. **Architecture map** — deployables, modules, the AI Gateway boundary and how it is enforced at DB level.
3. **Every process** — for each PF-01…PF-16 write the steps, failure paths and which endpoints/prompts/tables are touched. Then the 45 use cases: list any you consider ambiguous.
4. **The five hard rules in your own words** (D-15 boundary; numbers in code; A-Level review vs GCSE exceptions; safety fails closed; standing rule D-14) and how you will test each.
5. **Marking, mastery and safety engines** — decision logic as pseudo-code.
6. **Screen inventory check** — confirm 121 screens, count per wave, the pull-forward notes, and the flag-off/deferred screens.
7. **Gaps, contradictions, risks** — anything inconsistent or missing in the pack, with the safest assumption you will take. Include legal/pricing/safeguarding items you will *not* decide.
8. **Questions** — numbered, only genuine blockers.
Commit it, then **stop and wait for approval of the understanding document** only if section 7 or 8 contains a blocker; otherwise continue.

## Step 2 — Build in waves
Follow `docs/18_implementation_plan_waves.md`. For each wave use the matching prompt in `cursor_prompts/` (W0 → W4) — start with **W0**. At each wave: produce `docs/waves/<W>_plan.md`, implement vertical slices (DB → API → UI → tests), update the traceability matrix, and stop at the wave gate with a report (built vs scope, deviations, open questions, demo script). Do not start the next wave until the gate is met.

## Standing rules (short form — full text in AGENTS.md)
- **No personal data to any AI vendor.** All AI calls only via `ai-gateway`. The gateway DB role cannot read learner tables.
- **Code computes numbers** (marks totals, numeric answers, mastery, grades, money). Models generate/judge/phrase under JSON schemas.
- **Wired, not mocked.** Every screen calls real endpoints; each endpoint matches `api/endpoints.json` (roles included) and is covered by tests.
- **Spec is locked.** Don't remove requirements; defer via flags. Don't change decisions D-01…D-28/B-01…B-18; raise questions instead.
- **Forward-only migrations.** Never edit V001–V011; add V012+.
- **Children's data:** privacy-by-default, accessibility AA, no dark patterns, no gamification pressure (Phase 2, flag off).
- **Safeguarding texts are scripted**, and the safety layer fails closed.
- **Scope now:** backend + web + internal tools. Mobile is a later phase (`docs/19`); keep the API mobile-ready.

## First action
Begin Step 0 now. Report back with the contents of `docs/CURSOR_UNDERSTANDING.md` (sections 1, 7 and 8 inline) before writing application code.
