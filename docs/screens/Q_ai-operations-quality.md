# Epic Q — Q. AI Operations & Quality

## Q-01 — Marking Accuracy Eval Dashboard

- **Route:** `/staff/ai/eval`  
- **Roles:** Product owner  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-125 (See marking accuracy against the examiner-marked gold set by board and…)
- **Design notes (inventory):** Accuracy vs examiner-marked gold set, per marking point, by board and question type; also exact-total agreement and over-marking rate.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Eval dashboard by task/model/prompt, gold-set browser, run eval
  - AC: promotion blocked if below threshold
- **Endpoints wired:**
  - `AIO-01` `GET /api/v1/internal/ai/eval/summary` — Q-01 headline accuracy vs gold set, by board and question type
  - `AIO-02` `GET /api/v1/internal/ai/eval/runs` — Runs
  - `AIO-03` `GET /api/v1/internal/ai/eval/runs/{evalId}` — Run detail incl. disagreements
  - `AIO-04` `POST /api/v1/internal/ai/eval/runs` — Run a prompt version against gold set / fixed QG set
  - `AIO-05` `POST /api/v1/internal/ai/gold-set/import` — CSV import of examiner-marked answers (owner pending P-2)
  - `AIO-06` `GET /api/v1/internal/ai/gold-set` — Gold-set inventory, holdout flag, size vs 2,000 target
  - `AIO-07` `PATCH /api/v1/internal/ai/gold-set/{goldId}` — Verify/mark holdout
- **Tables touched (via those endpoints):** `audit_log`, `eval_result`, `eval_run`, `gold_set_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Q-02 — AI Gateway — Privacy Boundary Log

- **Route:** `/staff/ai/boundary`  
- **Roles:** Data protection lead  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-126 (Verify that no personal data reaches any AI vendor and review every re…)
- **Design notes (inventory):** Every AI call via the AI Gateway: per-request random token, redaction log, image header masking. Proves no personal data reaches any AI vendor.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Gateway log, redactions, boundary attestation
  - AC: no raw PII ever displayed
  - payload purge 14d
- **Endpoints wired:**
  - `AIO-10` `GET /api/v1/internal/ai/gateway-log` — Q-02 call log (no identity fields exist)
  - `AIO-11` `GET /api/v1/internal/ai/gateway-log/{logId}` — Exact redacted outbound payload (14 days) + redactions
  - `AIO-12` `GET /api/v1/internal/ai/redactions` — Redaction stats by kind/method
  - `AIO-13` `GET /api/v1/internal/ai/boundary-attestation` — Daily canary attestation
- **Tables touched (via those endpoints):** `ai_gateway_log`, `ai_gateway_payload`, `audit_log`, `boundary_attestation`, `redaction_event`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Q-03 — Prompt & Model Configuration

- **Route:** `/staff/ai/prompts`  
- **Roles:** AI engineer  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-127 (Version prompts and promote one only when it beats the live version on…)
- **Design notes (inventory):** Versioned prompts/models; promotion only if the candidate beats the live version on the gold set and stays ≥95%.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Prompt versions, diff, evaluate, promote/rollback, model routing
  - AC: one LIVE per prompt
  - promotion audited
- **Endpoints wired:**
  - `AIO-20` `GET /api/v1/internal/ai/prompts` — Q-03 prompt list with live version
  - `AIO-21` `GET /api/v1/internal/ai/prompts/{promptId}/versions` — Versions + metrics
  - `AIO-22` `POST /api/v1/internal/ai/prompts/{promptId}/versions` — Create DRAFT (file-loader or edit)
  - `AIO-23` `POST /api/v1/internal/ai/prompt-versions/{id}/evaluate` — Evaluate on gold set
  - `AIO-24` `POST /api/v1/internal/ai/prompt-versions/{id}/promote` — Promote only if gate passes (server-enforced)
  - `AIO-25` `POST /api/v1/internal/ai/prompt-versions/{id}/rollback` — Roll back to previous LIVE
  - `AIO-26` `GET /api/v1/internal/ai/model-routing` — Task → model map
  - `AIO-27` `PUT /api/v1/internal/ai/model-routing/{taskKey}` — Change model for a task (gate-checked; audit-logged)
  - `PLT-01` `GET /api/v1/internal/feature-flags` — Flags
  - `PLT-02` `PUT /api/v1/internal/feature-flags/{flagKey}` — Toggle (audit-logged)
- **Tables touched (via those endpoints):** `audit_log`, `eval_run`, `feature_flag`, `model_routing`, `prompt_version`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Q-04 — AI Cost & Usage

- **Route:** `/staff/ai/cost`  
- **Roles:** Business owner  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Should / Pilot / **W2**
- **User stories:** US-128 (See AI cost per active student broken down by task — so that the subsc…)
- **Design notes (inventory):** AI cost per active student, by task (marking, generation, tutor, voice), against the agreed budget.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Cost by task/model/day, budgets and alerts
- **Endpoints wired:**
  - `AIO-30` `GET /api/v1/internal/ai/cost` — Q-04 cost per active student by task
  - `AIO-31` `PUT /api/v1/internal/ai/budgets` — Budgets and alert thresholds
- **Tables touched (via those endpoints):** `ai_budget`, `ai_usage_cost`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Q-05 — AI Safety Flags Queue

- **Route:** `/staff/safety`  
- **Roles:** Safeguarding lead  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-129 (Review AI safety-classifier flags and escalate concerns to the DSL — s…)
- **Design notes (inventory):** Safety-classifier flags (Decision 8) triaged and escalated to the DSL; links to L-04.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Flag queue triage, escalate to disclosure
  - AC: SLA timers, DSL only
- **Endpoints wired:**
  - `SAF-02` `GET /api/v1/internal/safety/flags` — Q-05 queue (pseudonymous refs)
  - `SAF-03` `GET /api/v1/internal/safety/flags/{flagId}` — Redacted excerpt + classifier reasoning
  - `SAF-04` `POST /api/v1/internal/safety/flags/{flagId}/triage` — Dismiss / triage with note
  - `SAF-05` `POST /api/v1/internal/safety/flags/{flagId}/escalate` — Escalate → creates disclosure (identity revealed to DSL only)
  - `SAF-06` `GET /api/v1/internal/safeguarding/disclosures` — L-04 list
- **Tables touched (via those endpoints):** `audit_log`, `safeguarding_disclosure_log`, `safety_classification`, `safety_flag`
- **AI prompts:** `P-SF-04` (Disclosure summary for the DSL)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
