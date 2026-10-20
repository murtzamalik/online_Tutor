-- =============================================================================
-- V020 — AI fix round (branch fix/ai-implementation)
-- Stories: US-044, US-045, US-115 (marking), US-051, US-052 (tutor/photo), US-082 (safety),
--          US-112 (QC), Q-02 (gateway payload retention), Q-03 (routing config).
-- Screens: F-01, F-07, F-08, F-10, Q-02, Q-03.
--
-- 1. Pass B on a different model than Pass A, so the dual pass is an independent check (D-17).
--    LiteLLM alias "groq-llama70b" currently maps to groq/openai/gpt-oss-120b (infra/litellm/config.yaml).
-- 2. Image tasks lose the text-only Ollama fallback (qwen2.5:14b cannot read images): a failure
--    must surface, not silently answer without the picture.
-- 3. max_tokens per task (gateway default was 8192 for everything).
-- 4. marking_exception.trigger gains MODEL_FLAG (marker flags such as POSSIBLE_INJECTION, SCHEME_GAP).
-- 5. Close the V012 default-privilege leak: tutor_gateway read every table created after V012.
-- 6. Retire the V013 one-line placeholder LIVE prompt for P-MK-01; the gateway now prefers LIVE
--    prompt_version bodies, and that placeholder would replace the real marking prompt.
-- Rollback: config only — UPDATE model_routing back; the constraint change is additive.
-- =============================================================================

-- 1. Independent second marking pass
UPDATE model_routing
SET model_id = 'groq-llama70b',
    fallback_model_id = 'gemini-flash',
    updated_at = now()
WHERE task_key = 'mk.pass_b' AND vendor = 'LITELLM';

-- 2. Image tasks: no text-only fallback
UPDATE model_routing
SET fallback_model_id = NULL,
    updated_at = now()
WHERE task_key IN ('tu.walkthrough', 'mk.transcribe')
  AND fallback_model_id = 'ollama-qwen14b';

-- 3. Output budgets (tokens); params_json keeps its temperature
UPDATE model_routing
SET params_json = COALESCE(params_json, '{}'::jsonb) || jsonb_build_object('max_tokens',
      CASE
        WHEN task_key IN ('in.segment', 'in.scheme', 'in.spec', 'in.examiner_report') THEN 8192
        WHEN task_key LIKE 'qg.%' OR task_key LIKE 'rc.%' OR task_key = 'in.style' THEN 4096
        WHEN task_key LIKE 'mk.%' OR task_key = 'tu.walkthrough' OR task_key = 'tu.worked_example' THEN 2048
        ELSE 1024
      END),
    updated_at = now()
WHERE vendor IN ('ANTHROPIC', 'LITELLM');

-- 4. Marker flags open an exception
ALTER TABLE marking_exception DROP CONSTRAINT IF EXISTS marking_exception_trigger_check;
ALTER TABLE marking_exception
  ADD CONSTRAINT marking_exception_trigger_check
  CHECK (trigger IN ('LOW_CONFIDENCE', 'PASS_DISAGREEMENT', 'STUDENT_DISPUTE', 'SCHEMA_FAILURE', 'MODEL_FLAG'));

-- 5. AI boundary (D-15): V012 granted tutor_gateway SELECT on every FUTURE table, so tables added
--    later (e.g. V017 micro_subscription, billing) became readable by the gateway. Grants to the
--    gateway must stay an explicit allow-list (V011). DELETE on ai_gateway_payload is already in V011.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM tutor_gateway;
REVOKE ALL ON micro_subscription, marketing_page FROM tutor_gateway;

-- 6. Placeholder prompt is no longer LIVE (kept for eval_run history)
UPDATE prompt_version
SET status = 'RETIRED'
WHERE prompt_id = 'P-MK-01' AND version = 'w1-demo' AND status = 'LIVE';
