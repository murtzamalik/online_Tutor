-- =============================================================================
-- V014 — W1 marketing CMS seed, legal current docs, QC demo items, style/mock stubs
-- Forward-only; does not alter V001–V013.
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketing_page (
    page_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    title         TEXT NOT NULL,
    hero_md       TEXT,
    body_md       TEXT NOT NULL,
    cta_label     TEXT,
    cta_href      TEXT,
    published     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Current legal documents (CON-05)
UPDATE legal_document SET is_current = FALSE WHERE is_current = TRUE;

INSERT INTO legal_document (slug, version, title, body_md, is_current, published_at) VALUES
 ('terms','1.0-w1','Terms of Service','# Terms of Service

Study Loop W1 pilot terms. Full solicitor text lands before public launch.',TRUE,now()),
 ('privacy','1.0-w1','Privacy Policy','# Privacy Policy

We process family account and learner practice data in the UK/EEA. AI calls go only via our gateway with no personal data to vendors.',TRUE,now()),
 ('ai-data','1.0-w1','How we use AI with your data','# AI and your data

Marking and generation prompts never include names, emails, or school identifiers. Numbers and totals are computed in code.',TRUE,now()),
 ('cookies','1.0-w1','Cookie Policy','# Cookie Policy

Essential cookies keep you signed in. Analytics cookies are optional (CON-06).',TRUE,now()),
 ('safeguarding','1.0-w1','Safeguarding Policy','# Safeguarding Policy

W1 pilot safeguarding summary — escalate concerns to designated staff.',TRUE,now())
ON CONFLICT (slug, version) DO UPDATE SET is_current = TRUE, body_md = EXCLUDED.body_md, published_at = now();

-- FAQ (MKT-01 / A-03)
INSERT INTO faq_item (category, question, answer_md, sort_order, published)
SELECT * FROM (VALUES
 ('Marking','How accurate is the marking?','Auto-marking uses dual passes for GCSE/iGCSE with a confidence gate. Low-confidence items go to human exception review.',10::SMALLINT,TRUE),
 ('Boards','Which exam boards do you cover?','W1 pilots AQA GCSE Chemistry (8462). Catalogue endpoints list further qualifications as they open.',20::SMALLINT,TRUE),
 ('Cost','How does cost compare to tutoring?','Family plans are priced below 1:1 tutoring. See pricing on the homepage catalogue.',30::SMALLINT,TRUE),
 ('Parents','Do I need a parent account?','Yes for under-18 learners. Parents manage children, consent, and billing.',40::SMALLINT,TRUE)
) AS v(category, question, answer_md, sort_order, published)
WHERE NOT EXISTS (SELECT 1 FROM faq_item LIMIT 1);

-- Lead magnets / resources (MKT-03 / A-05)
INSERT INTO marketing_resource (title, kind, email_gated, body_md, published)
SELECT * FROM (VALUES
 ('GCSE Chemistry familiarisation pack','LEAD_MAGNET',TRUE,
  'A short pack of board-style warm-up questions for AQA Chemistry. Enter your email to unlock the download.',TRUE),
 ('What is a baseline diagnostic?','GUIDE',FALSE,
  'Our adaptive diagnostic estimates starting mastery from a short adaptive set before practice begins.',TRUE)
) AS v(title, kind, email_gated, body_md, published)
WHERE NOT EXISTS (SELECT 1 FROM marketing_resource LIMIT 1);

-- Outcomes (MKT-05)
INSERT INTO outcome_stat (label, value_text, methodology_md, sample_size, as_of, published)
SELECT * FROM (VALUES
 ('Pilot mark latency p95','< 8s','Timed on MCQ/numeric path in W1 demo bank against local marking stubs.',120,'2026-09-01'::DATE,TRUE),
 ('Exception review rate','~4%','Share of GCSE responses routed to OPS queue in synthetic W1 runs.',500,'2026-09-01'::DATE,TRUE)
) AS v(label, value_text, methodology_md, sample_size, as_of, published)
WHERE NOT EXISTS (SELECT 1 FROM outcome_stat LIMIT 1);

-- Marketing subject pages (MKT-10 / A-02)
INSERT INTO marketing_page (slug, title, hero_md, body_md, cta_label, cta_href, published) VALUES
 ('gcse-chemistry','GCSE Chemistry','Adaptive practice for AQA Chemistry 8462.',
  'Board-track questions, instant marking, and mastery that resurfaces weak topics. Coming-soon subjects can capture a lead.',
  'Start free','/signup',TRUE),
 ('gcse-physics','GCSE Physics','Physics is on the roadmap.',
  'Register interest and we will email when the board-track opens.',
  'Notify me','#lead',TRUE)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, published = TRUE;

-- Exam dates (CAT-06 / A-08)
INSERT INTO exam_date (qualification_id, region, exam_name, exam_on, notes)
SELECT q.qualification_id, 'England', 'GCSE Chemistry Paper 1 (illustrative)', DATE '2027-05-18',
       'Illustrative W1 calendar date — confirm against official board timetable'
FROM qualification q
WHERE q.code = 'GCSE'
  AND NOT EXISTS (SELECT 1 FROM exam_date LIMIT 1)
LIMIT 1;

INSERT INTO exam_date (qualification_id, region, exam_name, exam_on, notes)
SELECT q.qualification_id, 'England', 'GCSE Chemistry Paper 2 (illustrative)', DATE '2027-06-09',
       'Illustrative W1 calendar date'
FROM qualification q
WHERE q.code = 'GCSE'
  AND (SELECT COUNT(*) FROM exam_date) < 2
LIMIT 1;

-- Board style profile for 8462 if missing (STY-*)
INSERT INTO board_style_profile (
  specification_id, question_wording_notes, mark_scheme_format_notes,
  command_words_json, typical_paper_structure_notes, state_symbols_required, updated_by
)
SELECT s.specification_id,
       'AQA prefers concise stems; avoid rhetorical flourishes.',
       'Point-marked AO1/AO2/AO3 with accept/reject lists.',
       '["State","Explain","Calculate","Describe","Compare"]'::jsonb,
       'Two papers; practical skills across both.',
       TRUE,
       'V014-seed'
FROM specification s
WHERE s.spec_code = '8462'
  AND NOT EXISTS (
    SELECT 1 FROM board_style_profile b WHERE b.specification_id = s.specification_id
  );

-- PENDING_QC demo questions for E-01
DO $$
DECLARE
  v_spec_id BIGINT;
  v_topic BIGINT;
  v_qid BIGINT;
BEGIN
  SELECT specification_id INTO v_spec_id FROM specification WHERE spec_code = '8462' LIMIT 1;
  IF v_spec_id IS NULL THEN
    RETURN;
  END IF;
  SELECT topic_id INTO v_topic FROM spec_topic
   WHERE specification_id = v_spec_id AND topic_level = 1 AND topic_number = '1' LIMIT 1;
  IF v_topic IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM question WHERE source_reference = 'W1-QC-DEMO-1') THEN
    RETURN;
  END IF;

  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status, source_reference
  ) VALUES (
    v_spec_id, v_topic, 'AI_GENERATED', 'FOUNDATION', '4-5', 1,
    'SHORT_ANSWER', 'State',
    'State the particle that orbits the nucleus of an atom. [W1 QC demo]',
    'TEXT', '{"expectedTerms":["electron"]}'::jsonb,
    'PENDING_QC', 'OWN', 'W1-QC-DEMO-1'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'POINTS', 1,
    '[{"id":"M1","marks":1,"point":"Electron","accept":["electron","electrons"]}]'::jsonb, 'GENERATED');
  INSERT INTO qc_check_result (question_id, check_id, passed, issues_json)
  VALUES (v_qid, 'QC1_GROUNDING', FALSE, '{"reason":"W1 demo fail for QC queue"}'::jsonb);

  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status, source_reference
  ) VALUES (
    v_spec_id, v_topic, 'AI_GENERATED', 'HIGHER', '6-7', 2,
    'SHORT_ANSWER', 'Explain',
    'Explain why atoms of the same element can have different mass numbers. [W1 QC demo]',
    'TEXT', '{"expectedTerms":["isotopes","neutrons"]}'::jsonb,
    'PENDING_QC', 'OWN', 'W1-QC-DEMO-2'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'POINTS', 2,
    '[{"id":"M1","marks":1,"point":"Isotopes","accept":["isotope","isotopes"]},{"id":"M2","marks":1,"point":"Different neutrons","accept":["neutrons"]}]'::jsonb, 'GENERATED');
  INSERT INTO qc_check_result (question_id, check_id, passed, issues_json)
  VALUES (v_qid, 'QC5_ANSWERABILITY', FALSE, '{"reason":"W1 demo fail for QC queue"}'::jsonb);
END $$;

-- Boundary attestation + gateway log stubs for Q-02 (no PII)
INSERT INTO boundary_attestation (day, checks_json, passed)
SELECT CURRENT_DATE, '{"NO_LEARNER_PII_IN_VENDOR_PAYLOAD":"PASS","note":"W1 synthetic"}'::jsonb, TRUE
WHERE NOT EXISTS (SELECT 1 FROM boundary_attestation WHERE day = CURRENT_DATE);

INSERT INTO ai_gateway_log (
  request_token, task_key, prompt_id, prompt_version, vendor, model, route,
  tokens_in, tokens_out, latency_ms, status, redaction_count, boundary_ok, payload_hash
)
SELECT 'w1-demo-token-' || gen_random_uuid()::text, 'mark.gcse.pass_a', 'P-MK-01', 'w1-demo',
       'ANTHROPIC', 'stub-model', 'TEXT', 10, 20, 42, 'OK', 0, TRUE, 'sha256:w1-demo'
WHERE NOT EXISTS (SELECT 1 FROM ai_gateway_log LIMIT 1);
