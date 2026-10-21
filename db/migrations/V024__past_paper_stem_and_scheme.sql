-- =============================================================================
-- V024 — Past-paper items: keep the stem and the mark scheme apart; retire unusable questions.
-- Stories: US-043 (past-paper ingest), US-020 (diagnostic), US-021 (adaptive practice).
-- Screens: E-02, B-04, C-01.
-- Ingest appended the extracted mark scheme to past_paper_item.raw_text, and approval copied
-- raw_text into question.question_text with a placeholder scheme ("Accept valid chemistry response",
-- 2 marks). Earlier file-backed ingests stored file metadata as the stem. Those questions were
-- APPROVED and served first (times_served = 0), so the diagnostic showed file paths to pupils.
-- Serving now also requires a cleared licence (see PracticeService/MockService selection queries).
-- =============================================================================

ALTER TABLE past_paper_item ADD COLUMN IF NOT EXISTS scheme_json JSONB;

-- Questions a pupil must never see: metadata stems, stems with an appended scheme, placeholder schemes.
WITH bad AS (
    SELECT q.question_id
    FROM question q
    LEFT JOIN mark_scheme ms ON ms.question_id = q.question_id
    WHERE q.question_text LIKE '[file-backed ingest]%'
       OR q.question_text LIKE '%[mark scheme]%'
       OR ms.marking_points_json::text LIKE '%Accept valid chemistry response%'
)
UPDATE question q
SET review_status = 'RETIRED', updated_at = now()
FROM bad
WHERE q.question_id = bad.question_id;

-- Their source items go back to the review queue (stem split from the appended scheme where present).
UPDATE past_paper_item i
SET status = 'NEEDS_REVIEW',
    question_id = NULL,
    raw_text = CASE
        WHEN position('[mark scheme]' IN i.raw_text) > 0
            THEN btrim(substring(i.raw_text FROM 1 FOR position('[mark scheme]' IN i.raw_text) - 1))
        ELSE i.raw_text
    END
FROM question q
WHERE q.question_id = i.question_id
  AND q.review_status = 'RETIRED';
