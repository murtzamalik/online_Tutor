-- V010 — Seed: feature flags, config, pricing catalogue (placeholder amounts), sub-processors, model routing.
-- Amounts in pricing_price are PLACEHOLDERS taken from brief v3 §6 ("approx.") and MUST be confirmed by the client (open item OI-04).

INSERT INTO feature_flag (flag_key, enabled, description) VALUES
 ('voice_tutor', TRUE,  'Voice tutor (client Round 1: day 1). Also requires per-child voice consent + parent toggle.'),
 ('a_level_review', FALSE,'A-Level provisional marking + mandatory review workbench. Turn on at A-Level go-live once reviewers are vetted (P-1).'),
 ('gamification_phase2', FALSE,'Badges, streaks, XP (K-01). Client Round 1: held back to Phase 2. MUST stay off in MVP.'),
 ('tutor_marketplace', FALSE,'N-01…N-03. Won''t (yet).'),
 ('cohort_benchmark', FALSE,'H-07 anonymised cohort benchmark; only meaningful once n >= 50 per cell.'),
 ('mock_papers', TRUE,  'D-02/D-03/D-11 mock papers (plan tier Exam Prep Plus).'),
 ('entrance_test_11plus', FALSE,'D-04 11+ adaptive entrance test (Phase 3).'),
 ('wonde_mis', FALSE,  'Wonde MIS rostering adapter (needs commercial agreement); CSV import is always on.'),
 ('live_chat', FALSE,  'P-02 in-house support chat (Phase 2).'),
 ('photo_marking', TRUE,'Photo-of-working marking (masking pipeline must be on).'),
 ('surprise_quiz', TRUE,'G-01 surprise micro-quizzes.'),
 ('referrals', FALSE,  'C-07 referral programme (Phase 3).'),
 ('micro_subscriptions', FALSE,'C-06 single-subject plan (Phase 3).');

INSERT INTO app_config (config_key, value_json, description) VALUES
 ('retention.tutor_voice_days',      '30',  'Voice transcripts kept 30 days (D-20, H-09)'),
 ('retention.tutor_chat_days',       '90',  'Chat transcripts (starting value; confirm in DPIA)'),
 ('retention.answer_photo_days',     '30',  'Masked answer photos kept for disputes'),
 ('retention.engagement_event_days', '90',  'Raw engagement events before aggregation'),
 ('retention.ai_gateway_payload_days','14', 'Exact redacted outbound payloads for the DPO (Q-02)'),
 ('retention.audit_log_years',       '7',   'Append-only audit (P-04)'),
 ('marking.a_level_review_sla_hours','48',  'F-05 SLA'),
 ('marking.exception_sla_hours',     '72',  'F-10 SLA'),
 ('marking.confidence_low_threshold','0.70','Below this → LOW_CONFIDENCE exception (starting value; tune on gold set)'),
 ('marking.pass_disagreement_marks', '1',   'Passes differing by >= this many marks → exception'),
 ('marking.gate_min_accuracy',       '0.95','Q-03 promotion gate'),
 ('bank.min_items_per_cell',         '12',  'See question_generation README §6'),
 ('engagement.stall_seconds_default','120', 'Per-topic calibrated later'),
 ('engagement.max_nudges_per_session','3',  'AADC: no nudge pressure'),
 ('auth.picture_pin_max_failures',   '5',   'Lockout + parent notification (B-11)'),
 ('auth.email_code_ttl_minutes',     '15',  'B-10'),
 ('auth.email_resend_cooldown_seconds','60','B-10'),
 ('billing.trial_days',              '7',   'Confirm with client (OI-04)'),
 ('billing.trial_reminder_days_before','3', 'DMCC trial-end reminder'),
 ('billing.dunning_grace_days',      '14',  'Child keeps access while card is fixed (C-09)'),
 ('deletion.cooling_off_days',       '14',  'L-02'),
 ('cohort.min_sample_size',          '50',  'k-anonymity floor for H-07');

INSERT INTO pricing_plan (code, display_name, tab, features_json, includes_mock_tests, max_subjects, sort_order) VALUES
 ('ENGLISH_MATHS_SCIENCE','English, Maths, Science','GCSE_IGCSE','{"subjects":"3 core","mock_tests":false}',FALSE,3,1),
 ('EXAM_PREP','Exam Prep','GCSE_IGCSE','{"subjects":"all","mock_tests":false}',FALSE,NULL,2),
 ('EXAM_PREP_PLUS','Exam Prep Plus','GCSE_IGCSE','{"subjects":"all","mock_tests":true,"printable_papers":true}',TRUE,NULL,3);
-- NOTE: brief v3 gives the same three tiers per tab; add AGES_7_11 and A_LEVEL plan rows from the same template once prices are confirmed.
INSERT INTO pricing_price (plan_id, billing_cycle, amount_pence, school_per_pupil_pence)
SELECT plan_id, 'MONTHLY', v.m, NULL FROM pricing_plan p JOIN (VALUES ('ENGLISH_MATHS_SCIENCE',3999),('EXAM_PREP',5999),('EXAM_PREP_PLUS',6999)) v(code,m) ON v.code=p.code;
INSERT INTO pricing_price (plan_id, billing_cycle, amount_pence)
SELECT plan_id, 'YEARLY', v.m FROM pricing_plan p JOIN (VALUES ('ENGLISH_MATHS_SCIENCE',3199*12),('EXAM_PREP',4799*12),('EXAM_PREP_PLUS',5599*12)) v(code,m) ON v.code=p.code;

INSERT INTO sub_processor (name, purpose, data_categories, location, receives_personal_data) VALUES
 ('Anthropic (Claude API)','AI marking, question generation, tutoring, safety classification','Question text, redacted learner answers, random per-request token — no identity data (D-15)','US/EU (per enterprise DPA)',FALSE),
 ('Google Cloud Speech-to-Text / Text-to-Speech','Voice tutor speech recognition and synthesis','Voice audio (separate parent consent, J-06); transcripts kept 30 days','EU/UK region where available',TRUE),
 ('Stripe','Payments, subscriptions, school invoicing','Parent billing details','EU/US',TRUE),
 ('Postmark','Transactional email','Parent/teacher email address and message content','US/EU',TRUE),
 ('OneSignal','Push notifications','Device identifiers, notification content','US/EU',TRUE),
 ('Hetzner','Hosting (self-hosted Docker)','All platform data at rest','EU (Germany/Finland) — UK-only hosting open item P-9',TRUE),
 ('uCheck','Enhanced DBS + Barred List checks','Staff/reviewer vetting data (not learner data)','UK',TRUE);

INSERT INTO legal_document (slug, version, title, body_md, is_current, published_at) VALUES
 ('terms','0.0-placeholder','Terms of Service','# Terms of Service

Placeholder — legal text supplied by the client''s solicitor before launch (tracker: Legal / IP).',FALSE,NULL),
 ('privacy','0.0-placeholder','Privacy Policy','# Privacy Policy

Placeholder.',FALSE,NULL),
 ('ai-data','0.0-placeholder','How we use AI with your data','# AI and your data

Placeholder — must reflect Requirements Baseline §6 exactly.',FALSE,NULL),
 ('cookies','0.0-placeholder','Cookie Policy','# Cookie Policy

Placeholder.',FALSE,NULL),
 ('safeguarding','0.0-placeholder','Safeguarding Policy','# Safeguarding Policy

Placeholder — KCSIE-mapped pack from the client.',FALSE,NULL);


INSERT INTO model_routing (task_key, model_tier, vendor, model_id, params_json) VALUES
 ('qg.decompose','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('qg.generate','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.9}'::jsonb),
 ('qg.calc_template','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.7}'::jsonb),
 ('qg.qc.grounding','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('qg.qc.tag','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0}'::jsonb),
 ('qg.qc.markscheme','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('qg.qc.duplicate','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0}'::jsonb),
 ('qg.qc.solve','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('qg.qc.weak','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.7}'::jsonb),
 ('qg.qc.mark','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('qg.repair','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('mk.pass_a','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('mk.pass_b','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('mk.levels','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('mk.alevel','large','ANTHROPIC','claude-opus-5-5','{"temperature":0}'::jsonb),
 ('mk.chem_assist','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('mk.transcribe','vision','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('mk.feedback','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.3}'::jsonb),
 ('mk.misconception','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0}'::jsonb),
 ('mk.exception_assist','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('tu.turn','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.5}'::jsonb),
 ('tu.hint','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('tu.reexplain','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.5}'::jsonb),
 ('tu.explainback','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('tu.rescue','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.5}'::jsonb),
 ('tu.walkthrough','vision','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('tu.worked_example','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('tu.discussion','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.6}'::jsonb),
 ('vo.summary','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.2}'::jsonb),
 ('sf.input','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('sf.output','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('sf.shared_content','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0}'::jsonb),
 ('sf.disclosure_summary','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('in.segment','vision','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('in.scheme','vision','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('in.metadata','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0}'::jsonb),
 ('in.spec','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('in.style','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.2}'::jsonb),
 ('in.examiner_report','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('rc.notes','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.5}'::jsonb),
 ('rc.flashcards','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.4}'::jsonb),
 ('rc.cheatsheet','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('rc.qc','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0}'::jsonb),
 ('rc.simplify','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.2}'::jsonb),
 ('rp.parent','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.4}'::jsonb),
 ('rp.student','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.5}'::jsonb),
 ('rp.misconception','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.3}'::jsonb),
 ('rp.plan','small','ANTHROPIC','claude-haiku-4-5-20251001','{"temperature":0.3}'::jsonb),
 ('rp.class_insight','large','ANTHROPIC','claude-sonnet-5-5','{"temperature":0.3}'::jsonb),
 ('voice.stt','small','GOOGLE_SPEECH','chirp_2','{"language":"en-GB","streaming":true}'::jsonb),
 ('voice.tts','small','GOOGLE_SPEECH','en-GB-Chirp3-HD','{"speaking_rate":1.0}'::jsonb);
-- Starting model ids are defaults for the pilot. The model per task is decided by the gold-set / fixed-eval gate (Q-03) and changed only in this table (D-28).
