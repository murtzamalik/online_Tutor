-- =============================================================================
-- V019 — Pilot free AI stack: allow LITELLM vendor; route LLM tasks via LiteLLM
-- aliases (Gemini Flash heavy/vision, Groq tutor/small, Ollama fallback).
-- voice.stt / voice.tts remain GOOGLE_SPEECH. Rollback: UPDATE vendor back to
-- ANTHROPIC + Claude model_ids (D-28 config-only).
-- =============================================================================

ALTER TABLE model_routing DROP CONSTRAINT IF EXISTS model_routing_vendor_check;

ALTER TABLE model_routing
  ADD CONSTRAINT model_routing_vendor_check
  CHECK (vendor IN ('ANTHROPIC', 'GOOGLE_SPEECH', 'SELF_HOSTED', 'LITELLM'));

-- Tutor turns (except vision walkthrough) → Groq 70B
UPDATE model_routing
SET
  vendor = 'LITELLM',
  model_id = 'groq-llama70b',
  fallback_model_id = 'ollama-llama8b',
  updated_at = now()
WHERE task_key IN (
  'tu.turn',
  'tu.hint',
  'tu.reexplain',
  'tu.explainback',
  'tu.rescue',
  'tu.worked_example',
  'tu.discussion'
);

-- Vision + ingest image tasks → Gemini Flash
UPDATE model_routing
SET
  vendor = 'LITELLM',
  model_id = 'gemini-flash',
  fallback_model_id = 'ollama-qwen14b',
  updated_at = now()
WHERE task_key IN (
  'in.segment',
  'in.scheme',
  'mk.transcribe',
  'tu.walkthrough'
);

-- Small / fast classifiers & copy → Groq 8B
UPDATE model_routing
SET
  vendor = 'LITELLM',
  model_id = 'groq-llama8b',
  fallback_model_id = 'ollama-llama8b',
  updated_at = now()
WHERE task_key IN (
  'qg.qc.tag',
  'qg.qc.duplicate',
  'qg.qc.weak',
  'mk.feedback',
  'mk.misconception',
  'vo.summary',
  'sf.shared_content',
  'in.metadata',
  'rc.simplify',
  'rp.student',
  'rp.misconception',
  'rp.plan'
);

-- Remaining LLM tasks (large generation, marking, QC, safety, revision, reports) → Gemini
UPDATE model_routing
SET
  vendor = 'LITELLM',
  model_id = 'gemini-flash',
  fallback_model_id = 'ollama-qwen14b',
  updated_at = now()
WHERE vendor = 'ANTHROPIC'
  AND task_key NOT IN ('voice.stt', 'voice.tts');
