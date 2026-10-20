-- =============================================================================
-- V022 — Output budget for Groq reasoning models.
-- Stories: US-082, US-051. Screens: F-07, J-01.
-- The LiteLLM aliases groq-llama8b / groq-llama70b map to gpt-oss-20b / gpt-oss-120b, which spend
-- part of max_tokens on hidden reasoning. With V020's 1024 budget, P-SF-02 hit "max completion tokens
-- reached before generating a valid document" (Groq json_validate_failed) and the tutor failed closed.
-- =============================================================================

UPDATE model_routing
SET params_json = COALESCE(params_json, '{}'::jsonb)
      || jsonb_build_object('max_tokens', GREATEST(COALESCE((params_json->>'max_tokens')::int, 0), 4096)),
    updated_at = now()
WHERE vendor = 'LITELLM' AND model_id LIKE 'groq-%';
