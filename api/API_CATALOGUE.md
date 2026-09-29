# API Catalogue (base path `/api/v1`)

338 endpoints. Conventions in `docs/12_api_contract.md`. Roles legend: PUB public · PAR parent · STU student/child · TCH teacher · SADM school admin · SBM school business manager · CNT content admin · REV A-Level reviewer · OPS ops reviewer · SUP support · CMP compliance · AIE AI engineer · DSL safeguarding lead · OWN product/business owner · SYS service-to-service.


## AUTH

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| AUTH-01 | POST | `/auth/register-parent` | PUB | Create parent account; sends 6-digit email code; records terms consent | account,account_role,email_verification,consent_record |  | B-01 |
| AUTH-02 | POST | `/auth/verify-email` | PUB | Verify code (max 5 attempts, TTL 15 min); activates account | email_verification,account |  | B-10 |
| AUTH-03 | POST | `/auth/verify-email/resend` | PUB | Resend code with 60 s cooldown (rate limited) | email_verification |  | B-10 |
| AUTH-04 | POST | `/auth/login` | PUB | Email+password login; returns tokens or an MFA challenge for MFA-required accounts | account,auth_session |  | Shell-04, Shell-09 |
| AUTH-05 | POST | `/auth/mfa/verify` | PUB | Complete MFA challenge (TOTP or recovery code) | mfa_factor,mfa_recovery_code,auth_session |  | Shell-09 |
| AUTH-06 | POST | `/auth/mfa/enroll/start` | STAFF | Begin TOTP enrolment; returns otpauth URI | mfa_factor |  | Shell-09 |
| AUTH-07 | POST | `/auth/mfa/enroll/confirm` | STAFF | Confirm TOTP; returns 10 recovery codes once | mfa_factor,mfa_recovery_code |  | Shell-09 |
| AUTH-08 | POST | `/auth/mfa/recovery-codes/regenerate` | STAFF | Regenerate recovery codes (requires fresh MFA) | mfa_recovery_code,audit_log |  | Shell-09 |
| AUTH-09 | POST | `/auth/refresh` | PUB | Rotate refresh token (reuse of a rotated token revokes the family) | auth_session |  | Shell-04 |
| AUTH-10 | POST | `/auth/logout` | PAR,STU,TCH,SADM,SBM | Revoke current session | auth_session |  | Shell-04 |
| AUTH-11 | POST | `/auth/password/forgot` | PUB | Send reset link (always 202, no account enumeration) | password_reset |  | Shell-04, Shell-09 |
| AUTH-12 | POST | `/auth/password/reset` | PUB | Set new password with token; revokes all sessions | password_reset,account,auth_session |  | Shell-04, Shell-09 |
| AUTH-13 | GET | `/auth/oidc/{provider}/start` | PUB | Start Google/Microsoft sign-in (PKCE); school SSO uses domain match | oidc_identity,sso_connection |  | Shell-04 |
| AUTH-14 | GET | `/auth/oidc/{provider}/callback` | PUB | Complete OIDC; links or creates account; pupils provisioned only if rostered | oidc_identity,account,student_profile |  | Shell-04 |
| AUTH-15 | POST | `/auth/student/picture-pin` | PUB | Child login by handle + picture sequence; lockout after 5 failures and parent notified | student_credential,auth_session,notification |  | B-11, Shell-04 |
| AUTH-16 | POST | `/auth/student/register` | PUB | Standalone student (13+) sign-up; under-13 rejected here | account,student_profile,age_assurance_record |  | B-03 |
| AUTH-17 | GET | `/me` | PAR,STU,TCH,SADM,SBM,STAFF | Profile, roles, visual tier, entitlements, feature flags | account,account_role,student_profile,entitlement,feature_flag |  | Shell-03, Shell-06 |
| AUTH-18 | PATCH | `/me` | PAR,STU,TCH,SADM,SBM,STAFF | Update display name, locale, marketing opt-in | account |  | Shell-06 |
| AUTH-19 | POST | `/me/password/change` | PAR,TCH,SADM,SBM,STAFF | Change password (requires current) | account,auth_session |  | Shell-06 |
| AUTH-20 | GET | `/me/sessions` | PAR,STU,TCH,SADM,SBM,STAFF | List active sessions | auth_session |  | Shell-06 |
| AUTH-21 | DELETE | `/me/sessions/{sessionId}` | PAR,STU,TCH,SADM,SBM,STAFF | Revoke a session | auth_session |  | Shell-06 |

## STU

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| STU-01 | GET | `/students` | PAR | List the parent's children with tier, enrolments, status | student_profile,parent_student_link,student_enrolment |  | B-02, Shell-02 |
| STU-02 | POST | `/students` | PAR | Add child (email-verified parent only); computes age band/tier; under-13 triggers consent gate | student_profile,parent_student_link,parent_ai_controls,privacy_settings,daily_goal |  | B-02 |
| STU-03 | PATCH | `/students/{studentId}` | PAR | Edit first name, year group, avatar | student_profile |  | B-08, Shell-06 |
| STU-04 | PUT | `/students/{studentId}/picture-pin` | PAR | Set/replace picture PIN; returns login handle | student_credential |  | B-02 |
| STU-05 | GET | `/students/{studentId}` | PAR,STU,TCH | Single learner summary | student_profile |  | Shell-06 |
| STU-06 | GET | `/students/{studentId}/enrolments` | PAR,STU | List enrolments (board/subject/goal/target grade) | student_enrolment |  | B-04, C-02, D-02 |
| STU-07 | POST | `/students/{studentId}/enrolments` | PAR,STU | Select qualification/board/subject (checks entitlement) | student_enrolment,entitlement |  | B-04 |
| STU-08 | PATCH | `/enrolments/{enrolmentId}` | PAR,STU | Set goal type, weak-area focus, exam date; parent sets target grade | student_enrolment |  | B-05, B-08 |
| STU-09 | DELETE | `/enrolments/{enrolmentId}` | PAR | End an enrolment (keeps history) | student_enrolment |  | C-05 |
| STU-10 | GET | `/students/{studentId}/accessibility` | PAR,STU | Read accessibility profile | student_profile |  | B-09, J-03, J-04 |
| STU-11 | PUT | `/students/{studentId}/accessibility` | PAR,STU | Dyslexia font, text size, TTS, reduced motion, simplified language, extended-time % | student_profile |  | B-09, J-03 |
| STU-12 | GET | `/students/{studentId}/home` | STU | Student home aggregate (goal, continue, due reviews, recent mastery, assignments) | daily_goal_progress,mastery_state,student_enrolment,assignment_target |  | H-01, Shell-01 |
| STU-13 | GET | `/students/{studentId}/daily-goal` | PAR,STU | Goal tile data | daily_goal,daily_goal_progress |  | D-01, D-08, Shell-01 |
| STU-14 | PUT | `/students/{studentId}/daily-goal` | PAR,STU | Change daily question target | daily_goal |  | B-05, D-08, K-02 |

## AGE

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| AGE-01 | POST | `/age-assurance/start` | PAR | Start adult check via configured provider (pilot: self-declared + consent) | age_assurance_record |  | B-01, B-02, B-03, L-01, L-05 |
| AGE-02 | POST | `/age-assurance/{recordId}/complete` | PAR | Complete check; sets outcome | age_assurance_record |  | B-01, B-03, L-01, L-05 |
| AGE-03 | GET | `/age-assurance/status` | PAR | Current outcome (gates paid features) | age_assurance_record |  | B-01, B-03, L-01, L-05 |

## CON

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| CON-01 | GET | `/consents` | PAR | Consents per child with versions | consent_record,voice_consent |  | L-01 |
| CON-02 | POST | `/students/{studentId}/consents/under13` | PAR | Record verifiable parental consent for under-13 data processing | consent_record |  | B-02, L-01 |
| CON-03 | POST | `/students/{studentId}/consents/voice` | PAR | Separate voice consent incl. Google processing acknowledgement | voice_consent,audit_log |  | H-09, J-01, J-06 |
| CON-04 | DELETE | `/students/{studentId}/consents/voice` | PAR | Withdraw voice consent (ends live voice sessions) | voice_consent |  | H-09, J-06 |
| CON-05 | GET | `/legal/{slug}` | PUB | Current legal document (terms, privacy, ai-data, cookies, safeguarding) | legal_document,sub_processor |  | B-01, B-03, Shell-10 |
| CON-06 | POST | `/cookie-consent` | PUB | Store cookie choices; non-essential default off | cookie_consent |  | A-01, B-01, L-03, Shell-10 |
| CON-07 | GET | `/legal/sub-processors` | PUB | Public sub-processor list (AI-data page) | sub_processor |  | Shell-10 |

## PRV

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| PRV-01 | GET | `/students/{studentId}/privacy` | PAR,STU | Privacy settings (high-privacy defaults visible) | privacy_settings |  | L-03 |
| PRV-02 | PUT | `/students/{studentId}/privacy` | PAR | Change telemetry level, cohort opt-in, teacher visibility | privacy_settings |  | L-03 |
| PRV-03 | POST | `/students/{studentId}/deletion-request` | PAR | Request erasure; 14-day cooling-off | deletion_request |  | L-02 |
| PRV-04 | GET | `/students/{studentId}/deletion-request` | PAR | Status / cancel window | deletion_request |  | L-02 |
| PRV-05 | DELETE | `/students/{studentId}/deletion-request` | PAR | Cancel during cooling-off | deletion_request |  | L-02 |
| PRV-06 | POST | `/students/{studentId}/data-export` | PAR | Request data export (async ZIP) | data_export_request |  | L-02 |
| PRV-07 | GET | `/students/{studentId}/data-export/{exportId}` | PAR | Download when ready | data_export_request |  | L-02 |

## CAT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| CAT-01 | GET | `/catalog/qualifications` | PUB | Qualifications | qualification |  | A-01, A-02, B-04 |
| CAT-02 | GET | `/catalog/boards` | PUB | Boards (filter by qualification/subject) | exam_board,specification |  | A-02, B-04 |
| CAT-03 | GET | `/catalog/subjects` | PUB | Subjects (Combined Science separate) | subject |  | A-02, A-08, B-04 |
| CAT-04 | GET | `/catalog/specifications` | PUB | Specifications by qualification/board/subject | specification |  | A-02, B-04 |
| CAT-05 | GET | `/catalog/specifications/{specificationId}/topics` | PUB,PAR,STU | Topic tree (levels 1–3) | spec_topic,spec_unit |  | A-02, B-04, D-02, M-01, O-04 |
| CAT-06 | GET | `/catalog/exam-dates` | PUB | Exam-date calendar, region filter | exam_date |  | A-08, B-05 |
| CAT-07 | GET | `/catalog/pricing` | PUB | Price matrix by tab × year group × qualification × cycle (rules engine over data) | pricing_plan,pricing_price |  | A-01, A-02, A-09, C-01, C-02 |
| CAT-08 | GET | `/catalog/plans/compare` | PUB,PAR | What is included per plan | pricing_plan |  | C-01, C-04 |

## MKT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| MKT-01 | GET | `/marketing/faq` | PUB | FAQ (11+ Q&As minimum) | faq_item |  | A-03 |
| MKT-02 | POST | `/marketing/leads` | PUB | Email-gate lead capture with consent | lead_capture,marketing_resource |  | A-05 |
| MKT-03 | GET | `/marketing/resources` | PUB | Free resource library (glossary, past-paper index) | marketing_resource,past_paper |  | A-05, A-10 |
| MKT-04 | GET | `/marketing/case-studies` | PUB | Approved, consented case studies only | case_study |  | A-06, A-07 |
| MKT-05 | GET | `/marketing/outcomes` | PUB | Outcome statistics with methodology | outcome_stat |  | A-01, A-06 |
| MKT-06 | POST | `/marketing/plan-quiz` | PUB | Branching quiz → recommended plan (pre-filters C-01) | pricing_plan |  | A-09 |
| MKT-07 | GET | `/marketing/sample-question` | PUB | Anonymous sample question for the homepage | question,mark_scheme |  | A-01, A-04 |
| MKT-08 | POST | `/marketing/sample-question/{questionId}/answer` | PUB | Mark a sample answer anonymously (rate-limited, no storage of identity) | question,marking_result | P-MK-01 | A-01, A-04 |
| MKT-09 | POST | `/marketing/school-demo-request` | PUB | School demo/contact request | lead_capture |  | A-01 |
| MKT-10 | GET | `/marketing/pages/{slug}` | PUB | Marketing page content blocks (qualification/subject pages) | app_config |  | A-02 |

## BIL

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| BIL-01 | POST | `/billing/setup-intent` | PAR | Stripe SetupIntent for trial card capture | billing_customer |  | C-03, C-06 |
| BIL-02 | POST | `/billing/subscriptions` | PAR | Create subscription with trial (plan, cycle, child × subject items) | subscription,subscription_item,entitlement |  | C-03 |
| BIL-03 | GET | `/billing/subscription` | PAR | Current subscription, trial end, next charge | subscription,subscription_item |  | C-05, C-08, C-10, Shell-02 |
| BIL-04 | PATCH | `/billing/subscription` | PAR | Change plan/subjects/cycle with proration preview | subscription,subscription_item,entitlement |  | C-05 |
| BIL-05 | POST | `/billing/subscription/cancel-preview` | PAR | Step 1 of two-click cancel: what ends when | subscription |  | C-08 |
| BIL-06 | POST | `/billing/subscription/cancel` | PAR | Step 2: cancel at period end (no dark patterns) | subscription,audit_log |  | C-08 |
| BIL-07 | POST | `/billing/subscription/reactivate` | PAR | Undo cancel before period end | subscription |  | C-08 |
| BIL-08 | GET | `/billing/invoices` | PAR | Invoices list (one bill across children) | invoice |  | C-10 |
| BIL-09 | GET | `/billing/invoices/{invoiceId}/pdf` | PAR | Invoice PDF (pre-signed URL) | invoice |  | C-10 |
| BIL-10 | POST | `/billing/payment-method/setup` | PAR | New SetupIntent to update card | billing_customer |  | C-08, C-09 |
| BIL-11 | POST | `/billing/payment-method/confirm` | PAR | Attach new card and retry the open invoice | billing_customer,payment_attempt |  | C-08, C-09 |
| BIL-12 | GET | `/billing/dunning` | PAR | Dunning state + grace end (child keeps access) | subscription,payment_attempt |  | C-09 |
| BIL-13 | POST | `/billing/promo/validate` | PAR | Validate promo code | promo_code |  | C-01, C-03 |
| BIL-14 | POST | `/billing/micro-subscriptions` | PAR | Single-subject plan (Phase 3) | subscription,subscription_item |  | C-06 |
| BIL-15 | GET | `/billing/referral` | PAR | Referral code + status | referral |  | C-07 |
| BIL-16 | POST | `/billing/referral/invite` | PAR | Invite friend by email | referral |  | C-07 |
| BIL-17 | POST | `/webhooks/stripe` | SYS | Stripe webhooks (signature verified, idempotent) | stripe_event,subscription,invoice,payment_attempt,entitlement,notification |  | Stripe webhook (signature-verified, idempotent via stripe_event) |
| BIL-18 | POST | `/billing/checkout/plan-preview` | PAR,PUB | Compute price, sibling discount and VAT before payment | pricing_price |  | C-02, C-03, C-05 |

## PRA

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| PRA-01 | POST | `/practice/sessions` | STU | Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT) | practice_session |  | D-01, D-05, D-07, D-09, D-10, I-05 |
| PRA-02 | GET | `/practice/sessions/{sessionId}` | STU | Session state | practice_session,session_question |  | D-01 |
| PRA-03 | GET | `/practice/sessions/{sessionId}/next` | STU | Next question (adaptive selection, bank-first; may trigger on-demand top-up) | question,session_question,mastery_state,question_embedding |  | D-01, I-05 |
| PRA-04 | POST | `/practice/sessions/{sessionId}/answers` | STU | Submit answer (typed/spoken/photo ref/structured) + confidence + telemetry summary; returns result or marking ticket | student_response,mark_scheme,marking_result,mastery_state,outbox_event | P-MK-01,P-MK-03,P-MK-05 | D-01, D-06, D-12, I-05 |
| PRA-05 | GET | `/practice/answers/{responseId}/result` | STU | Poll/SSE for marking result | student_response,marking_result |  | D-01, D-12 |
| PRA-06 | POST | `/practice/photos` | STU | Upload a MASKED photo + mask report (client-side masking mandatory) | answer_photo |  | D-06, F-08 |
| PRA-07 | POST | `/practice/sessions/{sessionId}/hint` | STU | Next hint level (1–3) | hint_event | P-TU-02 | D-01, G-03 |
| PRA-08 | POST | `/practice/sessions/{sessionId}/skip` | STU | Skip (not allowed in entrance test/diagnostic) | session_question |  | D-01 |
| PRA-09 | POST | `/practice/sessions/{sessionId}/end` | STU | End session; returns summary | practice_session |  | D-01 |
| PRA-10 | POST | `/practice/multi-version` | STU | Several re-randomised versions of the same topic/difficulty | calc_instance,question |  | D-05 |
| PRA-11 | GET | `/students/{studentId}/wrong-answers` | STU | Wrong-answers-only pool | student_response,question |  | D-09 |
| PRA-12 | GET | `/students/{studentId}/quiz-sets` | STU | Saved custom quiz sets | saved_quiz_set |  | D-07 |
| PRA-13 | POST | `/students/{studentId}/quiz-sets` | STU | Save a custom mixed-topic quiz | saved_quiz_set |  | D-07 |
| PRA-14 | GET | `/students/{studentId}/topics` | STU,PAR,TCH | Topic list with mastery ring per topic | spec_topic,mastery_state |  | D-07 |
| PRA-15 | GET | `/students/{studentId}/topics/{topicId}` | STU,PAR,TCH | Topic detail + question history | spec_topic,student_response,mastery_state |  | H-06 |
| PRA-16 | GET | `/search` | STU | In-app search across topics, notes, decks, past papers | spec_topic,revision_note,flashcard_deck,past_paper |  | Shell-03, Shell-08 |
| PRA-17 | POST | `/practice/sessions/{sessionId}/mode` | STU | Toggle input mode/simplified language for the current question (no re-marking) | session_question |  | D-01, D-10 |

## DIA

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| DIA-01 | POST | `/diagnostics` | STU | Start adaptive baseline (IRT), no skip/back | practice_session,diagnostic_run |  | B-06 |
| DIA-02 | GET | `/diagnostics/{diagnosticId}/next` | STU | Next adaptive item | diagnostic_run,question |  | B-06 |
| DIA-03 | POST | `/diagnostics/{diagnosticId}/answers` | STU | Answer; updates theta | student_response,diagnostic_run |  | B-06 |
| DIA-04 | GET | `/diagnostics/{diagnosticId}/result` | STU,PAR | Results + starting mastery + recommended tier | diagnostic_run,mastery_state |  | B-06 |

## ENT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| ENT-01 | POST | `/entrance-tests` | STU | Start adaptive 11+ entrance test (locked-down rules) | entrance_test_run,practice_session |  | D-04 |
| ENT-02 | GET | `/entrance-tests/{runId}/next` | STU | Next item (no back) | entrance_test_run,question |  | D-04 |
| ENT-03 | POST | `/entrance-tests/{runId}/answers` | STU | Answer (no skip) | student_response,entrance_test_run |  | D-04 |
| ENT-04 | GET | `/entrance-tests/{runId}/result` | STU,PAR | Result | entrance_test_run |  | D-04 |

## MOC

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| MOC-01 | POST | `/mock-papers` | STU | Assemble mock (GENERATED or REAL_PAPER) with structure/timing/weighting | mock_paper,mock_paper_item |  | D-02, J-04 |
| MOC-02 | GET | `/mock-papers/{mockId}` | STU | Paper in authentic layout | mock_paper,mock_paper_item,question,past_paper_item |  | D-03 |
| MOC-03 | POST | `/mock-papers/{mockId}/start` | STU | Start clock (extended-time aware) | mock_paper |  | D-03 |
| MOC-04 | PUT | `/mock-papers/{mockId}/answers/{seq}` | STU | Autosave an answer | student_response |  | D-03 |
| MOC-05 | POST | `/mock-papers/{mockId}/submit` | STU | Submit; queues marking of all answers | mock_paper,student_response |  | D-03 |
| MOC-06 | GET | `/mock-papers/{mockId}/results` | STU,PAR | Topic breakdown of lost marks + targeted drill link | mock_paper,student_response,marking_result |  | D-11 |
| MOC-07 | POST | `/mock-papers/{mockId}/photo-pages` | STU | Photograph completed printed paper pages (masked) → answers | answer_photo,student_response | P-MK-06 | D-03, D-06 |
| MOC-08 | GET | `/mock-papers/{mockId}/pdf` | STU,PAR | Printable paper PDF | mock_paper |  | D-11 |
| MOC-09 | GET | `/students/{studentId}/mock-papers` | STU,PAR | History | mock_paper |  | B-06 |

## PLN

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| PLN-01 | POST | `/students/{studentId}/weekly-plan/generate` | STU,PAR | Build plan (code) from subject/board/date/mastery; AI writes rationale text only | weekly_plan,weekly_plan_item | P-RP-04 | B-07 |
| PLN-02 | GET | `/students/{studentId}/weekly-plan` | STU,PAR | Current plan | weekly_plan,weekly_plan_item |  | B-07, Shell-01 |
| PLN-03 | PATCH | `/weekly-plan-items/{itemId}` | STU | Mark complete / move | weekly_plan_item |  | B-07 |

## MRK

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| MRK-01 | GET | `/answers/{responseId}/marking` | STU,PAR | Per-point result, marks, feedback in mark-scheme language | marking_result,student_response |  | D-01, D-11, F-01, F-02, F-09 |
| MRK-02 | GET | `/questions/{questionId}/mark-scheme` | STU | Full scheme reveal (only after an attempt) | mark_scheme,student_response |  | D-11, F-02, F-03 |
| MRK-03 | POST | `/answers/{responseId}/self-mark` | STU | Self-mark against revealed scheme | marking_result |  | F-03 |
| MRK-04 | POST | `/answers/{responseId}/dispute` | STU | "Disagree with this mark" → exception queue | dispute,marking_exception |  | F-01, F-04, F-09, M-03 |
| MRK-05 | GET | `/answers/{responseId}/review-status` | STU | A-Level provisional status, ETA (48 h) | marking_review_queue,student_response |  | F-01, F-04, F-09 |
| MRK-06 | POST | `/answers/{responseId}/self-mark-compare` | STU | Compare self-mark with AI mark (calibration) | marking_result |  | F-03 |

## EXC

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| EXC-01 | GET | `/internal/marking/exceptions` | OPS | F-10 queue (filters: trigger, board, status) | marking_exception,student_response |  | F-10 |
| EXC-02 | GET | `/internal/marking/exceptions/{exceptionId}` | OPS | Anonymised detail: question, scheme, answer, both passes, dispute reason | marking_exception,marking_result,mark_scheme | P-MK-09 | F-10 |
| EXC-03 | POST | `/internal/marking/exceptions/{exceptionId}/claim` | OPS | Claim | marking_exception |  | F-10 |
| EXC-04 | POST | `/internal/marking/exceptions/{exceptionId}/resolve` | OPS | Final marks + note; recompute mastery; optionally add to gold set | marking_exception,marking_result,student_response,gold_set_item,mastery_state,audit_log |  | F-10 |
| EXC-05 | GET | `/internal/marking/systemic-issues` | CNT,OPS,OWN | Aggregate disputes/outcomes by board/topic/question (M-03) | marking_exception,dispute |  | F-10, M-03 |

## REV

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| REV-01 | GET | `/internal/reviews/queue` | REV | A-Level queue with SLA colours (pseudonymous refs only) | marking_review_queue |  | F-05 |
| REV-02 | GET | `/internal/reviews/{reviewId}` | REV | Answer, question, scheme, AI marking trail — never identity | marking_review_queue,marking_result,mark_scheme |  | F-05 |
| REV-03 | POST | `/internal/reviews/{reviewId}/claim` | REV | Claim (prevents double review) | marking_review_queue |  | F-05 |
| REV-04 | POST | `/internal/reviews/{reviewId}/confirm` | REV | Confirm AI mark | marking_review_queue,student_response,marking_result,mastery_state,gold_set_item,audit_log |  | F-05 |
| REV-05 | POST | `/internal/reviews/{reviewId}/adjust` | REV | Adjust per-point marks + reason | marking_review_queue,student_response,marking_result,mastery_state,gold_set_item,audit_log |  | F-05 |
| REV-06 | POST | `/internal/reviews/{reviewId}/release` | REV | Release a claim | marking_review_queue |  | F-05 |
| REV-07 | GET | `/internal/reviews/sla` | REV,OWN | SLA breach view, throughput, agreement rate | marking_review_queue |  | F-05 |

## TUT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| TUT-01 | POST | `/tutor/sessions` | STU | Start chat tutor session (checks parent AI controls and quiet hours) | tutor_session,parent_ai_controls |  | F-06, F-07, J-01 |
| TUT-02 | POST | `/tutor/sessions/{tutorSessionId}/messages` | STU | Learner message → SSE stream of tutor reply (safety-checked before display) | tutor_message,safety_classification,safety_flag | P-SF-01,P-TU-01,P-SF-02 | F-07 |
| TUT-03 | GET | `/tutor/sessions/{tutorSessionId}` | STU,PAR | Session + messages | tutor_session,tutor_message |  | F-07 |
| TUT-04 | POST | `/tutor/sessions/{tutorSessionId}/end` | STU | End | tutor_session |  | F-07 |
| TUT-05 | POST | `/tutor/reexplain` | STU | Re-explain after 2nd wrong attempt in a different format | tutor_message,hint_event | P-TU-03 | F-01, F-06, J-05 |
| TUT-06 | POST | `/tutor/photo-walkthrough` | STU | Photo of a stuck (unattempted) question → step-by-step (Phase 3) | answer_photo,tutor_session | P-TU-06 | F-08 |
| TUT-07 | POST | `/tutor/sessions/{tutorSessionId}/explain-back` | STU | Submit explanation; get evaluation and next hint | tutor_message | P-TU-04 | F-07 |
| TUT-08 | POST | `/tutor/rescue` | SYS | Engagement service triggers confusion-rescue turn | tutor_session,nudge | P-TU-05 | G-04 |

## VOX

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| VOX-01 | POST | `/voice/sessions` | STU | Create voice session (requires voice_consent, parent voice toggle, quiet hours OK) → ws URL + short-lived token | tutor_session,voice_session,voice_consent,parent_ai_controls |  | J-01, J-02 |
| VOX-02 | WS | `/voice/sessions/{voiceSessionId}/stream` | STU | Bidirectional audio + control frames (see docs/11) | tutor_message,voice_session | P-SF-01,P-TU-01,P-VO-01,P-SF-02 | J-01, J-02 |
| VOX-03 | POST | `/voice/sessions/{voiceSessionId}/end` | STU | End and finalise metrics | voice_session,tutor_session | P-VO-02 | J-01, J-02 |
| VOX-04 | POST | `/voice/connectivity-check` | STU,PAR | Mic/network pre-flight (returns error class for J-06) | voice_session |  | D-01, J-01, J-06 |
| VOX-05 | POST | `/voice/sessions/{voiceSessionId}/fallback-to-text` | STU | Switch to chat keeping context | tutor_session |  | J-01, J-06 |

## TRN

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| TRN-01 | GET | `/students/{studentId}/ai-transcripts` | PAR | List chat/voice sessions within retention | tutor_session,voice_session |  | H-02, H-09 |
| TRN-02 | GET | `/students/{studentId}/ai-transcripts/{tutorSessionId}` | PAR | Read-only transcript (audit-logged) | tutor_message,audit_log |  | H-09 |

## PCT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| PCT-01 | GET | `/students/{studentId}/ai-controls` | PAR | Chat/voice toggles, time limits, quiet hours | parent_ai_controls |  | H-09 |
| PCT-02 | PUT | `/students/{studentId}/ai-controls` | PAR | Update controls | parent_ai_controls |  | H-09, K-02 |
| PCT-03 | GET | `/students/{studentId}/ai-usage` | PAR | Minutes used per day | tutor_session,voice_session |  | H-09 |

## ENG

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| ENG-01 | POST | `/engagement/events` | STU | Batch behavioural events (respects telemetry_level) | engagement_event,nudge |  | D-01, D-03, D-08, F-07, G-01, G-02, G-03 |
| ENG-02 | POST | `/engagement/nudges/{nudgeId}/respond` | STU | Accept/dismiss a hint/topic-switch/break nudge | nudge |  | G-03, G-04 |
| ENG-03 | GET | `/students/{studentId}/surprise-quiz` | STU | Fetch pending surprise quiz | surprise_quiz |  | G-01, Shell-01 |
| ENG-04 | POST | `/surprise-quizzes/{quizId}/complete` | STU | Complete/skip and update belief | surprise_quiz,mastery_state |  | G-01 |

## MAS

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| MAS-01 | GET | `/students/{studentId}/mastery` | PAR,STU,TCH | Mastery tree per enrolment (levels 0–3) | mastery_state,spec_topic |  | D-10, H-01, H-06 |
| MAS-02 | GET | `/students/{studentId}/predicted-grades` | PAR,STU | Predicted grade band with interval | predicted_grade_snapshot,grade_boundary |  | B-08, H-01, H-04 |
| MAS-03 | GET | `/students/{studentId}/progress/timeline` | PAR,STU | Mastery/accuracy trend | mastery_state,student_response |  | H-01 |
| MAS-04 | GET | `/students/{studentId}/misconceptions` | PAR,STU | Misconceptions in plain English | misconception_observation |  | H-02 |
| MAS-05 | GET | `/students/{studentId}/cohort-benchmark` | STU,PAR | Anonymised percentile (only if opted in, n ≥ 50) | cohort_benchmark_snapshot,privacy_settings |  | H-07 |
| MAS-06 | GET | `/students/{studentId}/calibration` | PAR,STU | Over/under-confidence summary | mastery_state |  | G-02 |
| MAS-07 | GET | `/students/{studentId}/review-due` | STU | FSRS reviews due | mastery_state,flashcard_state |  | I-01, Shell-01 |
| MAS-08 | GET | `/students/{studentId}/skill-map` | STU | Knowledge map graph | mastery_state,spec_topic |  | H-06 |

## RPT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| RPT-01 | GET | `/parents/home` | PAR | Per-child cards (web + mobile) | student_profile,mastery_state,alert,weekly_report |  | H-10, Shell-02 |
| RPT-02 | GET | `/students/{studentId}/reports/weekly` | PAR,STU | Weekly narrative list | weekly_report |  | H-03 |
| RPT-03 | GET | `/students/{studentId}/reports/weekly/{reportId}` | PAR,STU | One report (parent or student version by caller) | weekly_report |  | H-03 |
| RPT-04 | GET | `/students/{studentId}/action-plan` | PAR | Printable action plan | mastery_state,misconception_observation |  | H-01, H-08 |
| RPT-05 | GET | `/students/{studentId}/alerts` | PAR | Early-warning alerts | alert |  | H-01, H-05, H-10, Shell-02 |
| RPT-06 | POST | `/alerts/{alertId}/ack` | PAR | Acknowledge | alert |  | H-05 |
| RPT-07 | GET | `/notifications` | PAR,STU | Notification centre | notification |  | H-10, Shell-03, Shell-05 |
| RPT-08 | POST | `/notifications/{notificationId}/read` | PAR,STU | Mark read | notification |  | Shell-05 |
| RPT-09 | POST | `/notifications/read-all` | PAR,STU | Mark all read | notification |  | Shell-05 |
| RPT-10 | GET | `/notification-preferences` | PAR | Channel × kind | notification_preference |  | H-03, Shell-05, Shell-06 |
| RPT-11 | PUT | `/notification-preferences` | PAR | Update | notification_preference |  | Shell-05, Shell-06 |
| RPT-12 | POST | `/devices` | PAR,STU | Register OneSignal id | device_registration |  | Shell-05 |
| RPT-13 | POST | `/jobs/weekly-reports/run` | SYS | Scheduled generation of weekly reports (Sunday 18:00 Europe/London) | weekly_report | P-RP-01,P-RP-02 | Scheduler-triggered weekly report job (JobRunr, not user-facing) |

## RVN

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| RVN-01 | GET | `/revision/topics/{topicId}/notes` | STU | Revision notes | revision_note |  | I-03, J-05 |
| RVN-02 | GET | `/revision/topics/{topicId}/decks` | STU | System decks for the topic | flashcard_deck,flashcard |  | I-01 |
| RVN-03 | POST | `/revision/decks` | STU | Create custom deck | flashcard_deck |  | I-02 |
| RVN-04 | PUT | `/revision/decks/{deckId}` | STU | Edit deck/cards (moderation on save) | flashcard_deck,flashcard,safety_classification | P-SF-03 | I-02 |
| RVN-05 | GET | `/revision/decks` | STU | My decks | flashcard_deck |  | I-01 |
| RVN-06 | POST | `/revision/cards/{cardId}/review` | STU | Rate a card (FSRS update) | flashcard_review,flashcard_state |  | I-01 |
| RVN-07 | GET | `/revision/topics/{topicId}/cheat-sheet` | STU | Cheat sheet JSON | cheat_sheet |  | I-04 |
| RVN-08 | GET | `/revision/topics/{topicId}/cheat-sheet/pdf` | STU | Print/export | cheat_sheet |  | I-04 |
| RVN-09 | POST | `/revision/decks/{deckId}/share` | STU | Create share code (expiring; moderated) | deck_share,safety_classification | P-SF-03 | I-06 |
| RVN-10 | GET | `/revision/shared/{shareCode}` | STU | Open shared deck (read-only) | deck_share,flashcard |  | I-06 |
| RVN-11 | DELETE | `/revision/shares/{shareCode}` | STU | Revoke share | deck_share |  | I-06 |

## SAF

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| SAF-01 | POST | `/internal-svc/safety/classify` | SYS | Independent safety call for tutor input/output (used by tutor module) | safety_classification | P-SF-01,P-SF-02 | Service-to-service safety classify (core-api -> ai-gateway) |
| SAF-02 | GET | `/internal/safety/flags` | DSL,CMP | Q-05 queue (pseudonymous refs) | safety_flag |  | L-04, Q-05 |
| SAF-03 | GET | `/internal/safety/flags/{flagId}` | DSL | Redacted excerpt + classifier reasoning | safety_flag,safety_classification |  | L-04, Q-05 |
| SAF-04 | POST | `/internal/safety/flags/{flagId}/triage` | DSL | Dismiss / triage with note | safety_flag,audit_log |  | L-04, Q-05 |
| SAF-05 | POST | `/internal/safety/flags/{flagId}/escalate` | DSL | Escalate → creates disclosure (identity revealed to DSL only) | safety_flag,safeguarding_disclosure_log,audit_log | P-SF-04 | L-04, Q-05 |
| SAF-06 | GET | `/internal/safeguarding/disclosures` | DSL | L-04 list | safeguarding_disclosure_log |  | L-04, Q-05 |
| SAF-07 | GET | `/internal/safeguarding/disclosures/{disclosureId}` | DSL | Detail with contacts (school DSL / parent) | safeguarding_disclosure_log,safeguarding_contact,school |  | L-04 |
| SAF-08 | POST | `/internal/safeguarding/disclosures/{disclosureId}/actions` | DSL | Log an action/referral | safeguarding_action,audit_log |  | L-04 |
| SAF-09 | POST | `/internal/safeguarding/disclosures/{disclosureId}/close` | DSL | Close with outcome | safeguarding_disclosure_log,audit_log |  | L-04 |
| SAF-10 | GET | `/internal/safeguarding/metrics` | DSL,CMP | Response times, volumes | safeguarding_disclosure_log |  | L-04 |

## CNT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| CNT-01 | GET | `/internal/qc/exceptions` | CNT | E-01 failed-QC list | question,qc_check_result |  | E-01 |
| CNT-02 | GET | `/internal/qc/exceptions/{questionId}` | CNT | Item, all five checks, repair log, similar items | question,mark_scheme,qc_check_result,question_generation_log |  | E-01 |
| CNT-03 | PUT | `/internal/questions/{questionId}` | CNT | Edit item + scheme (re-runs code checks and QC1,3,5) | question,mark_scheme,qc_check_result |  | E-01 |
| CNT-04 | POST | `/internal/qc/exceptions/{questionId}/rerun` | CNT | Re-run QC | qc_check_result | P-QG-04,P-QG-06,P-QG-08a | E-01 |
| CNT-05 | POST | `/internal/qc/exceptions/{questionId}/reject` | CNT | Reject with reason | question,audit_log |  | E-01 |
| CNT-06 | POST | `/internal/qc/exceptions/{questionId}/approve` | CNT | Approve after passing re-run | question,audit_log |  | E-01 |
| CNT-10 | POST | `/internal/questions` | CNT | Author a question + scheme (E-02) | question,mark_scheme |  | E-02 |
| CNT-11 | GET | `/internal/questions` | CNT | Search bank | question |  | E-01, E-02 |
| CNT-12 | POST | `/internal/past-papers` | CNT | Register paper (metadata, official source URL, licence status) + upload PDFs | past_paper | P-IN-03 | E-02 |
| CNT-13 | GET | `/internal/past-papers` | CNT | List/filter (board, year, licence, ingest status) | past_paper |  | E-02 |
| CNT-14 | GET | `/internal/past-papers/{paperId}` | CNT | Detail with items | past_paper,past_paper_item |  | E-02 |
| CNT-15 | POST | `/internal/past-papers/{paperId}/ingest` | CNT | Start pipeline (segment → scheme → tag → embed) | ingestion_job | P-IN-01,P-IN-02 | E-02 |
| CNT-16 | GET | `/internal/past-papers/{paperId}/ingest-status` | CNT | Job stages and stats | ingestion_job |  | E-02 |
| CNT-17 | PATCH | `/internal/past-papers/{paperId}/licence` | CNT | Update licence status/evidence (P-3) | past_paper,audit_log |  | E-02 |
| CNT-18 | PATCH | `/internal/past-paper-items/{itemId}` | CNT | Fix segmentation/tag | past_paper_item |  | E-02 |
| CNT-19 | POST | `/internal/past-paper-items/{itemId}/approve` | CNT | Approve into bank | past_paper_item,question,mark_scheme,question_embedding | P-QG-05 | E-02 |
| CNT-20 | POST | `/internal/questions/{questionId}/retire` | CNT | Retire an item | question |  | E-02 |

## GEN

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| GEN-01 | GET | `/internal/generation/coverage` | CNT | Bank coverage per objective × type × band | question,spec_point_objective |  | E-01 |
| GEN-02 | POST | `/internal/generation/plan` | CNT,SYS | Planner: gaps → blueprints | blueprint |  | E-01 |
| GEN-03 | POST | `/internal/generation/runs` | CNT,SYS | Start NIGHTLY/TOPUP/MANUAL run (Batch API) | generation_run,blueprint | P-QG-02,P-QG-03 | E-01 |
| GEN-04 | GET | `/internal/generation/runs/{runId}` | CNT | Run stats and cost | generation_run |  | E-01 |

## SPC

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| SPC-01 | GET | `/internal/specs` | CNT | All specifications and tagging status | specification |  | M-01 |
| SPC-02 | POST | `/internal/specs` | CNT | Create specification row (new board/subject) | specification,spec_unit,board_style_profile |  | M-01 |
| SPC-03 | GET | `/internal/specs/{specificationId}/tree` | CNT | Full tree for M-01 | spec_topic |  | M-01 |
| SPC-04 | POST | `/internal/specs/{specificationId}/topics` | CNT | Add topic/subtopic/spec point | spec_topic |  | M-01 |
| SPC-05 | PATCH | `/internal/topics/{topicId}` | CNT | Edit/reorder/tag status | spec_topic |  | M-01 |
| SPC-06 | POST | `/internal/specs/{specificationId}/import-document` | CNT | Upload spec PDF → AI extraction → review | spec_document | P-IN-04 | M-01 |
| SPC-07 | POST | `/internal/topics/{topicId}/decompose` | CNT | Run P-QG-01 for a spec point | spec_point_objective | P-QG-01 | M-01 |
| SPC-08 | GET | `/internal/specs/tagging-progress` | CNT | M-04 progress by board/subject | spec_topic |  | M-04 |

## STY

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| STY-01 | GET | `/internal/style-profiles` | CNT | List | board_style_profile |  | M-02 |
| STY-02 | GET | `/internal/style-profiles/{specificationId}` | CNT | Read | board_style_profile |  | M-02 |
| STY-03 | PUT | `/internal/style-profiles/{specificationId}` | CNT | Edit | board_style_profile |  | M-02 |
| STY-04 | POST | `/internal/style-profiles/{specificationId}/derive` | CNT | Derive from ingested papers (proposal only, human accepts) | board_style_profile | P-IN-05 | M-02 |

## DGM

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| DGM-01 | GET | `/internal/diagrams` | CNT | Library | diagram_asset |  | E-02 |
| DGM-02 | POST | `/internal/diagrams` | CNT | Upload + approve apparatus diagram (alt text mandatory) | diagram_asset |  | E-02 |

## RVC

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| RVC-01 | POST | `/internal/revision/generate` | CNT,SYS | Generate notes/flashcards/cheat sheets for a topic (batch) | revision_note,flashcard_deck,flashcard,cheat_sheet | P-RC-01,P-RC-02,P-RC-03,P-RC-04 | E-01 |
| RVC-02 | GET | `/internal/revision/exceptions` | CNT | Failed revision QC | revision_note,cheat_sheet |  | E-01 |

## CMS

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| CMS-01 | POST | `/internal/case-studies` | CNT | Create case study with consent evidence | case_study |  | E-02 |
| CMS-02 | PUT | `/internal/faq/{faqId}` | CNT | Edit FAQ | faq_item |  | E-02 |
| CMS-03 | PUT | `/internal/help-articles/{articleId}` | CNT,SUP | Edit help article | help_article |  | E-02 |
| CMS-04 | PUT | `/internal/outcome-stats/{statId}` | OWN | Edit outcome stat + methodology | outcome_stat |  | E-02 |

## SCH

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| SCH-01 | GET | `/schools/{schoolId}` | TCH,SADM,SBM | School overview, seats, DPA state | school,school_dpa_status |  | O-01 |
| SCH-02 | GET | `/schools/{schoolId}/classes` | TCH,SADM | Classes | school_class,class_teacher |  | O-01, O-02 |
| SCH-03 | POST | `/schools/{schoolId}/classes` | TCH,SADM | Create class | school_class,class_teacher |  | O-01 |
| SCH-04 | PATCH | `/classes/{classId}` | TCH,SADM | Rename/archive | school_class |  | O-01 |
| SCH-05 | GET | `/classes/{classId}/pupils` | TCH,SADM | Roster | class_pupil,student_profile |  | O-01 |
| SCH-06 | POST | `/classes/{classId}/pupils` | TCH,SADM | Add rostered pupils | class_pupil |  | O-01 |
| SCH-07 | DELETE | `/classes/{classId}/pupils/{studentId}` | TCH,SADM | Remove | class_pupil |  | O-01 |
| SCH-10 | POST | `/internal/schools` | OWN,SUP | Create school tenant (sales-led) | school,school_dpa_status |  | P-03 |
| SCH-11 | GET | `/internal/schools` | OWN,SUP,CMP | List schools, DPA state | school |  | P-03 |

## ASG

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| ASG-01 | POST | `/classes/{classId}/assignments` | TCH | Create adaptive homework (topics, count, due date) | assignment,assignment_target |  | O-04 |
| ASG-02 | GET | `/classes/{classId}/assignments` | TCH | List with completion | assignment,assignment_target |  | O-04 |
| ASG-03 | GET | `/assignments/{assignmentId}` | TCH | Completion tracker per pupil | assignment_target |  | O-04 |
| ASG-04 | PATCH | `/assignments/{assignmentId}` | TCH | Edit/extend/close | assignment |  | O-04 |
| ASG-05 | GET | `/students/{studentId}/assignments` | STU | Pupil's assignments | assignment,assignment_target |  | Shell-01 |
| ASG-06 | POST | `/assignments/{assignmentId}/publish` | TCH | Publish + notify pupils | assignment,notification |  | O-04 |

## INS

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| INS-01 | GET | `/classes/{classId}/mastery` | TCH,SADM | Class × topic heatmap | mastery_state,class_pupil |  | O-01 |
| INS-02 | GET | `/classes/{classId}/engagement` | TCH,SADM | Time-on-task, participation | engagement_daily,class_pupil |  | O-01 |
| INS-03 | GET | `/classes/{classId}/pupils/{studentId}/drilldown` | TCH | Pupil detail (respects teacher_visibility) | mastery_state,student_response,misconception_observation |  | O-05 |
| INS-04 | GET | `/schools/{schoolId}/dashboard` | SADM | School-level dashboard | mastery_state,engagement_daily |  | O-02 |
| INS-05 | GET | `/classes/{classId}/misconceptions` | TCH | Top misconceptions for the class | misconception_observation |  | O-05 |
| INS-06 | GET | `/classes/{classId}/insight-summary` | TCH | AI narrative over the heatmap (statistics only) | mastery_state | P-RP-05 | O-05 |
| INS-07 | GET | `/classes/{classId}/export.csv` | TCH,SADM | CSV export | mastery_state |  | O-02 |

## ONB

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| ONB-01 | POST | `/schools/{schoolId}/roster-imports` | SADM | Upload CSV | roster_import,roster_import_row |  | O-06 |
| ONB-02 | GET | `/schools/{schoolId}/roster-imports/{importId}` | SADM | Validation preview (new / moved / errors) | roster_import,roster_import_row |  | O-06 |
| ONB-03 | POST | `/schools/{schoolId}/roster-imports/{importId}/commit` | SADM | Create pupils/classes; issue credentials | roster_import,student_profile,school_class,class_pupil |  | O-06 |
| ONB-04 | POST | `/schools/{schoolId}/mis-connection` | SADM | Connect MIS (Wonde adapter) | mis_connection |  | O-06 |
| ONB-05 | GET | `/schools/{schoolId}/sso` | SADM | SSO config | sso_connection |  | O-06 |
| ONB-06 | PUT | `/schools/{schoolId}/sso` | SADM | Enable Google/Microsoft SSO for domain | sso_connection |  | O-06 |
| ONB-07 | POST | `/schools/{schoolId}/staff-invites` | SADM | Invite teachers (MFA enforced for admins) | account,school_member |  | O-06 |
| ONB-08 | POST | `/schools/{schoolId}/pupil-login-cards` | SADM | Printable pupil credential cards | student_profile,student_credential |  | O-06 |

## DPA

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| DPA-01 | GET | `/schools/{schoolId}/dpa` | SADM,SBM | DPA text/status/sub-processors | school_dpa_status,sub_processor |  | O-07 |
| DPA-02 | POST | `/schools/{schoolId}/dpa/sign` | SADM,SBM | Sign online (typed signature, role, IP hash) → PDF | school_dpa_signature,school_dpa_status,audit_log |  | O-07 |
| DPA-03 | GET | `/schools/{schoolId}/dpa/pdf` | SADM,SBM | Countersigned PDF | school_dpa_signature |  | O-07 |

## SCB

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| SCB-01 | GET | `/schools/{schoolId}/billing` | SBM | Seats, price, PO status, invoices | school_invoice,purchase_order |  | O-07 |
| SCB-02 | POST | `/schools/{schoolId}/purchase-orders` | SBM | Submit PO | purchase_order |  | O-07 |
| SCB-03 | GET | `/schools/{schoolId}/invoices` | SBM | Invoices | school_invoice |  | O-07 |
| SCB-04 | GET | `/schools/{schoolId}/invoices/{invoiceId}/pdf` | SBM | Invoice PDF | school_invoice |  | O-07 |

## KCS

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| KCS-01 | GET | `/schools/{schoolId}/kcsie-pack` | SADM | Downloadable KCSIE-mapped policy pack + questionnaire | kcsie_confirmation |  | O-03 |
| KCS-02 | POST | `/schools/{schoolId}/kcsie-confirmation` | SADM | Confirm filtering/monitoring alignment | kcsie_confirmation |  | O-03 |
| KCS-03 | GET | `/schools/{schoolId}/safeguarding-contacts` | SADM | Our DSL + school DSL contacts | safeguarding_contact |  | O-03 |

## SUP

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| SUP-01 | GET | `/internal/support/accounts` | SUP | Search accounts by email/handle (no learning content) | account |  | P-03 |
| SUP-02 | GET | `/internal/support/accounts/{accountId}` | SUP | Account, subscription, invoices, children names — no answers/transcripts | account,subscription,invoice,student_profile |  | P-03 |
| SUP-03 | POST | `/internal/support/accounts/{accountId}/password-reset` | SUP | Send reset | password_reset,audit_log |  | P-03 |
| SUP-04 | POST | `/internal/support/accounts/{accountId}/refund` | SUP | Refund invoice via Stripe | refund,invoice,audit_log |  | P-03 |
| SUP-05 | POST | `/internal/support/accounts/{accountId}/notes` | SUP | Add note | support_note,audit_log |  | P-03 |
| SUP-06 | POST | `/internal/support/accounts/{accountId}/extend-trial` | SUP | Extend trial (bounded) | subscription,audit_log |  | P-03 |
| SUP-07 | POST | `/internal/support/students/{studentId}/unlock-pin` | SUP | Unlock picture PIN | student_credential,audit_log |  | B-11, P-03 |

## AUD

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| AUD-01 | GET | `/internal/audit-log` | CMP | Search/filter | audit_log |  | P-04 |
| AUD-02 | GET | `/internal/audit-log/export` | CMP | CSV export (itself audited) | audit_log |  | P-04 |
| AUD-03 | GET | `/internal/audit-log/verify-chain` | CMP | Verify hash chain integrity | audit_log |  | P-04 |

## HLP

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| HLP-01 | GET | `/help/articles` | PUB,PAR,STU | Search (Postgres full-text) | help_article |  | P-01 |
| HLP-02 | GET | `/help/articles/{slug}` | PUB,PAR,STU | Article | help_article |  | P-01 |
| HLP-03 | POST | `/help/articles/{articleId}/feedback` | PUB,PAR,STU | Helpful yes/no | help_article |  | P-01 |
| HLP-04 | POST | `/support/chat` | PAR | Start in-house chat (Phase 2) | support_chat_session |  | P-02 |
| HLP-05 | POST | `/support/chat/{chatId}/messages` | PAR,SUP | Post/read messages | support_chat_message |  | P-02 |
| HLP-06 | GET | `/internal/support/chats` | SUP | Agent inbox | support_chat_session |  | P-03 |

## AIO

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| AIO-01 | GET | `/internal/ai/eval/summary` | OWN,AIE | Q-01 headline accuracy vs gold set, by board and question type | eval_run,eval_result |  | Q-01 |
| AIO-02 | GET | `/internal/ai/eval/runs` | AIE,OWN | Runs | eval_run |  | Q-01 |
| AIO-03 | GET | `/internal/ai/eval/runs/{evalId}` | AIE,OWN | Run detail incl. disagreements | eval_run,eval_result |  | Q-01 |
| AIO-04 | POST | `/internal/ai/eval/runs` | AIE | Run a prompt version against gold set / fixed QG set | eval_run,eval_result |  | Q-01 |
| AIO-05 | POST | `/internal/ai/gold-set/import` | AIE,OWN | CSV import of examiner-marked answers (owner pending P-2) | gold_set_item |  | Q-01 |
| AIO-06 | GET | `/internal/ai/gold-set` | AIE,OWN | Gold-set inventory, holdout flag, size vs 2,000 target | gold_set_item |  | Q-01 |
| AIO-07 | PATCH | `/internal/ai/gold-set/{goldId}` | AIE | Verify/mark holdout | gold_set_item,audit_log |  | Q-01 |
| AIO-10 | GET | `/internal/ai/gateway-log` | CMP,AIE | Q-02 call log (no identity fields exist) | ai_gateway_log |  | Q-02 |
| AIO-11 | GET | `/internal/ai/gateway-log/{logId}` | CMP | Exact redacted outbound payload (14 days) + redactions | ai_gateway_payload,redaction_event,audit_log |  | Q-02 |
| AIO-12 | GET | `/internal/ai/redactions` | CMP | Redaction stats by kind/method | redaction_event |  | Q-02 |
| AIO-13 | GET | `/internal/ai/boundary-attestation` | CMP | Daily canary attestation | boundary_attestation |  | Q-02 |
| AIO-20 | GET | `/internal/ai/prompts` | AIE | Q-03 prompt list with live version | prompt_version |  | Q-03 |
| AIO-21 | GET | `/internal/ai/prompts/{promptId}/versions` | AIE | Versions + metrics | prompt_version,eval_run |  | Q-03 |
| AIO-22 | POST | `/internal/ai/prompts/{promptId}/versions` | AIE | Create DRAFT (file-loader or edit) | prompt_version |  | Q-03 |
| AIO-23 | POST | `/internal/ai/prompt-versions/{id}/evaluate` | AIE | Evaluate on gold set | eval_run |  | Q-03 |
| AIO-24 | POST | `/internal/ai/prompt-versions/{id}/promote` | AIE | Promote only if gate passes (server-enforced) | prompt_version,audit_log |  | Q-03 |
| AIO-25 | POST | `/internal/ai/prompt-versions/{id}/rollback` | AIE | Roll back to previous LIVE | prompt_version,audit_log |  | Q-03 |
| AIO-26 | GET | `/internal/ai/model-routing` | AIE | Task → model map | model_routing |  | Q-03 |
| AIO-27 | PUT | `/internal/ai/model-routing/{taskKey}` | AIE | Change model for a task (gate-checked; audit-logged) | model_routing,audit_log |  | Q-03 |
| AIO-30 | GET | `/internal/ai/cost` | OWN | Q-04 cost per active student by task | ai_usage_cost |  | Q-04 |
| AIO-31 | PUT | `/internal/ai/budgets` | OWN | Budgets and alert thresholds | ai_budget |  | Q-04 |

## PLT

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| PLT-01 | GET | `/internal/feature-flags` | OWN,AIE,SUP | Flags | feature_flag |  | Q-03 |
| PLT-02 | PUT | `/internal/feature-flags/{flagKey}` | OWN | Toggle (audit-logged) | feature_flag,audit_log |  | Q-03 |
| PLT-03 | GET | `/health` | PUB | Liveness/readiness |  |  | Health probe |
| PLT-04 | POST | `/internal/staff` | OWN,CMP | Create staff account/roles (MFA required, vetting record checked) | account,account_role,staff_vetting_record,audit_log |  | P-04 |
| PLT-05 | GET | `/internal/vetting` | CMP | Staff DBS status (uCheck) | staff_vetting_record |  | P-04 |
| PLT-06 | POST | `/webhooks/ucheck` | SYS | uCheck status webhook | staff_vetting_record |  | uCheck DBS webhook |

## GW

| ID | Method | Path | Roles | Summary | Tables | Prompts | Screens |
|---|---|---|---|---|---|---|---|
| GW-01 | POST | `/gateway/v1/run` | SYS | Run a registered prompt (variables + schema) → JSON; redaction + token + logging | ai_gateway_log,ai_gateway_payload,redaction_event,ai_usage_cost |  | AI Gateway internal API (service-to-service only, never public) |
| GW-02 | POST | `/gateway/v1/stream` | SYS | Streaming variant (tutor chat) | ai_gateway_log |  | AI Gateway internal API (service-to-service only, never public) |
| GW-03 | POST | `/gateway/v1/batch` | SYS | Submit Message Batch (nightly generation) | ai_gateway_log |  | AI Gateway internal API (service-to-service only, never public) |
| GW-04 | GET | `/gateway/v1/batch/{batchId}` | SYS | Batch status/results | ai_gateway_log |  | AI Gateway internal API (service-to-service only, never public) |
| GW-05 | POST | `/gateway/v1/image/prepare` | SYS | Verify image is masked; strip EXIF; reject if header mask absent | ai_gateway_log,redaction_event |  | AI Gateway internal API (service-to-service only, never public) |
| GW-06 | POST | `/gateway/v1/speech/stt` | SYS | Streaming STT session (Google) — the only route where audio leaves | ai_gateway_log |  | AI Gateway internal API (service-to-service only, never public) |
| GW-07 | POST | `/gateway/v1/speech/tts` | SYS | Text → audio (Google TTS) | ai_gateway_log |  | AI Gateway internal API (service-to-service only, never public) |
| GW-08 | POST | `/gateway/v1/embed` | SYS | Embeddings via self-hosted model (no vendor) | ai_gateway_log |  | AI Gateway internal API (service-to-service only, never public) |
