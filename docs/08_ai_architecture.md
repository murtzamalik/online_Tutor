# 08 · AI Architecture

## Principles (D-15, D-26, D-28, B-15)
1. **AI drives the education layer only.** Never personal data to an AI vendor; identity is resolved by code after results return.
2. **Code owns facts and numbers:** marks totals, numeric answers, mastery, grades, prices, dates — computed by deterministic code; models phrase, judge or generate content under schema.
3. **Everything through the gateway,** config-driven routing per task key. No SDK calls to Anthropic/Google from feature code.
4. **Structured outputs + validation + one retry;** failures degrade gracefully (queue/exception), never fabricate.
5. **Evidence over vibes:** every prompt/model change passes the eval gate against gold sets (`12_evaluation_and_promotion.md`).

## Gateway request lifecycle
`caller → gatewayclient (core-api) builds variables (already de-identified) → ai-gateway: authenticate service → resolve prompt_version (LIVE or pinned) → render template → redact (regex + NER + image masking) → budget check → route (model_routing[task_key]) → call vendor (timeouts, retries, circuit breaker) → validate JSON vs schema → log (ai_gateway_log metadata; ai_gateway_payload redacted payload 14d) → return`.
- **Idempotency & caching:** prompt caching for static blocks (shared rules, style profile, exemplars); response cache only for deterministic, non-learner prompts (e.g. hints per question).
- **Batch:** nightly generation uses vendor batch API (`GW-03/04`).
- **Streaming:** tutor replies via `GW-02` → SSE; safety check runs on the *complete* reply before display for MVP (buffer), except voice where sentence-level streaming is allowed only after P-SF-02 passes on the sentence buffer (see 11).
- **Model routing table** (seed V010; pilot free stack V019): LLM tasks use vendor `LITELLM` with aliases `gemini-flash` (heavy/vision), `groq-llama70b` / `groq-llama8b` (tutor/small), and `fallback_model_id` → `ollama-qwen14b` / `ollama-llama8b`. STT `chirp_2` / TTS `en-GB-Chirp3-HD` remain `GOOGLE_SPEECH`. Anthropic Claude IDs remain valid for rollback (set `vendor=ANTHROPIC` in `model_routing`). IDs are config — never hardcode in feature code (D-28).
- **Pilot free stack (local):** `ai-gateway` → LiteLLM (`infra/litellm/config.yaml`, Compose service `litellm:4000`) → Gemini Flash + Groq; Ollama on the host (`OLLAMA_API_BASE=http://host.docker.internal:11434`) for 429/5xx fallback. Env: `AI_GATEWAY_STUB=false`, `LITELLM_MASTER_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`. Free Gemini may use prompts to improve Google products — use synthetic/redacted data for pilot; do not send live UK pupil PII.
- **Cost controls:** per-task budgets (`ai_budget`), alerts (Q-04), circuit breaker to cheaper tier by policy, per-student daily AI caps (parent control).
- **Failure modes & fallbacks:** vendor 5xx/timeouts → retry with backoff → `fallback_model_id` via LiteLLM (Ollama) once → queue; safety classifier down → **fail closed** for learner-facing chat (pause tutor with friendly message), never open.

## Prompt lifecycle
Repo file → `prompt_version(status=DRAFT)` (seed job parses front-matter table: id, task_key, tier, temp, schema) → evaluate (AIO-23) → promote (AIO-24, needs AIE + audit) → LIVE (unique) → rollback available. Variables validated at build time (missing variable = hard error). Every model output row stores `prompt_version_id`s.

## Embeddings
Self-hosted `bge-base-en-v1.5` (768-d) in `embedding-service`; only exam content (questions, specs, notes) is embedded; HNSW cosine; similarity thresholds calibrated per board (QG `10_code_side_checks.md` §5) and stored with model name; changing model = re-embed + recalibrate.

## Safety architecture (see 11)
Independent classifier calls (P-SF-01/02/03), rules in code, scripted responses, DSL console.

## Evaluation
Gold sets: marking (examiner-marked answers, ≥ 2,000 target — **open item P-2**), safety (curated + red-team), generation QC (labelled). Metrics: per-point marking agreement (headline), exact-total agreement, exception rate, false-accept rate; safety recall/precision; QC pass rate; cost per approved item. Dashboards Q-01/Q-04.
