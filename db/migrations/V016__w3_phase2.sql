-- =============================================================================
-- V016 — W3 Phase 2: A-Level reviewer seed, demo flag flip, revision/help seed
-- Forward-only; does not edit V001–V015.
-- Prod default for a_level_review remains client-controlled (seed comment below).
-- =============================================================================

-- Demo/local: enable A-Level provisional marking + review workbench for SLA drill.
-- Production: leave FALSE until reviewer staffing is confirmed (P-1).
UPDATE feature_flag
   SET enabled = TRUE,
       description = 'A-Level provisional marking + review workbench. DEMO/local ON for W3 SLA drill; prod should stay FALSE until client confirms vetted reviewers (P-1).'
 WHERE flag_key = 'a_level_review';

-- Vetted A-Level reviewer (SLA drill only — not production staffing sign-off).
-- Login: reviewer@studyloop.local / ReviewerDemo!23
INSERT INTO account (account_id, email, password_hash, display_name, kind, status, mfa_required, email_verified_at)
VALUES (
  'b2000000-0000-4000-8000-000000000001'::uuid,
  'reviewer@studyloop.local',
  '$argon2id$v=19$m=65536,t=3,p=1$4yyWMxlLn2cnIAfoTEpEAg$odao6/avcWsXS67kDV9vxGybvAHS07rCihqVpH3AvBA',
  'Demo A-Level Reviewer',
  'STAFF',
  'ACTIVE',
  FALSE,
  now()
)
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO account_role (account_id, role)
VALUES ('b2000000-0000-4000-8000-000000000001'::uuid, 'REVIEWER')
ON CONFLICT DO NOTHING;

INSERT INTO staff_vetting_record (vetting_id, account_id, provider, check_type, status, provider_ref, issued_on, next_review_on)
VALUES (
  'b2000000-0000-4000-8000-000000000002'::uuid,
  'b2000000-0000-4000-8000-000000000001'::uuid,
  'UCHECK',
  'ENHANCED_DBS_BARRED_LIST',
  'CLEAR',
  'W3-DEMO-REVIEWER',
  CURRENT_DATE - 30,
  CURRENT_DATE + 335
)
ON CONFLICT DO NOTHING;

INSERT INTO app_config (config_key, value_json, description) VALUES
 ('a_level.review_sla_hours', '48', 'F-05 / F-09 SLA hours for provisional marks'),
 ('deletion.cool_off_days', '14', 'L-02 GDPR-style cooling-off before purge'),
 ('w3.demo.reviewer_email', '"reviewer@studyloop.local"', 'Demo reviewer for SLA drill (not prod staffing)')
ON CONFLICT (config_key) DO NOTHING;

-- Help centre articles (P-01)
INSERT INTO help_article (slug, title, body_md, audience, tags, published)
SELECT * FROM (VALUES
 ('getting-started','Getting started','# Getting started

Create a parent account, add a child, enrol in a subject, then start practice from Home.',
  'ALL', ARRAY['onboarding','basics']::TEXT[], TRUE),
 ('marking-and-feedback','How marking works','# How marking works

Objective items are marked in code. Longer answers use dual AI passes via our gateway (no personal data). A-Level answers stay provisional until a human reviewer confirms within 48 hours when the review flag is on.',
  'ALL', ARRAY['marking','a-level']::TEXT[], TRUE),
 ('deletion-and-export','Delete or export data','# Delete or export data

Parents can request a data export or account deletion. Deletion has a 14-day cooling-off — cancel any time before it runs. No urgency tricks.',
  'PARENT', ARRAY['privacy','gdpr']::TEXT[], TRUE),
 ('live-chat','Talk to support','# Live chat

Use the in-app chat widget to message a human support agent. This is not an AI chatbot.',
  'PARENT', ARRAY['support']::TEXT[], TRUE)
) AS v(slug, title, body_md, audience, tags, published)
WHERE NOT EXISTS (SELECT 1 FROM help_article WHERE slug = v.slug);

-- Case study seed if empty (A-07)
INSERT INTO case_study (title, body_md, before_after_json, consent_evidence_key, approved, published_at)
SELECT 'Pilot family — Chemistry confidence',
       'A Year 10 learner used daily micro-goals and wrong-answer redrill. Parent reports clearer topic focus before mocks.',
       '{"before":"Avoided bonding topics","after":"Completed two mock papers"}'::jsonb,
       'w3-demo-consent-placeholder',
       TRUE, now()
WHERE NOT EXISTS (SELECT 1 FROM case_study LIMIT 1);

-- Revision content for pilot Chemistry topics (I-*)
DO $$
DECLARE
  v_topic BIGINT;
  v_deck UUID;
BEGIN
  SELECT t.topic_id INTO v_topic
  FROM spec_topic t
  JOIN specification s ON s.specification_id = t.specification_id
  WHERE s.spec_code = '8462' AND t.topic_level = 1
  ORDER BY t.display_order NULLS LAST, t.topic_id
  LIMIT 1;

  IF v_topic IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO revision_note (spec_topic_id, version, body_md, reading_level, status, prompt_version)
  SELECT v_topic, 1,
         E'# Atomic structure\n\n- Atoms have a nucleus of protons and neutrons.\n- Electrons occupy shells.\n- Atomic number = protons; mass number = protons + neutrons.',
         'GCSE', 'APPROVED', 'revision_content@w3'
  WHERE NOT EXISTS (
    SELECT 1 FROM revision_note WHERE spec_topic_id = v_topic AND status = 'APPROVED'
  );

  INSERT INTO cheat_sheet (spec_topic_id, content_json, status, prompt_version)
  SELECT v_topic,
         '{"sections":[{"title":"Key terms","items":["proton","neutron","electron","isotope"]},{"title":"Common mistakes","items":["Confusing mass number with atomic number"]}]}'::jsonb,
         'APPROVED', 'revision_content@w3'
  WHERE NOT EXISTS (
    SELECT 1 FROM cheat_sheet WHERE spec_topic_id = v_topic AND status = 'APPROVED'
  );

  IF NOT EXISTS (SELECT 1 FROM flashcard_deck WHERE kind = 'SYSTEM' AND spec_topic_id = v_topic) THEN
    v_deck := gen_random_uuid();
    INSERT INTO flashcard_deck (deck_id, kind, owner_student_id, spec_topic_id, title, moderation_status)
    VALUES (v_deck, 'SYSTEM', NULL, v_topic, 'Atomic structure — system deck', 'CLEAN');
    INSERT INTO flashcard (deck_id, front, back, position, status) VALUES
      (v_deck, 'What is the atomic number?', 'The number of protons in the nucleus.', 0, 'APPROVED'),
      (v_deck, 'What is an isotope?', 'Atoms of the same element with different numbers of neutrons.', 1, 'APPROVED'),
      (v_deck, 'Where are electrons found?', 'In shells (energy levels) around the nucleus.', 2, 'APPROVED');
  END IF;
END $$;

-- Pricing plan feature matrix for CAT-08 compare (if columns live on pricing_plan via JSON config)
INSERT INTO app_config (config_key, value_json, description) VALUES
 ('pricing.compare_matrix', '{
   "features":[
     {"key":"subjects","label":"Subjects included","plans":{"ENGLISH_MATHS_SCIENCE":"3 core","EXAM_PREP":"All GCSE","EXAM_PREP_PLUS":"All GCSE"}},
     {"key":"mocks","label":"Timed mocks","plans":{"ENGLISH_MATHS_SCIENCE":"No","EXAM_PREP":"No","EXAM_PREP_PLUS":"Yes"}},
     {"key":"tutor","label":"AI tutor chat","plans":{"ENGLISH_MATHS_SCIENCE":"Basic","EXAM_PREP":"Full","EXAM_PREP_PLUS":"Full + voice"}},
     {"key":"parent","label":"Parent reports","plans":{"ENGLISH_MATHS_SCIENCE":"Weekly","EXAM_PREP":"Weekly","EXAM_PREP_PLUS":"Weekly + predicted"}}
   ],
   "disclaimer":"Placeholder pricing copy until client sets final prices."
 }'::jsonb, 'C-01/C-04 plan comparison matrix')
ON CONFLICT (config_key) DO NOTHING;

-- Mock sitting: store in-progress answers on items (MOC-04)
ALTER TABLE mock_paper_item ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE mock_paper_item ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

