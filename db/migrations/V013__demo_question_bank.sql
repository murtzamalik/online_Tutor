-- =============================================================================
-- V013 — Demo question bank for AQA GCSE Chemistry 8462 (W1 gate)
-- Seeds ≥12 APPROVED questions on level-1 topics 1–3, mark schemes, gold-set items,
-- and a stub objective/blueprint for GEN dry-run. Topic IDs resolved via subqueries.
-- =============================================================================

-- Demo prompt version for AIO eval harness (eval_run FK)
INSERT INTO prompt_version (
  prompt_id, version, task_key, body_text, schema_ref, model_tier, source_path, sha256, status
)
SELECT 'P-MK-01', 'w1-demo', 'mark.gcse.pass_a', 'W1 demo marking prompt stub',
       'schemas/marking_result.schema.json', 'large', 'ai_prompts/marking/P-MK-01.md',
       'w1demopromptsha256placeholder0001', 'LIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM prompt_version WHERE prompt_id = 'P-MK-01' AND version = 'w1-demo'
);

-- Stub assessable objective for GEN-03 dry-run (no objectives in V009)
INSERT INTO spec_point_objective (
    spec_topic_id, objective_text, allowed_question_types, allowed_command_words,
    mark_min, mark_max, tier, prompt_version
)
SELECT t.topic_id,
       'Recall that atoms have a nucleus containing protons and neutrons',
       ARRAY['MULTIPLE_CHOICE','SHORT_ANSWER']::TEXT[],
       ARRAY['State','Identify']::TEXT[],
       1, 2, 'FOUNDATION', 'W1-DEMO'
FROM specification s
JOIN spec_topic t ON t.specification_id = s.specification_id
WHERE s.spec_code = '8462' AND t.topic_level = 1 AND t.topic_number = '1'
LIMIT 1;

-- Helper: insert question + scheme via DO blocks keyed by topic_number
DO $$
DECLARE
  v_spec_id BIGINT;
  v_topic1 BIGINT;
  v_topic2 BIGINT;
  v_topic3 BIGINT;
  v_qid BIGINT;
BEGIN
  SELECT specification_id INTO v_spec_id FROM specification WHERE spec_code = '8462' LIMIT 1;
  IF v_spec_id IS NULL THEN
    RAISE EXCEPTION 'AQA 8462 specification not found — run V009 first';
  END IF;

  SELECT topic_id INTO v_topic1 FROM spec_topic
   WHERE specification_id = v_spec_id AND topic_level = 1 AND topic_number = '1' LIMIT 1;
  SELECT topic_id INTO v_topic2 FROM spec_topic
   WHERE specification_id = v_spec_id AND topic_level = 1 AND topic_number = '2' LIMIT 1;
  SELECT topic_id INTO v_topic3 FROM spec_topic
   WHERE specification_id = v_spec_id AND topic_level = 1 AND topic_number = '3' LIMIT 1;

  -- Q1 MCQ topic 1
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, options_json, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic1, 'AUTHORED', 'FOUNDATION', '4-5', 1,
    'MULTIPLE_CHOICE', 'Identify',
    'Which particle has a relative charge of +1?',
    '[{"key":"A","text":"Proton","correct":true},{"key":"B","text":"Neutron","correct":false},{"key":"C","text":"Electron","correct":false},{"key":"D","text":"Atom","correct":false}]'::jsonb,
    'MCQ', '{"correctKey":"A"}'::jsonb, 'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'MCQ_KEY', 1,
    '[{"id":"M1","marks":1,"point":"Proton has relative charge +1","accept":["A"],"reject":["B","C","D"]}]'::jsonb, 'AUTHORED');

  -- Q2 MCQ topic 1
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, options_json, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic1, 'AUTHORED', 'FOUNDATION', '4-5', 1,
    'MULTIPLE_CHOICE', 'Identify',
    'What is the relative mass of an electron?',
    '[{"key":"A","text":"1","correct":false},{"key":"B","text":"0 (negligible)","correct":true},{"key":"C","text":"1/12","correct":false},{"key":"D","text":"2","correct":false}]'::jsonb,
    'MCQ', '{"correctKey":"B"}'::jsonb, 'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'MCQ_KEY', 1,
    '[{"id":"M1","marks":1,"point":"Electron mass is negligible / ~0","accept":["B"]}]'::jsonb, 'AUTHORED');

  -- Q3 SHORT_ANSWER topic 1
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic1, 'AUTHORED', 'HIGHER', '5-6', 2,
    'SHORT_ANSWER', 'Describe',
    'Describe the structure of an atom in terms of protons, neutrons and electrons.',
    'TEXT',
    '{"expectedTerms":["nucleus","protons","neutrons","electrons","shells"]}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, model_answer, origin)
  VALUES (v_qid, 'POINTS', 2,
    '[{"id":"M1","marks":1,"point":"Protons and neutrons in the nucleus","accept":["nucleus contains protons and neutrons"]},{"id":"M2","marks":1,"point":"Electrons in shells/energy levels around the nucleus","accept":["electrons orbit","electron shells"]}]'::jsonb,
    'Protons and neutrons are in the nucleus; electrons occupy shells around the nucleus.',
    'AUTHORED');

  -- Q4 SHORT_ANSWER topic 1
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic1, 'AUTHORED', 'FOUNDATION', '4-5', 1,
    'SHORT_ANSWER', 'State',
    'State the charge on a neutron.',
    'TEXT', '{"accept":["0","zero","neutral","no charge"]}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'POINTS', 1,
    '[{"id":"M1","marks":1,"point":"Zero / no charge","accept":["0","zero","neutral"]}]'::jsonb, 'AUTHORED');

  -- Q5 MCQ topic 2
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, options_json, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic2, 'AUTHORED', 'FOUNDATION', '4-5', 1,
    'MULTIPLE_CHOICE', 'Identify',
    'Which type of bonding involves sharing of electrons?',
    '[{"key":"A","text":"Ionic","correct":false},{"key":"B","text":"Covalent","correct":true},{"key":"C","text":"Metallic","correct":false},{"key":"D","text":"Hydrogen","correct":false}]'::jsonb,
    'MCQ', '{"correctKey":"B"}'::jsonb, 'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'MCQ_KEY', 1,
    '[{"id":"M1","marks":1,"point":"Covalent bonding shares electrons","accept":["B"]}]'::jsonb, 'AUTHORED');

  -- Q6 MCQ topic 2
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, options_json, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic2, 'AUTHORED', 'HIGHER', '6-7', 1,
    'MULTIPLE_CHOICE', 'Identify',
    'Which substance is most likely to conduct electricity when molten?',
    '[{"key":"A","text":"Diamond","correct":false},{"key":"B","text":"Sodium chloride","correct":true},{"key":"C","text":"Sulfur","correct":false},{"key":"D","text":"Glucose","correct":false}]'::jsonb,
    'MCQ', '{"correctKey":"B"}'::jsonb, 'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'MCQ_KEY', 1,
    '[{"id":"M1","marks":1,"point":"Ionic compounds conduct when molten","accept":["B"]}]'::jsonb, 'AUTHORED');

  -- Q7 SHORT_ANSWER topic 2
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic2, 'AUTHORED', 'FOUNDATION', '4-5', 2,
    'SHORT_ANSWER', 'Explain',
    'Explain why ionic compounds have high melting points.',
    'TEXT',
    '{"expectedTerms":["strong","electrostatic","forces","ions","lattice"]}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, model_answer, origin)
  VALUES (v_qid, 'POINTS', 2,
    '[{"id":"M1","marks":1,"point":"Strong electrostatic forces between ions","accept":["strong forces","electrostatic attraction"]},{"id":"M2","marks":1,"point":"Large amount of energy needed to overcome forces / break lattice","accept":["lots of energy","break lattice"]}]'::jsonb,
    'Strong electrostatic forces between oppositely charged ions in a lattice require a large amount of energy to overcome.',
    'AUTHORED');

  -- Q8 SHORT_ANSWER topic 2
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic2, 'AUTHORED', 'HIGHER', '6-7', 1,
    'SHORT_ANSWER', 'State',
    'State the type of structure in diamond.',
    'TEXT', '{"accept":["giant covalent","giant covalent structure","macromolecular"]}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'POINTS', 1,
    '[{"id":"M1","marks":1,"point":"Giant covalent (structure)","accept":["giant covalent","macromolecular"]}]'::jsonb, 'AUTHORED');

  -- Q9 CALCULATION topic 3
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic3, 'AUTHORED', 'FOUNDATION', '4-5', 2,
    'CALCULATION', 'Calculate',
    'Calculate the relative formula mass (Mr) of H2O. (Ar: H=1, O=16)',
    'NUMBER',
    '{"value":18,"tolerance":0,"unit":null,"sigFigs":null}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'NUMERIC', 2,
    '[{"id":"M1","marks":1,"point":"2×1 + 16","accept":["2+16"]},{"id":"M2","marks":1,"point":"Mr = 18","accept":["18"]}]'::jsonb, 'AUTHORED');

  -- Q10 CALCULATION topic 3
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic3, 'AUTHORED', 'HIGHER', '6-7', 2,
    'CALCULATION', 'Calculate',
    'Calculate the number of moles in 44 g of CO2. (Mr CO2 = 44)',
    'NUMBER',
    '{"value":1.0,"tolerance":0.01,"unit":"mol"}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'NUMERIC', 2,
    '[{"id":"M1","marks":1,"point":"n = mass/Mr","accept":["44/44"]},{"id":"M2","marks":1,"point":"1.0 mol","accept":["1","1.0"]}]'::jsonb, 'AUTHORED');

  -- Q11 CALCULATION topic 3
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic3, 'AUTHORED', 'FOUNDATION', '5-6', 1,
    'CALCULATION', 'Calculate',
    'A solution contains 0.5 mol of solute in 0.25 dm³. Calculate the concentration in mol/dm³.',
    'NUMBER',
    '{"value":2.0,"tolerance":0.01,"unit":"mol/dm3"}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'NUMERIC', 1,
    '[{"id":"M1","marks":1,"point":"concentration = 0.5/0.25 = 2.0","accept":["2","2.0"]}]'::jsonb, 'AUTHORED');

  -- Q12 MCQ topic 3
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, options_json, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic3, 'AUTHORED', 'FOUNDATION', '4-5', 1,
    'MULTIPLE_CHOICE', 'Identify',
    'What is the unit of relative formula mass?',
    '[{"key":"A","text":"g","correct":false},{"key":"B","text":"no units","correct":true},{"key":"C","text":"mol","correct":false},{"key":"D","text":"dm3","correct":false}]'::jsonb,
    'MCQ', '{"correctKey":"B"}'::jsonb, 'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'MCQ_KEY', 1,
    '[{"id":"M1","marks":1,"point":"Mr has no units","accept":["B"]}]'::jsonb, 'AUTHORED');

  -- Q13 SHORT_ANSWER topic 3 (extra)
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic3, 'AUTHORED', 'HIGHER', '6-7', 2,
    'SHORT_ANSWER', 'Define',
    'Define the term mole in chemistry.',
    'TEXT',
    '{"expectedTerms":["Avogadro","6.02","particles","amount"]}'::jsonb,
    'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, model_answer, origin)
  VALUES (v_qid, 'POINTS', 2,
    '[{"id":"M1","marks":1,"point":"Amount of substance containing Avogadro number of particles","accept":["Avogadro","6.02 x 10^23"]},{"id":"M2","marks":1,"point":"Equal to relative formula mass in grams","accept":["Mr in grams","gram formula mass"]}]'::jsonb,
    'One mole is the amount of substance that contains 6.02×10²³ particles (Avogadro constant).',
    'AUTHORED');

  -- Q14 MCQ topic 1 (extra for adaptive pool)
  INSERT INTO question (
    specification_id, topic_id, source_type, tier, difficulty_grade_band, marks_available,
    question_type, command_word, question_text, options_json, answer_format, answer_spec_json,
    review_status, licence_status
  ) VALUES (
    v_spec_id, v_topic1, 'AUTHORED', 'HIGHER', '7-9', 1,
    'MULTIPLE_CHOICE', 'Identify',
    'An atom has atomic number 11 and mass number 23. How many neutrons does it have?',
    '[{"key":"A","text":"11","correct":false},{"key":"B","text":"12","correct":true},{"key":"C","text":"23","correct":false},{"key":"D","text":"34","correct":false}]'::jsonb,
    'MCQ', '{"correctKey":"B"}'::jsonb, 'APPROVED', 'OWN'
  ) RETURNING question_id INTO v_qid;
  INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
  VALUES (v_qid, 'MCQ_KEY', 1,
    '[{"id":"M1","marks":1,"point":"neutrons = mass number − atomic number = 12","accept":["B"]}]'::jsonb, 'AUTHORED');

END $$;

-- Synthetic gold-set items (eval harness until P-2) — attach to first few APPROVED questions
INSERT INTO gold_set_item (
  question_id, specification_id, question_type, answer_text,
  examiner_points_json, examiner_total, origin, is_holdout, verified
)
SELECT q.question_id, q.specification_id, q.question_type,
       CASE
         WHEN q.question_type = 'MULTIPLE_CHOICE' THEN COALESCE(q.answer_spec_json->>'correctKey', 'A')
         WHEN q.question_type = 'CALCULATION' THEN COALESCE(q.answer_spec_json->>'value', '0')
         ELSE 'model answer for eval'
       END,
       COALESCE(ms.marking_points_json, '[]'::jsonb),
       ms.total_marks,
       'SYNTHETIC',
       (ROW_NUMBER() OVER (ORDER BY q.question_id)) = 1,
       TRUE
FROM question q
JOIN mark_scheme ms ON ms.question_id = q.question_id
JOIN specification s ON s.specification_id = q.specification_id
WHERE s.spec_code = '8462' AND q.review_status = 'APPROVED' AND q.source_type = 'AUTHORED'
ORDER BY q.question_id
LIMIT 4;

-- Stub blueprint linked to demo objective (GEN-03 dry-run can publish path)
INSERT INTO blueprint (
  blueprint_id, spec_topic_id, objective_id, tier, question_type, marks,
  command_word, target_grade_band, is_numeric, blueprint_json, status
)
SELECT
  'BP-W1-DEMO-8462-T1-MCQ-1',
  o.spec_topic_id,
  o.objective_id,
  'FOUNDATION',
  'MULTIPLE_CHOICE',
  1,
  'Identify',
  '4-5',
  FALSE,
  '{"demo":true,"specCode":"8462"}'::jsonb,
  'PLANNED'
FROM spec_point_objective o
WHERE o.prompt_version = 'W1-DEMO'
LIMIT 1;
