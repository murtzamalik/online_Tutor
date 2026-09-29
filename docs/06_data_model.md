# 06 · Data Model

PostgreSQL 16 + pgvector. **Source of truth: `db/migrations/V001…V011` (Flyway).** Run order is the numeric order. All 11 migrations were executed end-to-end on a clean Postgres 16 + pgvector during pack creation. Do not edit applied migrations — add `V012+`.

## Conventions
- Snake_case; `TIMESTAMPTZ`; UUID PKs for externally-exposed entities (`gen_random_uuid()`), bigint identity for catalogue/content.
- `updated_at` maintained by trigger `set_updated_at`.
- Money as integer pence (GBP). Enumerations as `TEXT CHECK (… IN (…))` (no PG enums, easier to evolve).
- Learner-owned rows cascade on student delete (deletion flow, PF-14); audit rows never.
- `audit_log` is append-only and hash-chained (triggers block UPDATE/DELETE/TRUNCATE).
- RLS on school-tenant tables via `rls_school_ok(school_id)`; app sets `app.school_id` / `app.rls_bypass` per transaction (`V011`).
- Roles: `tutor_app` (application), `tutor_gateway` (AI tables only), `tutor_readonly` (analytics allow-list).
- Vector: `question_embedding.embedding vector(768)` + HNSW (cosine). Embedding model name stored with each row.


## V001__reference_and_catalog.sql
V001 — Reference data, specification tree, board style profiles, catalogue

| Table | Columns | Notes |
|---|---|---|
| `qualification` | 7 | qualification_id, code, display_name, typical_age_min, typical_age_max, visual_tier, created_at |
| `exam_board` | 6 | board_id, code, display_name, country_scope, official_site_url, created_at |
| `subject` | 7 | subject_id, code, display_name, is_combined_science, subject_profile, is_pilot, created_at |
| `specification` | 12 | specification_id, qualification_id, board_id, subject_id, spec_code, title, tier_scheme, first_teaching_year… |
| `spec_unit` | 11 | unit_id, specification_id, unit_code, unit_name, sequence_order, assessment_weight_pct, duration_minutes, total_marks… |
| `spec_topic` | 15 | topic_id, specification_id, unit_id, parent_topic_id, topic_level, topic_number, topic_name, spec_statement… |
| `board_style_profile` | 12 | style_profile_id, specification_id, question_wording_notes, mark_scheme_format_notes, command_words_json, typical_paper_structure_notes, fixed_phrases_json, units_and_notation_json… |
| `spec_point_objective` | 11 | objective_id, spec_topic_id, objective_text, allowed_question_types, allowed_command_words, mark_min, mark_max, tier… |
| `grade_boundary` | 7 | boundary_id, specification_id, tier, series, grade, min_percent, source_url |
| `exam_date` | 6 | exam_date_id, qualification_id, region, exam_name, exam_on, notes |
| `pricing_plan` | 9 | plan_id, code, display_name, tab, features_json, includes_mock_tests, max_subjects, sort_order… |
| `pricing_price` | 11 | price_id, plan_id, qualification_id, year_group, billing_cycle, amount_pence, currency, stripe_price_id… |
| `feature_flag` | 6 | flag_key, enabled, audience_json, description, updated_by, updated_at |
| `app_config` | 4 | config_key, value_json, description, updated_at |

## V002__identity_consent.sql
V002 — Schools (core row), accounts, learners, auth, MFA, age assurance, consent, privacy

| Table | Columns | Notes |
|---|---|---|
| `school` | 9 | school_id, name, urn, region, email_domain, status, seats_purchased, created_at… |
| `account` | 16 | account_id, email, password_hash, display_name, kind, status, email_verified_at, mfa_required… |
| `account_role` | 7 | account_id, role, 'PARENT','STUDENT','TEACHER','SCHOOL_ADMIN','BUSINESS_MANAGER',, 'CONTENT_ADMIN','REVIEWER','OPS_REVIEWER','SUPPORT','COMPLIANCE','AI_ENGINEER',, 'SAFEGUARDING_LEAD','PRODUCT_OWNER','BUSINESS_OWNER','PLATFORM_ADMIN')),, granted_by, granted_at |
| `school_member` | 4 | school_id, account_id, role, created_at |
| `student_profile` | 13 | student_id, display_name, login_account_id, school_id, year_group, birth_month, age_band, visual_tier… |
| `parent_student_link` | 5 | parent_account_id, student_id, relationship, is_primary, created_at |
| `student_credential` | 8 | credential_id, student_id, kind, secret_hash, login_handle, failed_attempts, locked_until, created_at |
| `auth_session` | 12 | session_id, account_id, student_id, token_family_id, refresh_hash, user_agent, ip_hash, mfa_satisfied… |
| `mfa_factor` | 6 | factor_id, account_id, type, secret_enc, confirmed_at, created_at |
| `mfa_recovery_code` | 4 | code_id, account_id, code_hash, used_at |
| `email_verification` | 7 | verification_id, account_id, code_hash, attempts, sent_at, expires_at, verified_at |
| `password_reset` | 6 | reset_id, account_id, token_hash, created_at, expires_at, used_at |
| `oidc_identity` | 6 | account_id, provider, subject, tenant_id, email, created_at |
| `age_assurance_record` | 8 | record_id, account_id, method, outcome, provider_ref, evidence_json, created_at, completed_at |
| `legal_document` | 7 | document_id, slug, version, title, body_md, is_current, published_at |
| `consent_record` | 10 | consent_id, account_id, student_id, consent_type, document_version, granted, granted_at, withdrawn_at… |
| `voice_consent` | 7 | voice_consent_id, student_id, parent_account_id, text_version, google_processing_acknowledged, granted_at, withdrawn_at |
| `cookie_consent` | 5 | cookie_consent_id, visitor_id, categories_json, policy_version, created_at |
| `privacy_settings` | 6 | student_id, telemetry_level, cohort_benchmark_opt_in, teacher_visibility, updated_by, updated_at |
| `parent_ai_controls` | 8 | student_id, chat_enabled, voice_enabled, daily_minutes_limit, quiet_hours_json, daily_goal_nudge, updated_by, updated_at |
| `deletion_request` | 9 | deletion_id, student_id, requested_by, scope, status, requested_at, scheduled_for, completed_at… |
| `data_export_request` | 7 | export_id, student_id, requested_by, status, file_key, requested_at, expires_at |

## V003__billing.sql
V003 — Billing (Stripe): subscriptions, entitlements, invoices, dunning, refunds, referrals

| Table | Columns | Notes |
|---|---|---|
| `billing_customer` | 6 | account_id, stripe_customer_id, default_pm_brand, default_pm_last4, default_pm_exp, created_at |
| `subscription` | 19 | subscription_id, account_id, plan_id, stripe_subscription_id, status, billing_cycle, trial_started_at, trial_ends_at… |
| `subscription_item` | 6 | item_id, subscription_id, student_id, subject_id, qualification_id, removed_at |
| `entitlement` | 8 | entitlement_id, student_id, subject_id, qualification_id, source, includes_mock_tests, valid_from, valid_until |
| `promo_code` | 8 | promo_code_id, code, percent_off, months, max_redemptions, redeemed_count, valid_until, stripe_coupon_id |
| `invoice` | 17 | invoice_id, account_id, subscription_id, stripe_invoice_id, number, status, currency, subtotal_pence… |
| `payment_attempt` | 9 | attempt_id, subscription_id, invoice_id, stripe_payment_intent_id, status, failure_code, dunning_step, attempted_at… |
| `refund` | 7 | refund_id, invoice_id, amount_pence, reason, issued_by, stripe_refund_id, created_at |
| `referral` | 7 | referral_id, referrer_account_id, code, referee_account_id, status, reward_json, created_at |
| `stripe_event` | 6 | stripe_event_id, type, payload, received_at, processed_at, error |

## V004__content_questions.sql
V004 — Questions, mark schemes, past papers & ingestion, generation pipeline, QC, embeddings,

| Table | Columns | Notes |
|---|---|---|
| `past_paper` | 22 | paper_id, specification_id, unit_id, series, exam_year, tier, paper_code, title… |
| `calc_template` | 7 | template_id, spec_topic_id, objective_id, template_json, status, prompt_version, created_at |
| `diagram_asset` | 9 | diagram_id, title, description, category, board_scope, svg_key, alt_text, approved… |
| `question` | 34 | question_id, specification_id, topic_id, objective_id, source_type, source_reference, past_paper_id, parent_question_id… |
| `mark_scheme` | 12 | mark_scheme_id, question_id, scheme_type, total_marks, marking_points_json, levels_json, indicative_content_json, model_answer… |
| `past_paper_item` | 13 | item_id, paper_id, question_id, q_ref, page_start, page_end, bbox_json, raw_text… |
| `ingestion_job` | 10 | job_id, paper_id, stage, status, prompt_versions_json, stats_json, error, started_at… |
| `spec_document` | 6 | doc_id, specification_id, file_key, source_url, extract_status, created_at |
| `generation_run` | 7 | run_id, kind, batch_api_id, started_at, finished_at, stats_json, triggered_by |
| `blueprint` | 15 | blueprint_id, run_id, spec_topic_id, objective_id, tier, question_type, marks, command_word… |
| `question_generation_log` | 12 | generation_id, question_id, blueprint_id, model_name, style_profile_id, grounding_reference_ids, target_grade, variant_kind… |
| `calc_instance` | 10 | instance_id, template_id, question_id, seed, variables_json, steps_json, final_answer, final_unit… |
| `qc_check_result` | 8 | result_id, question_id, check_id, prompt_version, passed, score, issues_json, run_at |
| `question_embedding` | 5 | question_id, embedding, embedding_model, source_kind, created_at |
| `revision_note` | 9 | note_id, spec_topic_id, version, body_md, reading_level, status, prompt_version, grounding_json… |
| `flashcard_deck` | 7 | deck_id, kind, owner_student_id, spec_topic_id, title, moderation_status, created_at |
| `flashcard` | 8 | card_id, deck_id, front, back, source_note_id, position, status, created_at |
| `deck_share` | 6 | share_code, deck_id, created_by, expires_at, revoked_at, created_at |
| `cheat_sheet` | 6 | sheet_id, spec_topic_id, content_json, status, prompt_version, created_at |
| `marketing_resource` | 7 | resource_id, title, kind, email_gated, file_key, body_md, published |
| `lead_capture` | 6 | lead_id, email, resource_id, source_page, marketing_consent, created_at |
| `case_study` | 7 | case_id, title, body_md, before_after_json, consent_evidence_key, approved, published_at |
| `faq_item` | 6 | faq_id, category, question, answer_md, sort_order, published |
| `outcome_stat` | 7 | stat_id, label, value_text, methodology_md, sample_size, as_of, published |
| `help_article` | 10 | article_id, slug, title, body_md, audience, tags, published, helpful_yes… |

## V005__learning_marking_mastery.sql
V005 — Enrolment, practice sessions, responses, mock papers, diagnostics, plans,

| Table | Columns | Notes |
|---|---|---|
| `student_enrolment` | 12 | enrolment_id, student_id, specification_id, tier, goal_type, goal_detail_json, target_grade, exam_date… |
| `practice_session` | 12 | session_id, student_id, enrolment_id, mode, topic_ids, planned_count, target_grade, assignment_id… |
| `session_question` | 6 | session_question_id, session_id, seq, question_id, selection_reason_json, served_at |
| `answer_photo` | 7 | photo_id, student_id, storage_key, mask_report_json, purpose, retention_until, created_at |
| `mock_paper` | 18 | mock_id, student_id, enrolment_id, source_kind, past_paper_id, spec_unit_id, tier, duration_minutes… |
| `mock_paper_item` | 5 | mock_id, seq, section, question_id, marks |
| `diagnostic_run` | 8 | diagnostic_id, session_id, enrolment_id, status, theta, theta_se, result_json, completed_at |
| `entrance_test_run` | 7 | run_id, session_id, exam_type, status, ability_estimate, result_json, completed_at |
| `daily_goal` | 4 | student_id, target_questions, enabled, updated_at |
| `daily_goal_progress` | 4 | student_id, day, answered, target |
| `weekly_plan` | 7 | plan_id, student_id, enrolment_id, week_start, rationale_text, status, created_at |
| `weekly_plan_item` | 7 | item_id, plan_id, day_of_week, topic_id, activity_kind, minutes, completed_at |
| `saved_quiz_set` | 6 | set_id, student_id, title, topic_ids, question_count, created_at |
| `student_response` | 25 | response_id, student_id, question_id, session_id, mock_id, qualification_code, answer_input_mode, answer_text… |
| `marking_result` | 14 | result_id, response_id, kind, is_final, prompt_version, model, marks_total, confidence… |
| `dispute` | 6 | dispute_id, response_id, student_id, reason_code, reason_text, created_at |
| `marking_exception` | 14 | exception_id, response_id, trigger, status, assigned_to, original_marks, final_marks, resolution… |
| `marking_review_queue` | 14 | review_id, response_id, anonymous_ref, specification_id, status, ai_marks, final_marks, claimed_by… |
| `gold_set_item` | 13 | gold_id, question_id, specification_id, question_type, answer_text, answer_photo_key, examiner_points_json, examiner_total… |
| `bkt_params` | 6 | topic_id, p_init, p_learn, p_slip, p_guess, fitted_at |
| `mastery_state` | 16 | mastery_id, student_id, topic_id, model_type, mastery_probability, mastery_level, irt_theta, irt_se… |
| `misconception_observation` | 7 | observation_id, student_id, response_id, topic_id, misconception_code, plain_english, occurred_at |
| `predicted_grade_snapshot` | 10 | snapshot_id, student_id, enrolment_id, grade_low, grade_high, grade_point, confidence, method_version… |
| `cohort_benchmark_snapshot` | 7 | snapshot_id, specification_id, topic_id, period, percentile_edges_json, sample_size, computed_at |
| `flashcard_state` | 8 | student_id, card_id, stability, difficulty, reps, lapses, due_at, last_review_at |
| `flashcard_review` | 5 | review_id, student_id, card_id, rating, reviewed_at |
| `engagement_event` | 11 | event_id, student_id, session_id, event_type, 'QUESTION_SHOWN','FIRST_INPUT','ANSWER_CHANGED','IDLE_DETECTED','TAB_HIDDEN','TAB_VISIBLE',, 'HINT_REQUESTED','HINT_OFFERED','FOCUS_SHIFT_OFFERED','FOCUS_SHIFT_ACCEPTED','CONFUSION_RESCUE_TRIGGERED',, 'SURPRISE_QUIZ_SERVED','CONFIDENCE_PROMPT_SHOWN','CONFIDENCE_GIVEN','BREAK_SUGGESTED')),, related_topic_id… |
| `engagement_daily` | 8 | student_id, day, minutes_active, questions_answered, idle_events, nudges_offered, nudges_accepted, engagement_score |
| `nudge` | 9 | nudge_id, student_id, session_id, kind, trigger_json, status, return_token, offered_at… |
| `surprise_quiz` | 9 | quiz_id, student_id, session_id, topic_ids, reason, status, result_json, served_at… |

## V006__tutor_safety_ai_platform.sql
V006 — AI tutor (chat + voice), hints, safety & safeguarding, AI Gateway logs,

| Table | Columns | Notes |
|---|---|---|
| `prompt_version` | 16 | prompt_version_id, prompt_id, version, task_key, body_text, schema_ref, model_tier, temperature… |
| `model_routing` | 8 | task_key, model_tier, vendor, model_id, params_json, fallback_model_id, updated_by, updated_at |
| `ai_gateway_log` | 18 | log_id, request_token, task_key, prompt_id, prompt_version, vendor, model, route… |
| `ai_gateway_payload` | 3 | log_id, outbound_json, expires_at |
| `redaction_event` | 7 | redaction_id, log_id, kind, method, span_hash, placeholder, created_at |
| `boundary_attestation` | 5 | attestation_id, day, checks_json, passed, created_at |
| `ai_request_map` | 4 | request_token, correlation_type, correlation_id, created_at |
| `ai_usage_cost` | 8 | day, task_key, vendor, model, calls, tokens_in, tokens_out, cost_pence |
| `ai_budget` | 7 | budget_id, period, task_key, metric, budget_value, alert_at_pct, set_by |
| `eval_run` | 19 | eval_id, prompt_version_id, task_key, model_id, dataset, n_items, point_accuracy, exact_total_agreement… |
| `eval_result` | 8 | eval_id, gold_id, ai_points_json, ai_total, points_agreed, points_total, exact_total, over_marked |
| `tutor_session` | 14 | tutor_session_id, student_id, enrolment_id, topic_id, question_id, response_id, channel, mode… |
| `tutor_message` | 11 | message_id, tutor_session_id, seq, role, channel, content_text, ai_visible_text, blocked… |
| `voice_session` | 10 | voice_session_id, tutor_session_id, voice_consent_id, stt_seconds, tts_characters, p50_turn_latency_ms, p95_turn_latency_ms, end_reason… |
| `hint_event` | 8 | hint_id, student_id, question_id, session_id, level, hint_text, prompt_version, created_at |
| `safety_classification` | 14 | classification_id, tutor_message_id, response_id, deck_id, direction, categories_json, severity, welfare_disclosure… |
| `safety_flag` | 14 | flag_id, flag_ref, classification_id, student_id, tutor_session_id, category, severity, status… |
| `safeguarding_disclosure_log` | 12 | disclosure_id, flag_id, student_id, school_id, dsl_account_id, category, status, summary… |
| `safeguarding_action` | 6 | action_id, disclosure_id, actor_account_id, action_type, note, created_at |

Views: `voice_session_transcript`

## V007__school_b2b.sql
V007 — Schools (B2B): classes, pupils, assignments, rostering, SSO/MIS, DPA, PO/invoices,

| Table | Columns | Notes |
|---|---|---|
| `school_class` | 11 | class_id, school_id, name, year_group, subject_id, specification_id, academic_year, source… |
| `class_teacher` | 3 | class_id, account_id, is_owner |
| `class_pupil` | 5 | class_id, student_id, external_ref, joined_at, left_at |
| `assignment` | 13 | assignment_id, class_id, created_by, title, kind, topic_ids, question_count, is_adaptive… |
| `assignment_target` | 7 | assignment_id, student_id, status, session_id, score_pct, started_at, completed_at |
| `roster_import` | 9 | import_id, school_id, source, file_key, status, stats_json, created_by, created_at… |
| `roster_import_row` | 7 | row_id, import_id, row_no, raw_json, status, message, student_id |
| `mis_connection` | 7 | mis_id, school_id, provider, external_school_id, status, last_sync_at, config_enc |
| `sso_connection` | 8 | sso_id, school_id, provider, domain, tenant_id, enabled, audience, created_at |
| `school_dpa_status` | 5 | school_id, status, template_version, sent_at, signed_at |
| `school_dpa_signature` | 9 | signature_id, school_id, signer_account_id, signer_name, signer_role, template_version, signed_at, ip_hash… |
| `sub_processor` | 8 | sub_processor_id, name, purpose, data_categories, location, dpa_url, receives_personal_data, active |
| `purchase_order` | 11 | po_id, school_id, po_number, seats, amount_pence, valid_from, valid_to, file_key… |
| `school_invoice` | 17 | school_invoice_id, school_id, po_id, stripe_invoice_id, number, period_start, period_end, pupil_count… |
| `kcsie_confirmation` | 6 | confirmation_id, school_id, pack_version, answers_json, confirmed_by, confirmed_at |
| `safeguarding_contact` | 6 | contact_id, school_id, name, role, email, phone |
| `staff_vetting_record` | 9 | vetting_id, account_id, provider, check_type, status, provider_ref, issued_on, next_review_on… |

## V008__reporting_support_audit.sql
V008 — Reports, alerts, notifications, support (notes/chat), append-only audit log, outbox

| Table | Columns | Notes |
|---|---|---|
| `weekly_report` | 10 | report_id, student_id, week_start, facts_json, parent_text_md, student_text_md, prompt_versions_json, status… |
| `alert` | 9 | alert_id, student_id, kind, topic_id, severity, message, detail_json, status… |
| `notification` | 10 | notification_id, recipient_account_id, recipient_student_id, kind, title, body, deep_link, data_json… |
| `notification_preference` | 4 | account_id, channel, kind, enabled |
| `device_registration` | 7 | device_id, account_id, student_id, onesignal_id, platform, created_at, last_seen_at |
| `support_note` | 5 | note_id, account_id, author_id, body, created_at |
| `support_chat_session` | 7 | chat_id, account_id, status, assigned_to, topic, created_at, resolved_at |
| `support_chat_message` | 5 | message_id, chat_id, sender, body, created_at |
| `audit_log` | 13 | audit_id, occurred_at, actor_account_id, actor_role, action, target_type, target_id, school_id… |
| `outbox_event` | 7 | outbox_id, stream, event_type, aggregate_id, payload_json, created_at, published_at |

## V009__seed_reference.sql
V009 — Seed data (generated from GCSE_iGCSE_Chemistry_Pilot_Scaffold.xlsx + baseline decisions)


## V010__seed_config.sql
V010 — Seed: feature flags, config, pricing catalogue (placeholder amounts), sub-processors, model routing.


## V011__roles_and_rls.sql
V011 — Database roles, grants and row-level security (defence in depth)



**Total tables: 147.** ERD generation: run `SchemaSpy` or `pg_dump --schema-only` against local DB; commit generated ERD under `docs/erd/` in Wave 0.


## Key design points Cursor must preserve
1. `prompt_version`: partial unique index → exactly one LIVE version per `prompt_id`.
2. `ai_gateway_log` holds metadata only; `ai_gateway_payload` holds the exact redacted payload for 14 days (purge job) — never joined to learner tables.
3. `student_response` → `marking_result` (per point) → `marking_exception` / `marking_review_queue`; A-Level rows carry `provisional=true` until released.
4. `mastery_state` per (student, topic); `bkt_params` per topic; `flashcard_state` uses FSRS fields.
5. `entitlement` is derived from Stripe events only (never trusted from the client).
6. `consent_record` gates child profile activation (<13); `voice_consent` gates voice.
7. School tables: every query goes through a repository that sets `app.school_id`; tests assert zero cross-school rows.
8. `question` carries `source_type` (PAST_PAPER | AI_GENERATED | MANUAL), `review_status`, `licence` lineage; approved-only serving.
