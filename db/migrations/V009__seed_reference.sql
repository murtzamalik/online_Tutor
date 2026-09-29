-- V009 — Seed data (generated from GCSE_iGCSE_Chemistry_Pilot_Scaffold.xlsx + baseline decisions)
-- Level-1 topics only; level 2/3 (spec points) are created by the SPEC-01 ingestion prompt + M-01/M-04 review.
-- VERIFY every spec_code / unit duration against the board's official specification before go-live (flagged in docs/22).

INSERT INTO qualification (code, display_name, typical_age_min, typical_age_max, visual_tier) VALUES
 ('ELEVEN_PLUS','11+',10,11,1),('GCSE','GCSE',14,16,2),('IGCSE','International GCSE',14,16,2),('A_LEVEL','A Level',16,18,3);
INSERT INTO exam_board (code, display_name, country_scope, official_site_url) VALUES
 ('AQA','AQA','England','https://www.aqa.org.uk'),
 ('EDEXCEL','Pearson Edexcel','England','https://qualifications.pearson.com'),
 ('OCR','OCR Gateway Science A','England','https://www.ocr.org.uk'),
 ('EDUQAS','WJEC Eduqas','England','https://www.eduqas.co.uk'),
 ('WJEC','WJEC','Wales','https://www.wjec.co.uk'),
 ('EDEXCEL_INTL','Pearson Edexcel International','International','https://qualifications.pearson.com'),
 ('CAIE','Cambridge International (CAIE)','International','https://www.cambridgeinternational.org');
INSERT INTO subject (code, display_name, is_combined_science, subject_profile, is_pilot) VALUES
 ('CHEMISTRY','Chemistry',FALSE,'CHEMISTRY',TRUE),
 ('PHYSICS','Physics',FALSE,'PHYSICS',FALSE),
 ('BIOLOGY','Biology',FALSE,'BIOLOGY',FALSE),
 ('COMBINED_SCIENCE','Combined Science',TRUE,'GENERIC',FALSE),
 ('MATHS','Maths',FALSE,'MATHS',FALSE),
 ('ENGLISH_LANGUAGE','English Language',FALSE,'ENGLISH',FALSE),
 ('ENGLISH_LITERATURE','English Literature',FALSE,'ENGLISH',FALSE);

INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='GCSE'), (SELECT board_id FROM exam_board WHERE code='AQA'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), '8462', 'AQA GCSE Chemistry', 'FOUNDATION_HIGHER', 2016;
INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='GCSE'), (SELECT board_id FROM exam_board WHERE code='EDEXCEL'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), '1CH0', 'Pearson Edexcel GCSE (9-1) Chemistry', 'FOUNDATION_HIGHER', 2016;
INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='GCSE'), (SELECT board_id FROM exam_board WHERE code='OCR'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), 'J248', 'OCR Gateway Science A GCSE Chemistry', 'FOUNDATION_HIGHER', 2016;
INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='GCSE'), (SELECT board_id FROM exam_board WHERE code='EDUQAS'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), 'C500QS', 'WJEC Eduqas GCSE Chemistry', 'FOUNDATION_HIGHER', 2016;
INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='GCSE'), (SELECT board_id FROM exam_board WHERE code='WJEC'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), 'C500QS/WJEC', 'WJEC GCSE Chemistry (Wales)', 'FOUNDATION_HIGHER', 2016;
INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='IGCSE'), (SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), '4CH1', 'Pearson Edexcel International GCSE Chemistry', 'SINGLE_TIER', 2017;
INSERT INTO specification (qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year)
SELECT (SELECT qualification_id FROM qualification WHERE code='IGCSE'), (SELECT board_id FROM exam_board WHERE code='CAIE'), (SELECT subject_id FROM subject WHERE code='CHEMISTRY'), '0620', 'Cambridge IGCSE Chemistry (0620 / 0971)', 'CORE_EXTENDED', 2017;

INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 1 & 2', 1, FALSE FROM specification WHERE spec_code='8462' AND board_id=(SELECT board_id FROM exam_board WHERE code='AQA') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 1', 2, FALSE FROM specification WHERE spec_code='8462' AND board_id=(SELECT board_id FROM exam_board WHERE code='AQA') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 2', 3, FALSE FROM specification WHERE spec_code='8462' AND board_id=(SELECT board_id FROM exam_board WHERE code='AQA') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 1 & 2', 1, FALSE FROM specification WHERE spec_code='1CH0' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 1', 2, FALSE FROM specification WHERE spec_code='1CH0' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 1 (Separate only)', 3, FALSE FROM specification WHERE spec_code='1CH0' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 2', 4, FALSE FROM specification WHERE spec_code='1CH0' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 2 (Separate only)', 5, FALSE FROM specification WHERE spec_code='1CH0' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'All papers', 1, FALSE FROM specification WHERE spec_code='J248' AND board_id=(SELECT board_id FROM exam_board WHERE code='OCR') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Component 1', 1, FALSE FROM specification WHERE spec_code='C500QS' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Unit 1', 1, FALSE FROM specification WHERE spec_code='C500QS/WJEC' AND board_id=(SELECT board_id FROM exam_board WHERE code='WJEC') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Unit 2', 2, FALSE FROM specification WHERE spec_code='C500QS/WJEC' AND board_id=(SELECT board_id FROM exam_board WHERE code='WJEC') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Unit 3', 3, FALSE FROM specification WHERE spec_code='C500QS/WJEC' AND board_id=(SELECT board_id FROM exam_board WHERE code='WJEC') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='GCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper 1 & 2', 1, FALSE FROM specification WHERE spec_code='4CH1' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='IGCSE');
INSERT INTO spec_unit (specification_id, unit_code, sequence_order, is_practical_component) SELECT specification_id, 'Paper-agnostic', 1, FALSE FROM specification WHERE spec_code='0620' AND board_id=(SELECT board_id FROM exam_board WHERE code='CAIE') AND qualification_id=(SELECT qualification_id FROM qualification WHERE code='IGCSE');

INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '1', 'Atomic Structure & the Periodic Table', 'AQA GCSE Chemistry 1 Atomic Structure & the Periodic Table', FALSE, 1
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '2', 'Bonding, Structure & the Properties of Matter', 'AQA GCSE Chemistry 2 Bonding, Structure & the Properties of Matter', FALSE, 2
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1'), 1, '3', 'Quantitative Chemistry', 'AQA GCSE Chemistry 3 Quantitative Chemistry', FALSE, 3
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1'), 1, '4', 'Chemical Changes', 'AQA GCSE Chemistry 4 Chemical Changes', FALSE, 4
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1'), 1, '5', 'Energy Changes', 'AQA GCSE Chemistry 5 Energy Changes', FALSE, 5
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '6', 'The Rate & Extent of Chemical Change', 'AQA GCSE Chemistry 6 The Rate & Extent of Chemical Change', FALSE, 6
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '7', 'Organic Chemistry', 'AQA GCSE Chemistry 7 Organic Chemistry', FALSE, 7
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '8', 'Chemical Analysis', 'AQA GCSE Chemistry 8 Chemical Analysis', FALSE, 8
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '9', 'Chemistry of the Atmosphere', 'AQA GCSE Chemistry 9 Chemistry of the Atmosphere', FALSE, 9
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '10', 'Using Resources', 'AQA GCSE Chemistry 10 Using Resources', FALSE, 10
FROM specification s WHERE s.spec_code='8462' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '1', 'Atomic Structure', 'Pearson Edexcel GCSE (9-1) Chemistry 1 Atomic Structure', FALSE, 1
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1'), 1, '2', 'States of Matter & Mixtures', 'Pearson Edexcel GCSE (9-1) Chemistry 2 States of Matter & Mixtures', FALSE, 2
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1'), 1, '3', 'Chemical Changes', 'Pearson Edexcel GCSE (9-1) Chemistry 3 Chemical Changes', FALSE, 3
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1'), 1, '4', 'Extracting Metals & Equilibria', 'Pearson Edexcel GCSE (9-1) Chemistry 4 Extracting Metals & Equilibria', FALSE, 4
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 (Separate only)'), 1, '5', 'Separate Chemistry 1', 'Pearson Edexcel GCSE (9-1) Chemistry 5 Separate Chemistry 1', TRUE, 5
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '6', 'Groups in The Periodic Table', 'Pearson Edexcel GCSE (9-1) Chemistry 6 Groups in The Periodic Table', FALSE, 6
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '7', 'Rates of Reaction & Energy Changes', 'Pearson Edexcel GCSE (9-1) Chemistry 7 Rates of Reaction & Energy Changes', FALSE, 7
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2'), 1, '8', 'Fuels & Earth Science', 'Pearson Edexcel GCSE (9-1) Chemistry 8 Fuels & Earth Science', FALSE, 8
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 2 (Separate only)'), 1, '9', 'Separate Chemistry 2', 'Pearson Edexcel GCSE (9-1) Chemistry 9 Separate Chemistry 2', TRUE, 9
FROM specification s WHERE s.spec_code='1CH0' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '1', 'Particles', 'OCR Gateway Science A GCSE Chemistry 1 Particles', FALSE, 1
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '2', 'Elements, Compounds & Mixtures', 'OCR Gateway Science A GCSE Chemistry 2 Elements, Compounds & Mixtures', FALSE, 2
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '3', 'Chemical Reactions', 'OCR Gateway Science A GCSE Chemistry 3 Chemical Reactions', FALSE, 3
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '4', 'Predicting & Identifying Reactions & Products', 'OCR Gateway Science A GCSE Chemistry 4 Predicting & Identifying Reactions & Products', FALSE, 4
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '5', 'Monitoring & Controlling Chemical Reactions', 'OCR Gateway Science A GCSE Chemistry 5 Monitoring & Controlling Chemical Reactions', FALSE, 5
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '6', 'Global Challenges', 'OCR Gateway Science A GCSE Chemistry 6 Global Challenges', FALSE, 6
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='All papers'), 1, '7', 'Practical Skills', 'OCR Gateway Science A GCSE Chemistry 7 Practical Skills', FALSE, 7
FROM specification s WHERE s.spec_code='J248' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '1', 'Pure substances and mixtures', 'WJEC Eduqas GCSE Chemistry 1 Pure substances and mixtures', FALSE, 1
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '2', 'Particles and atomic structure', 'WJEC Eduqas GCSE Chemistry 2 Particles and atomic structure', FALSE, 2
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '3', 'Chemical formulae, equations and amount of substance', 'WJEC Eduqas GCSE Chemistry 3 Chemical formulae, equations and amount of substance', FALSE, 3
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '4', 'The Periodic Table and properties of elements', 'WJEC Eduqas GCSE Chemistry 4 The Periodic Table and properties of elements', FALSE, 4
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '5', 'Bonding, structure and properties', 'WJEC Eduqas GCSE Chemistry 5 Bonding, structure and properties', FALSE, 5
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '6', 'Reactivity series and extraction of metals', 'WJEC Eduqas GCSE Chemistry 6 Reactivity series and extraction of metals', FALSE, 6
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '7', 'Chemistry of acids', 'WJEC Eduqas GCSE Chemistry 7 Chemistry of acids', FALSE, 7
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '8', 'Energy changes in chemistry', 'WJEC Eduqas GCSE Chemistry 8 Energy changes in chemistry', FALSE, 8
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '9', 'Rate of chemical change and dynamic equilibrium', 'WJEC Eduqas GCSE Chemistry 9 Rate of chemical change and dynamic equilibrium', FALSE, 9
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '10', 'Carbon compounds', 'WJEC Eduqas GCSE Chemistry 10 Carbon compounds', FALSE, 10
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '11', 'Production, use and disposal of important chemicals and materials', 'WJEC Eduqas GCSE Chemistry 11 Production, use and disposal of important chemicals and materials', FALSE, 11
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Component 1'), 1, '12', 'The Earth and its atmosphere', 'WJEC Eduqas GCSE Chemistry 12 The Earth and its atmosphere', FALSE, 12
FROM specification s WHERE s.spec_code='C500QS' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 1'), 1, '1', 'The nature of substances and chemical reactions', 'WJEC GCSE Chemistry (Wales) 1 The nature of substances and chemical reactions', FALSE, 1
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 1'), 1, '2', 'Atomic structure and the Periodic Table', 'WJEC GCSE Chemistry (Wales) 2 Atomic structure and the Periodic Table', FALSE, 2
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 1'), 1, '3', 'Water', 'WJEC GCSE Chemistry (Wales) 3 Water', FALSE, 3
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 1'), 1, '4', 'The ever-changing Earth', 'WJEC GCSE Chemistry (Wales) 4 The ever-changing Earth', FALSE, 4
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 1'), 1, '5', 'Rate of chemical change', 'WJEC GCSE Chemistry (Wales) 5 Rate of chemical change', FALSE, 5
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 1'), 1, '6', 'Limestone', 'WJEC GCSE Chemistry (Wales) 6 Limestone', FALSE, 6
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 2'), 1, '1', 'Bonding, structure and properties', 'WJEC GCSE Chemistry (Wales) 1 Bonding, structure and properties', FALSE, 7
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 2'), 1, '2', 'Acids, bases and salts', 'WJEC GCSE Chemistry (Wales) 2 Acids, bases and salts', FALSE, 8
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 2'), 1, '3', 'Metals and their extraction', 'WJEC GCSE Chemistry (Wales) 3 Metals and their extraction', FALSE, 9
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 2'), 1, '4', 'Chemical reactions and energy', 'WJEC GCSE Chemistry (Wales) 4 Chemical reactions and energy', FALSE, 10
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 2'), 1, '5', 'Crude oil, fuels and organic chemistry', 'WJEC GCSE Chemistry (Wales) 5 Crude oil, fuels and organic chemistry', FALSE, 11
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 2'), 1, '6', 'Reversible reactions, industrial processes and important chemicals', 'WJEC GCSE Chemistry (Wales) 6 Reversible reactions, industrial processes and important chemicals', FALSE, 12
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Unit 3'), 1, NULL, 'Practical Assessment (separate externally-marked component)', 'WJEC GCSE Chemistry (Wales)  Practical Assessment (separate externally-marked component)', FALSE, 13
FROM specification s WHERE s.spec_code='C500QS/WJEC' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '1', 'Principles of chemistry', 'Pearson Edexcel International GCSE Chemistry 1 Principles of chemistry', FALSE, 1
FROM specification s WHERE s.spec_code='4CH1' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '2', 'Inorganic chemistry', 'Pearson Edexcel International GCSE Chemistry 2 Inorganic chemistry', FALSE, 2
FROM specification s WHERE s.spec_code='4CH1' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '3', 'Physical chemistry', 'Pearson Edexcel International GCSE Chemistry 3 Physical chemistry', FALSE, 3
FROM specification s WHERE s.spec_code='4CH1' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper 1 & 2'), 1, '4', 'Organic chemistry', 'Pearson Edexcel International GCSE Chemistry 4 Organic chemistry', FALSE, 4
FROM specification s WHERE s.spec_code='4CH1' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '1', 'States of matter', 'Cambridge IGCSE Chemistry (0620 / 0971) 1 States of matter', FALSE, 1
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '2', 'Atoms, elements and compounds', 'Cambridge IGCSE Chemistry (0620 / 0971) 2 Atoms, elements and compounds', FALSE, 2
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '3', 'Stoichiometry', 'Cambridge IGCSE Chemistry (0620 / 0971) 3 Stoichiometry', FALSE, 3
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '4', 'Electrochemistry', 'Cambridge IGCSE Chemistry (0620 / 0971) 4 Electrochemistry', FALSE, 4
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '5', 'Chemical energetics', 'Cambridge IGCSE Chemistry (0620 / 0971) 5 Chemical energetics', FALSE, 5
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '6', 'Chemical reactions', 'Cambridge IGCSE Chemistry (0620 / 0971) 6 Chemical reactions', FALSE, 6
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '7', 'Acids, bases and salts', 'Cambridge IGCSE Chemistry (0620 / 0971) 7 Acids, bases and salts', FALSE, 7
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '8', 'The Periodic Table', 'Cambridge IGCSE Chemistry (0620 / 0971) 8 The Periodic Table', FALSE, 8
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '9', 'Metals', 'Cambridge IGCSE Chemistry (0620 / 0971) 9 Metals', FALSE, 9
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '10', 'Chemistry of the environment', 'Cambridge IGCSE Chemistry (0620 / 0971) 10 Chemistry of the environment', FALSE, 10
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '11', 'Organic chemistry', 'Cambridge IGCSE Chemistry (0620 / 0971) 11 Organic chemistry', FALSE, 11
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
INSERT INTO spec_topic (specification_id, unit_id, topic_level, topic_number, topic_name, full_spec_reference, separate_science_only, display_order)
SELECT s.specification_id, (SELECT unit_id FROM spec_unit u WHERE u.specification_id=s.specification_id AND u.unit_code='Paper-agnostic'), 1, '12', 'Experimental techniques and chemical analysis', 'Cambridge IGCSE Chemistry (0620 / 0971) 12 Experimental techniques and chemical analysis', FALSE, 12
FROM specification s WHERE s.spec_code='0620' AND s.board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');

INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Foundation & Higher tiers; 2 written papers (Paper 1, Paper 2), each 1h45', 'seed' FROM specification WHERE spec_code='8462' AND board_id=(SELECT board_id FROM exam_board WHERE code='AQA');
INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Foundation & Higher tiers; 2 written papers, each 1h40', 'seed' FROM specification WHERE spec_code='1CH0' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL');
INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Foundation & Higher tiers; 2 written papers, each 1h45', 'seed' FROM specification WHERE spec_code='J248' AND board_id=(SELECT board_id FROM exam_board WHERE code='OCR');
INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Foundation & Higher tiers; Component 1 & 2 written, Component 3 practical', 'seed' FROM specification WHERE spec_code='C500QS' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDUQAS');
INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Foundation & Higher tiers; Unit 1 & 2 written, Unit 3 practical (externally marked)', 'seed' FROM specification WHERE spec_code='C500QS/WJEC' AND board_id=(SELECT board_id FROM exam_board WHERE code='WJEC');
INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Paper 1 (core) & Paper 2 (all content, incl. ''C'' depth material)', 'seed' FROM specification WHERE spec_code='4CH1' AND board_id=(SELECT board_id FROM exam_board WHERE code='EDEXCEL_INTL');
INSERT INTO board_style_profile (specification_id, typical_paper_structure_notes, updated_by) SELECT specification_id, 'Core & Extended tiers; Papers 1–6 depending on tier/route, incl. practical alternative', 'seed' FROM specification WHERE spec_code='0620' AND board_id=(SELECT board_id FROM exam_board WHERE code='CAIE');
