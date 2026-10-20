-- =============================================================================
-- V023 — Backfill answer_spec_json for AI-generated multiple-choice questions.
-- Stories: US-041 (generation), US-120 (marketing sample question). Screens: CNT-02, A-01.
-- Generated MCQs were saved with options_json[].correct but no answer_spec_json, unlike
-- hand-authored items ({"correctKey": "B"}). Marking reads options_json, so marks were right,
-- but anything reading answer_spec_json (sample question, QC review) saw no answer.
-- Only rows with exactly one correct option are filled.
-- =============================================================================

UPDATE question q
SET answer_spec_json = jsonb_build_object('correctKey', c.key)
FROM (
    SELECT question_id, MIN(opt->>'key') AS key
    FROM question, jsonb_array_elements(options_json) AS opt
    WHERE question_type = 'MULTIPLE_CHOICE'
      AND answer_spec_json IS NULL
      AND jsonb_typeof(options_json) = 'array'
      AND (opt->>'correct')::boolean IS TRUE
    GROUP BY question_id
    HAVING COUNT(*) = 1
) c
WHERE q.question_id = c.question_id;
