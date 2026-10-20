-- =============================================================================
-- V021 — Safety classifiers on the fast small tier.
-- Stories: US-082 (safety), US-051 (tutor). Screens: F-07, J-01.
-- P-SF-01 prompt notes: "Runs on EVERY learner message before the tutor. Latency target ≤ 500 ms
-- (small tier; high recall tuning)". Routed to gemini-flash by V019, each classifier took 4–25 s,
-- making every tutor turn 20–30 s. Groq small (gpt-oss-20b) with gemini-flash fallback; the
-- service still fails closed if both fail.
-- =============================================================================

UPDATE model_routing
SET model_tier = 'small',
    model_id = 'groq-llama8b',
    fallback_model_id = 'gemini-flash',
    updated_at = now()
WHERE task_key IN ('sf.input', 'sf.output') AND vendor = 'LITELLM';
