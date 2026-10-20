# AI fix round — bug list

Branch: `fix/ai-implementation`. Each entry: what was wrong → what changed. All images build and the stack runs in Docker (2026-10-17); unit tests have not been run yet — use the checklist at the end.

## AI gateway (ai-gateway)

| # | Bug | Fix | Files |
|---|---|---|---|
| G1 | Prompt `{{placeholders}}` that the caller did not send were left as literal text, so the model received e.g. `{{student_message}}` instead of the student's message. | Renderer fails fast with `PROMPT_VARIABLES_MISSING` (400) listing the missing names; only `{{child_name}}`/`{{teacher_name}}` (filled by code after return, D-15) are allowed through. | `gateway/prompt/PromptRenderer.java` |
| G2 | Learner text containing `{{...}}` could be substituted into another placeholder (multi-pass `replace`). | Single-pass substitution; values are never re-scanned. | `PromptRenderer.java` |
| G3 | Output JSON schema was never sent to the model nor validated (`schemaRef` ignored). | Schema comes from `PROMPT_INDEX.md`, is appended to the system prompt, and output is validated with networknt (already a declared, unused dependency). | `PromptCatalog.java`, `schema/SchemaValidator.java`, `PromptRenderer.java` |
| G4 | No retry on bad output; fallback only on HTTP errors. | Bad JSON/schema → retry once on same model → fallback model → `SCHEMA_FAIL` (502). Never fabricates. | `vendor/LlmRunner.java` |
| G5 | `wrap()` guessed response keys; unknown shapes became `parsed.toString()` and reached students/parents as `{status=ok, reply_text=...}`. | Fixed envelope `{status, promptId, promptVersion, vendor, model, taskKey, fallbackUsed, usage, result}`; `result` = validated model object. | `web/GatewayController.java`, vendor clients |
| G6 | Tokens, cost, latency never logged; `ai_usage_cost` always empty (AI cost dashboard blank). | Usage read from vendor responses; written to `ai_gateway_log` (+ status, prompt version, payload hash, error code) and rolled up daily into `ai_usage_cost`. | `audit/GatewayAuditLogger.java` |
| G7 | `redaction_event.kind` always `EMAIL`; nested values not redacted. | Real kind per rule (EMAIL/PHONE/DOB); recursive over maps/lists; image fields skipped. | `redact/RedactionPipeline.java` |
| G8 | Outbound payload copy kept forever (14-day purge never implemented). | Daily purge job; images stored only as sha256 in the payload copy. | `audit/PayloadRetentionJob.java`, `AiGatewayApplication.java` |
| G9 | `params_json` temperature parsed with string indexing; `max_tokens` fixed at 8192 for every task. | Jackson parse; `max_tokens` from `params_json` with tier defaults (small 1024, else 4096). | `route/ModelRoutingService.java` |
| G10 | Hard-coded default models in code when a route was missing (violates D-28). | Missing route → `ROUTE_NOT_FOUND` (500). | `ModelRoutingService.java`, `GatewayController.java` |
| G11 | Vendor HTTP clients had no read timeout. | 5 s connect, configurable read timeout (default 45 s). | vendor clients, `application.yml` |
| G12 | Shared rules prepended only for MK/TU/QG/IN packs, as the whole markdown file. | All packs (adds SF/RC/RP); only the fenced system block is used. | `PromptRenderer.java` |
| G13 | `PromptLoader` LIVE `prompt_version` body was looked up but never used. | LIVE DB body preferred, repo file otherwise; version recorded in the log. | `PromptLoader.java`, `PromptRenderer.java` |
| G14 | Stub fixtures had shapes no real model returns, hiding every contract bug during QA; unknown prompts got a fake "stub response". | Fixtures rewritten to exact schema shapes (+ P-SF-01/02, P-TU-06, P-RC-01, P-RP-01/04); missing fixture → 501. Stub mode still renders the prompt, so variable bugs show up locally. | `stub/StubVendorClient.java`, `resources/fixtures/*` |
| G15 | Raw exceptions returned as 500 with vendor text. | problem+json with stable codes. | `web/GatewayExceptionHandler.java`, `error/GatewayException.java` |
| G16 | ai-gateway had zero tests. | Catalog, renderer, schema/fixture, runner (retry/fallback), redaction tests. | `src/test/...` |

## Core API — call sites

| # | Bug | Fix | Files |
|---|---|---|---|
| C1 | Tutor sent `learner_message`/`mode`; prompt needs `student_message`, `history`, `session_context`, `max_words` → model never saw the question. | Correct variables; last 8 redacted turns as history; de-identified session context (board, spec, topic, mastery band); strategy chosen in code from mastery. | `tutor/application/TutorService.java` |
| C2 | Tutor read `content`/`message`; schema returns `reply_text`. | Reads `reply_text`, `pedagogy_move`, `suggested_next`. | `TutorService.java` |
| C3 | Model's `needs_safety_review` ignored. | Scripted SG-T-04 + DSL flag + session paused. | `TutorService.java`, `SafetyService.flagTutorConcern` |
| C4 | Model's `reveals_final_answer` ignored on a live question. | Reply replaced with fixed redirect text. | `TutorService.java` |
| C5 | Blocked (safeguarding) session still accepted messages. | 409 `SESSION_PAUSED`; ended session → 409 `SESSION_ENDED`. | `TutorService.java` |
| C6 | Parent chat kill-switch checked only at session start. | Checked on every message too. | `TutorService.java` |
| C7 | `ai_visible_text` stored `[REDACTED_TURN]`, so no usable history. | Stores redacted student text. | `TutorService.java` |
| C8 | Web tutor page sent `{message}` but API read `text` → every message empty → keyword check BLOCKed it. | API accepts both; page sends `text`. | `TutorService.java`, web tutor page |
| C9 | Gateway failure silently produced a canned tutor reply. | 502 `AI_UNAVAILABLE` (canned reply only when `MARKING_ALLOW_LOCAL_STUB=true`). | `TutorService.java` |
| S1 | LLM safety classifiers P-SF-01/02 never called; safety was ~20 keywords. | Keywords first, then P-SF-01 (input) / P-SF-02 (output); classifier error → fail closed. Category → template per `safeguarding_templates.md`; IMMEDIATE stored as CRITICAL. | `safety/application/SafetyService.java`, `safety/domain/SafetyDecision.java` |
| S2 | Every non-ALLOW result (incl. empty text, outages) created a DSL flag. | Only scripted-support escalations create flags; outages fail closed without polluting the DSL queue. | `SafetyService.java` |
| S3 | No way to redirect off-limits turns (jailbreak, personal data) without a safeguarding script. | `REDIRECT` action with fixed non-safeguarding text. | `SafetyDecision.java` |
| S4 | Keyword list missed common phrasings; no eating-disorder keywords. | List extended; SG-T-05 wired. | `SafetyDecision.java` |
| M1 | Model `awarded` trusted: no `awarded ≤ max`, total not capped. | Points clamped to [0,max], total = sum capped at marks available, computed in code (D-26). | `marking/application/AiMarkParser.java` |
| M2 | Missing `confidence` defaulted to 0.9 (high). | Defaults to 0.0 → exception queue. | `AiMarkParser.java` |
| M3 | Model `flags` (e.g. `POSSIBLE_INJECTION`, `SCHEME_GAP`) ignored. | Any flag → `marking_exception` trigger `MODEL_FLAG`. | `MarkingOrchestrator.java`, V020 |
| M4 | Evidence-is-a-quote and points-sum-equals-total checks (P-MK-01 notes) missing. | Added as code flags (`EVIDENCE_NOT_IN_ANSWER`, `TOTAL_MISMATCH`, `POINT_OVER_MAX`). | `AiMarkParser.java` |
| M5 | A-Level read `points`/`total_marks` but schema returns `provisional_marks`/`marking_trail` → A-Level marks always 0. | Total = sum of marking trail (capped); trail stored. | `AiMarkParser.aLevel`, `MarkingOrchestrator.java` |
| M6 | A-Level ran Pass A + Pass B first (3 calls) and on disagreement never reached the reviewer path. | A-Level routed first to a single P-MK-04 run. | `MarkingOrchestrator.java` |
| M7 | P-MK-04 `{{spec_context}}` never filled. | Board + qualification + spec code/title. | `MarkingOrchestrator.java` |
| M8 | `calc_facts` always empty. | Sends stored `answer_spec_json`. | `MarkingOrchestrator.java` |
| M9 | Gateway failure → 500 to student (or, with stub on, fake half marks marked FINAL). | AI failure → exception `SCHEMA_FAILURE`; dev stub uses confidence 0.5 so it always needs review. | `MarkingOrchestrator.java` |
| M10 | Confidence floor 0.70 instead of spec `mk.conf_min` 0.75. | 0.75. | `PassCompare.java` |
| Q1 | QC passed whenever `status == "ok"` — true for every completed check, so every AI question was auto-approved and served to students. | Pass only on `verdict == PASS` with no BLOCKER issue. | `GatewayAiSupport.qcPassed`, `GenerationService.java`, `ContentService.java` |
| Q2 | QC prompt variables mismatched (`question_text`… vs `item`, `spec_point`, `objective`, `exemplars_used`, `style_profile`) → QC model saw nothing. | Correct variables. | `GenerationService.qcVariables`, `ContentService.rerunQc` |
| Q3 | QC failure left question `PENDING_QC`; nightly job then approved anything without a *failed* row (incl. never-checked items). | Failed → `QC_FAILED`; promotion requires a passed QC1 row. | `GenerationService.java` |
| Q4 | Calculation templates (P-QG-03) published as questions with placeholders and an empty mark scheme (no solver). | Calculation blueprints stop with `SOLVER_PENDING`; nothing published, no LLM call. | `GenerationService.java` |
| Q5 | Generated MCQs saved without `options_json` and with `answer_format=TEXT` → unmarkable. | Options and answer format stored; scheme type `MCQ_KEY`. | `GenerationService.java` |
| Q6 | Model's `marks`/type trusted over the blueprint; no code checks. | C2 (blueprint match), C3 (points sum), C4 (MCQ shape) before QC. | `generation/application/GenerationCodeChecks.java` |
| Q7 | Nightly job always generated for the first topic/objective; a failure skipped promotion. | Least-covered objective, non-calculation types preferred; failures isolated. | `GenerationService.java`, `NightlyGenerationJob.java` |
| Q8 | `cannot_complete` threw inside the transaction → run/blueprint audit rolled back. | Returns a FAILED status, audit kept. | `GenerationService.java` |
| P1 | Photo walkthrough never sent the image (only a UUID); model invented steps; frontend uploaded no file. | Real upload (masked, ≤3 MB JPEG/PNG), stored, sent as `image_base64` to P-TU-06, structured steps, P-SF-02 on output; errors → 502 not fake steps. | `TutorService.photoWalkthrough`, web photo page |
| P2 | Photos never deleted after `retention_until`. | Daily purge job. | `tutor/jobs/PhotoRetentionJob.java`, `ObjectStorageService.delete` |
| X1 | Core gateway client read timeout (120 s) shorter than a full gateway run with retry + fallback. | 200 s, configurable. | `gatewayclient/api/GatewayClient.java` |
| I1 | Ingestion sent the whole paper (up to 120k chars) in one call; output truncated on real papers. | Page-aligned chunks of ≤25k chars, one P-IN-01 call each, items merged/de-duplicated. | `ContentService.startIngest`, `PdfTextExtractor.pageChunks` |
| I2 | P-IN-02 variable sent as `paper_items`; prompt needs `segmented_items`. | Renamed; compact item index sent. | `ContentService.java` |
| I3 | Mark schemes read from `items`, schema returns `schemes` → no mark scheme was ever attached to an ingested item. | Reads `schemes` (several per item/part). | `ContentService.java` |
| SP1 | P-QG-01 `mark_range` is `[min,max]` but was read as `{min,max}` → every objective saved as 1–2 marks. | Array form read (object form still accepted). | `spec/application/SpecService.java` |
| R1 | Revision notes: 5 prompt variables missing, output read from `bodyMd` (schema: `sections`…), errors swallowed → always the stub text "Generated revision notes (pending QC)". | Correct variables (spec statements, style, tier, year band); markdown rendered from schema; errors → 502; grounding + prompt version saved. | `revision/application/RevisionService.java` |
| R2 | `revision/generate` role check was an empty `if` → any signed-in user (students too) could trigger LLM generation. | CNT/SYS enforced. | `RevisionService.java` |
| W1 | Weekly report sent `answers_count`/`week_start` (prompt needs `facts`, `goal_context`) and read `content` → parents would see a raw map string. | Code-computed facts with ids (answers, accuracy, active days, topics, weakest topics) + goal context; markdown from schema; `{{child_name}}` filled by code after return (D-15); failures logged. | `reporting/application/ReportingService.java` |
| W2 | One transaction across all students; no scheduler for the Sunday job. | Per-student commits; `@Scheduled` Sunday 18:00 Europe/London. | `ReportingService.java`, `reporting/jobs/WeeklyReportJob.java` |
| PL1 | Plan rationale sent `weakTopicLabels` (prompt needs `plan_json`, `goal_context`) and read `rationale` (schema: `summary`) → the AI text was never used, but a call was paid every time. | Code-built plan items with reason codes + goal; reads `summary`. | `learning/plan/application/PlanService.java` |
| V1 | Voice connectivity check made a full LLM call as a "ping". | Gateway `/actuator/health` only. | `VoiceService.java`, `GatewayClient.isHealthy` |
| V2 | Voice session end called P-VO-02 with `{"event":"session_end"}` (no transcript) — paid for nothing. | Call removed until STT/transcripts exist. | `VoiceService.java` |
| E1 | Eval run was fake: `ai_total = examiner_total`, always 100% and "passes gate". | Real P-MK-01 run over gold written items, per-point agreement, exact total, over/under-marking, real model id, failed-item count. | `aiops/application/AiOpsService.java`, `EvalScoring.java` |
| E2 | Eval fell back to a random UUID for `prompt_version_id` (FK violation). | Uses LIVE/latest P-MK-01 row or returns 409. | `AiOpsService.java` |
| EM1 | Stub embeddings (SHA-256 noise) stored as model `BAAI/bge-base-en-v1.5`. | Stored as `stub-sha256`. | `QuestionEmbeddingService.java` |
| EM2 | Embedding service truncated/zero-padded vectors of the wrong size. | 503 instead. | `embedding-service/app/main.py` |
| SEC1 | `/internal-svc/safety/classify` was `permitAll` → anyone could create safety flags for any student. | Removed from `permitAll`; SYS role enforced. | `SecurityConfig.java`, `SafetyController.java` |
| SEC2 | `/jobs/weekly-reports/run` was `permitAll` → anonymous users could trigger LLM calls for every student. | Removed; SYS/owner enforced. | `SecurityConfig.java`, `ReportingController.java` |
| SEC3 | `/tutor/rescue` was `permitAll` → anonymous tutor sessions for any student id. | Removed; SYS enforced. | `SecurityConfig.java`, `TutorController.java` |
| SEC4 | V012 `ALTER DEFAULT PRIVILEGES … GRANT SELECT ON TABLES TO tutor_gateway` → the AI gateway role could read every table created later (V017 `micro_subscription`, billing). Breaks the D-15 boundary. | V020 revokes the default and the leaked grants; boundary IT extended. | `db/migrations/V020__ai_fix_round.sql`, `TutorGatewayBoundaryIT.java` |
| DB1 | V013 seeded a LIVE `prompt_version` for P-MK-01 whose body is one placeholder line; once the gateway honours LIVE rows this would replace the real marking prompt. | Gateway uses a LIVE body only if it contains a real template; V020 retires the placeholder. | `PromptRenderer.java`, V020 |
| DB2 | Pass A and Pass B ran on the same model at temperature 0 (not independent). | V020 routes `mk.pass_b` to `groq-llama70b` (gpt-oss-120b), fallback `gemini-flash`. | V020 |
| DB3 | Vision tasks fell back to `ollama-qwen14b`, a text-only model. | Fallback removed for `tu.walkthrough`, `mk.transcribe`. | V020 |
| DB4 | `marking_exception.trigger` had no value for model flags. | `MODEL_FLAG` added. | V020 |
| N1 | Found in the live Docker smoke test: the model writes `{{child_name}}` in student-facing text (plan rationale, tutor replies) and nothing replaced it, so students would see the raw placeholder. | Code fills in the display name after the model returns (D-15). | `PlanService.java`, `TutorService.java` |
| N2 | Found in the Docker build: revision-notes markdown helper had broken string literals (compile error). | Fixed. | `RevisionService.java` |
| N3 | Found in the browser demo: generation blueprint asked for a 2-mark single-answer MCQ; the model (correctly) refused. | MCQ blueprints are always 1 mark. | `GenerationService.loadGenerationContext` |
| N4 | Found in the browser demo: QC re-run sent the item without options, command word or answer format, so QC failed MCQs as "options missing". | Item sent to QC includes them; re-run now PASSes a valid item. | `ContentService.qcVariables` |
| N5 | Safety classifiers took 4–25 s on gemini-flash (target ≤ 500 ms), so every tutor turn took 20–30 s. | V021 routes `sf.input`/`sf.output` to the fast small model; a tutor turn is now ~3 s end to end. | V021 |
| N6 | Groq gpt-oss models spend `max_tokens` on hidden reasoning; with 1024 the JSON was cut off (`json_validate_failed`, HTTP 400) and the tutor failed closed on a normal question. | V022 gives Groq tasks ≥ 4096 tokens; the gateway treats `json_validate_failed` as a bad answer (retry + fallback) instead of a bad request. | V022, `OpenAiCompatibleVendorClient`, `ChatTransport` |
| N7 | `SafetyService` only accepted the code `DSL`, but `account_role` can only hold `SAFEGUARDING_LEAD` — a safeguarding lead could never triage flags. | Both accepted. | `SafetyService.has` |
| N8 | Marking detail had no `questionId`, so "View mark scheme" never showed on the result screen. | `questionId` and `sessionId` returned. | `MarkingQueryService.markingView` |

## UI/UX round — bugs found while testing every role in the browser

The whole web app was moved to the client design system (`supporting_docs/Design_System_Visual_Language.docx`, prototype HTML). Every role was then exercised in the browser against the live Docker stack and each bug was fixed on the spot. Grouped by area, same format as the AI sections.

### Auth and session (all roles)

| # | Bug | Fix | Files |
|---|---|---|---|
| U2 | Child login did not redirect to the student home. | Post-login routing by role. | `lib/auth/post-login.ts`, `shell/nav.ts` |
| U22 | The web app never refreshed the 15-minute access token, so every user was logged out after 15 minutes. | `apiFetch` swaps the refresh token on 401 (single-flight) and retries once; staff login now stores the refresh token. | `lib/api/client.ts`, staff login |
| U23 | Login ignored `?next=`, so a timed-out user always landed on the home page. | Same-origin `next` honoured. | `lib/auth/post-login.ts` |
| U37 | An expired token got 403 from the API (no auth entry point), so the web app showed "forbidden" instead of refreshing. | Unauthenticated → 401; the shell signs out to login with `?next=` when refresh also fails. | `SecurityConfig`, `client.ts`, `AppShell` |
| U39 | Web school console used a hard-coded pilot school id. | `/me` returns `schoolId`; console uses it. | `AuthService`, `components/school/school.tsx` |

### Platform (all roles)

| # | Bug | Fix | Files |
|---|---|---|---|
| U14 | Mastery tree endpoint expected a numeric enrolment id (ids are UUIDs) → 400. | UUID. | `MasteryController`, `MasteryService` |
| U20 | Provisional-mark copy was vague. | "This mark is provisional until an examiner confirms it, usually within 48 hours." | `MarkingQueryService` |
| U40 | JDBC row mappers used `Map.of`, which throws on NULL — e.g. publishing an assignment with no scores yet returned 500. 40+ sites. | `Rows.of` (null-safe) in every row mapper. | `common/db/Rows.java`, services |
| U41 | Bad UUID in a path / unreadable JSON / wrong method returned 500. | 400 / 405 / 404 problems. | `GlobalExceptionHandler` |

### Visitor / marketing

| # | Bug | Fix | Files |
|---|---|---|---|
| U16 | Plan quiz recommended the cheapest plan for the "timed mocks" goal. | Each goal maps to its own plan. | `MarketingService.planQuiz` |
| U17 | Help centre needed a login (articles 401 for visitors). | GET help + article feedback public. | `SecurityConfig` |

### Parent

| # | Bug | Fix | Files |
|---|---|---|---|
| U15 | Parent action plan said only "Practise topic 3"; when every topic was mastered it still told the parent to practise one. | Topic names; a "keep fresh" plan when all mastered. | `ReportingService.actionPlan` |
| U21 | Billing page fired dependent calls with `Promise.all` and failed as a whole when one failed; change-plan preview read the wrong field. | Independent loads; correct field. | parent billing |
| U24 | Creating an under-13 child granted parental consent silently, without the parent ticking anything (UK GDPR / AADC). | No auto-grant; the parent is taken to the consent page and must agree explicitly. | `parent/children/new` |
| U25 | Consent tab asked for under-13 consent for a 13–15 year old. | Shows "No action needed" unless consent is outstanding. | `children/[id]/consent` |
| U26 | Checkout showed "SetupIntent seti_fake_…" to parents, with no plan, price or child. | Plan cards, billing cycle, child picker, summary, plain confirmation. | `parent/checkout` |
| U27 | Price preview priced only the first child (no sibling discount) and also priced children with no subjects. | Every enrolled child, nobody else. | `plan/subjects`, `billing/change` |
| U28 | Spec codes ("8462") shown where parents expect subject names; `title` was stripped by the zod schema. | Titles shown; schema keeps `title`. | parent pages, `lib/api/students.ts` |
| U29 | Target grade was a free-text box. | 9–1 select. | `children/[id]/target` |
| U30 | Goals onboarding always edited the first child, not the one just enrolled. | Uses `?studentId=`. | `onboarding/goals` |
| U31 | Parent picked from 8 PIN pictures, child login showed 12 (different labels/emoji). | One shared alphabet. | `components/auth/pictures.ts` |
| U32 | `daily-goal` and `consents/under13` responses failed schema parsing (daily goal never showed; adding a child showed "Could not create child" after it had been created). | Schemas match the API. | `lib/api/students.ts` |
| U36 | `/parent/children/{id}/reports` was a 404. | Redirects to the reports section. | parent reports |

### Student

| # | Bug | Fix | Files |
|---|---|---|---|
| U1 | Student signup crashed reading `currentTarget` after an `await`. | Form values read before the await. | `student/signup` |
| U3 | React Strict Mode fetched the next practice question twice (two questions served, one skipped). | Ref guard. | `practice/[sessionId]` |
| U4 | Revision notes never showed (`data.bodyMd` vs `data.note.bodyMd`). | Correct field. | `revise/notes/[topicId]` |
| U5 | Mark-scheme points never showed (`markingPointsJson` is a JSON string). | Parsed; levels rendered. | `FeedbackPanel`, `practice/[sessionId]/scheme` |
| U6 | Keep-going / entrance test sent `questionId: undefined`; MCQ sent as text only. | Read nested `.question`; structured `answer` sent. | `practice/keep-going`, `entrance/[runId]` |
| U7 | Diagnostic could start twice; 2-minute check dumped raw JSON. | Ref guard; redirects into the session. | onboarding diagnostic, `revise/check` |
| U8 | Mock sit, flashcards, custom quiz, self-mark, deck builder used hard-coded demo values ("Demo answer", rating 3, "Proton" deck). | Real UIs on the same APIs. | student pages |
| U9 | Surprise quiz "Start" marked the quiz complete without starting it. | Opens `/surprise`. | student home |
| U10 | Engagement nudges were debug buttons on the practice page. | Triggered by real signals (90 s idle, 2 wrong in a row, every 5th answer). | `EngagementOverlays.tsx` |
| U11 | Accessibility settings saved but changed nothing on screen, and only applied inside settings. | CSS hooks for text size, dyslexia font, high contrast, reduced motion; applied on every student page. | `globals.css`, `AppShell.tsx` |
| U18 | Custom quiz / surprise / 2-minute check sent `topicIds` but sessions ignored them. | Stored on the session; question picker filters by topic (or its parent). | `PracticeService` |
| U19 | Surprise quiz endpoint crashed (`Map.of` with null) when no quiz was ready. | HashMap. | `EngagementService` |
| U33 | `/next` returns `{done:true}` at the end of a session; the schema required a question, so the student saw "Something went wrong". | Done is accepted and shows the session summary. | `lib/api/practice.ts` |
| U34 | Surprise quiz could pick a topic with no approved questions → empty session. | Only topics with approved questions. | `EngagementService` |
| U35 | "Keep your streak going" copy on student home (streak mechanics are out of scope, AGENTS.md rule 6). | Neutral copy. | student home |
| U45 | Tutor and entrance-test pages started two sessions under React Strict Mode. | Ref guard. | `tutor/page.tsx`, `entrance/[runId]` |

### School (teacher, school admin)

| # | Bug | Fix | Files |
|---|---|---|---|
| U13 | School roster import / KCSIE confirm wrote Java `toString()` instead of JSON; pupil drill-down had no topic names; insights summary empty. | Jackson serialisation; topic names; 3 weakest class topics. | `SchoolService` |
| U38 | **School console was empty for every school user.** V011 puts school tables under row-level security keyed on `app.school_id`, but the app never set it, so classes/roster/DPA/invoices/KCSIE read as empty and inserts failed. | `SchoolService` is transactional and sets `app.school_id` (transaction-local) after authorising; class→school lookup uses a scoped bypass. | `SchoolService` |
| U42 | Class insights and heatmap showed "Topic 1, Topic 2…". | Topic names. | `SchoolService.classMastery`, insights page |
| U43 | New assignment asked teachers to type comma-separated topic ids. | Topic checklist from the class's specification. | assignment form, `/catalog/specifications/{id}/topics` |
| U44 | Roster import box was prefilled with sample names. | Empty with a placeholder. | school onboarding |

### Staff consoles (ops, content, reviewer, DSL, compliance, AI, owner)

| # | Bug | Fix | Files |
|---|---|---|---|
| U12 | Exception queue list failed when no status filter was given; detail had no AI results. | Nullable filter; `aiResults` returned. | `ExceptionQueueService` |
| U46 | Question QC showed only the stem — no options, correct answer or mark scheme — so reviewers approved blind; spec/topic shown as ids. | QC detail returns and shows options (answer highlighted), mark scheme, model answer, topic and spec names. | `ContentService.qcExceptionDetail`, QC page |
| U47 | AI-generated MCQs were saved without `answer_spec_json`. | `correctKey` stored at generation; V023 backfills existing items. | `GenerationService`, V023 |
| U48 | Safeguarding disclosures were read-only in the console although SAF-07/08/09 existed in the API. | Action history, log contact/referral/note, close with referral target and outcome (with confirmation); compliance sees it read-only. | safeguarding page, `SafetyService` |
| U49 | Escalations, triage and safeguarding actions were not written to the audit log (only logins were). | Hash-chained audit entries (ids only). | `SafetyService` |
| U50 | AI engineer saw "AI cost" in the menu but the API is owner-only (AIO-30). | Menu matches the catalogue. | `nav.ts` |
| U51 | Authoring asked for a numeric topic id; past-paper form prefilled with demo values. | Topic picker from the spec; empty fields with placeholders. | authoring page |
| U52 | Review workbench showed "AI agreement 100%" with nothing decided. | Shows "—" until a decision exists. | review page |
| U53 | Dispute exceptions showed "AI mark — / 2" and pre-filled the final mark with 1, so "Upheld — AI mark stands" would have saved the wrong mark. | Falls back to the response's awarded marks; form starts from the AI mark. | `ExceptionQueueService.detail`, exceptions page |
| U54 | The exception reviewer could not see what the AI decided per marking point. | Both AI passes with per-point marks, confidence and quoted evidence. | exceptions page |

Verified end to end in the browser: signup → child → under-13 consent → enrol → child PIN login → practice with live AI marking → mark scheme; tutor chat; mock paper; teacher assignment create/publish; roster import; KCSIE; safety flag escalate → disclosure action; student dispute → ops queue → claim → resolve (UPHELD, 2/2); AI eval run.

## Dependency note
`next@15.2.4` is flagged by npm during the image build as affected by CVE-2025-66478. Upgrade to a patched 15.x release before production (not done in this round: it is a framework upgrade that needs its own regression pass).

## Known gaps found but not fixed in this round
- Support chat: there is no endpoint to read chat messages back, so the widget can only send.
- Safeguarding disclosures are read-only in the staff UI (no update endpoint).
- Review release works only for items in `CLAIMED` state.
- No local Ollama, so fallback models fail on this machine; a Gemini 503 made one QC1 fail closed (correct behaviour).
- Names, schools and postcodes in free text are not redacted (regex covers email/phone/DOB only). A UK postcode regex was tried and rejected: it matches chemistry (e.g. `NH3 4OH`). Needs NER/list matching.
- Marking runs synchronously inside the submit-answer request (two LLM calls); should move to a job + SSE.
- Embeddings are written but never queried: no duplicate check (C8), no semantic retrieval.
- 32 of 50 task prompts are still not called (hints, re-explain, levels marker, feedback, misconception, QC2–5, repair, flashcards…).
- Synthetic gold items use "model answer for eval" as the answer, so real eval scores will be low until real gold data (P-2) is loaded.
- `spec/decompose` re-runs append duplicate objectives.
- Evidence-must-quote-the-answer (M4) follows the spec but may push many answers to exceptions if a model paraphrases; watch the exception rate in UAT.

## How to verify (on your laptop)
1. `mvn -f backend/pom.xml test` — unit tests (gateway: catalog, renderer, fixtures-vs-schema, runner, redaction; core: AiMarkParser, PassCompare, SafetyDecision, tutor helpers, code checks, QC verdict, report narrative, eval scoring, PDF chunking).
2. With Docker: `mvn -f backend/pom.xml verify` (Flyway V020 applies; boundary IT).
3. `cd web && npm run build`.
4. `pytest embedding-service/tests`.
5. Stub E2E (`AI_GATEWAY_STUB=true`): tutor chat shows clean replies; written answer marks FINAL; photo upload shows steps.
6. Live E2E (`AI_GATEWAY_STUB=false`): tutor answers the actual question and remembers the previous turn; crisis text → SG-T-01 + flag; Pass A/B rows show different models in `ai_gateway_log`; a generated item with a wrong fact ends `QC_FAILED`; `ai_usage_cost` fills; no `PROMPT_VARIABLES_MISSING` in `ai_gateway_log.error_code`.
