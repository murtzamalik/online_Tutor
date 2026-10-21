-- =============================================================================
-- V026 — Voice tutor speech through the Gemini API; sub-processor register matches the pilot stack.
-- Stories: US-075 (voice tutor), US-116 (voice summary). Screens: J-01, J-06, H-09.
-- D-05 names Google Cloud Speech (Chirp). For the pilot, speech-to-text and text-to-speech run on
-- the Gemini API with the existing key (vendor GEMINI): voice.stt = audio transcription,
-- voice.tts = Gemini TTS (WAV out). Switching back is a model_routing change once a Google Cloud
-- Speech client exists. Audio is not retained (voice.retain_audio stays false).
-- =============================================================================

ALTER TABLE model_routing DROP CONSTRAINT IF EXISTS model_routing_vendor_check;
ALTER TABLE model_routing
  ADD CONSTRAINT model_routing_vendor_check
  CHECK (vendor IN ('ANTHROPIC', 'GOOGLE_SPEECH', 'SELF_HOSTED', 'LITELLM', 'GEMINI'));

UPDATE model_routing
SET vendor = 'GEMINI', model_id = 'gemini-3.5-flash-lite', fallback_model_id = NULL,
    params_json = '{"language":"en-GB","temperature":0}'::jsonb
WHERE task_key = 'voice.stt';

UPDATE model_routing
SET vendor = 'GEMINI', model_id = 'gemini-3.8-flash-tts', fallback_model_id = NULL,
    params_json = '{"voice":"Kore"}'::jsonb
WHERE task_key = 'voice.tts';

-- Public sub-processor register (/legal and school DPA): the pilot runs on Gemini and Groq via our gateway.
UPDATE sub_processor SET active = FALSE WHERE name = 'Anthropic (Claude API)';

UPDATE sub_processor
SET name = 'Google (Gemini API)',
    purpose = 'Voice tutor speech-to-text and text-to-speech; AI marking, generation and tutoring via our gateway',
    data_categories = 'Voice audio (separate parent consent, J-06; not retained by us); question text and redacted learner answers with no identity data (D-15)',
    location = 'Google infrastructure (region per Google terms — confirm in DPIA)'
WHERE name = 'Google Cloud Speech-to-Text / Text-to-Speech';

INSERT INTO sub_processor (name, purpose, data_categories, location, receives_personal_data)
SELECT 'Groq', 'AI tutoring and safety classification via our gateway',
       'Redacted learner messages and question text; no identity data (D-15)', 'US (confirm in DPIA)', FALSE
WHERE NOT EXISTS (SELECT 1 FROM sub_processor WHERE name = 'Groq');

-- P-VO-02 summary written when a voice session ends (parent-visible with the transcript, H-09).
ALTER TABLE voice_session ADD COLUMN IF NOT EXISTS summary_json JSONB;
