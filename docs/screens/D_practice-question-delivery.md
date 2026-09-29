# Epic D — D. Practice & Question Delivery

## D-01 — Practice Question Screen

- **Route:** `/practice/[sessionId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-027 (Get unlimited practice questions per topic so I never run out of mater…), US-029 (See real past-paper questions clearly labelled "from [board] [year] pa…), US-032 (Answer by typing, speaking (auto-transcribed), or photographing handwr…), US-060 (Have the teaching style (direct instruction vs guided example vs full …), US-083 (Refuse to do a student's homework verbatim, keeping the tool a practic…)
- **Design notes (inventory):** Core screen. Input-mode toggle: type / speak (auto-transcribed) / photograph. Real past-paper questions clearly labelled vs AI-generated.
- **Behaviour, states & acceptance criteria:**
  - Question renderer (MCQ, numeric+unit, short, extended, chemistry structured)
  - KaTeX/mhchem
  - hint ladder
  - skip
  - confidence prompt hook
  - timer optional
  - save-on-blur
  - states: loading/marking/queued/error/offline
  - AC: p95 mark for GCSE <8s
  - answer never lost on refresh
- **Endpoints wired:**
  - `PRA-01` `POST /api/v1/practice/sessions` — Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT)
  - `PRA-02` `GET /api/v1/practice/sessions/{sessionId}` — Session state
  - `PRA-03` `GET /api/v1/practice/sessions/{sessionId}/next` — Next question (adaptive selection, bank-first; may trigger on-demand top-up)
  - `PRA-04` `POST /api/v1/practice/sessions/{sessionId}/answers` — Submit answer (typed/spoken/photo ref/structured) + confidence + telemetry summary; returns result or marking ticket
  - `PRA-05` `GET /api/v1/practice/answers/{responseId}/result` — Poll/SSE for marking result
  - `PRA-07` `POST /api/v1/practice/sessions/{sessionId}/hint` — Next hint level (1–3)
  - `PRA-08` `POST /api/v1/practice/sessions/{sessionId}/skip` — Skip (not allowed in entrance test/diagnostic)
  - `PRA-09` `POST /api/v1/practice/sessions/{sessionId}/end` — End session; returns summary
  - `PRA-17` `POST /api/v1/practice/sessions/{sessionId}/mode` — Toggle input mode/simplified language for the current question (no re-marking)
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
  - `MRK-01` `GET /api/v1/answers/{responseId}/marking` — Per-point result, marks, feedback in mark-scheme language
  - `STU-13` `GET /api/v1/students/{studentId}/daily-goal` — Goal tile data
  - `VOX-04` `POST /api/v1/voice/connectivity-check` — Mic/network pre-flight (returns error class for J-06)
- **Tables touched (via those endpoints):** `daily_goal`, `daily_goal_progress`, `engagement_event`, `hint_event`, `mark_scheme`, `marking_result`, `mastery_state`, `nudge`, `outbox_event`, `practice_session`, `question`, `question_embedding`, `session_question`, `student_response`, `voice_session`
- **AI prompts:** `P-MK-01` (GCSE/iGCSE points marker — Pass A), `P-MK-03` (Levels-of-response marker (6-mark extended)), `P-MK-05` (Chemistry structured-answer assist (method/ECF/equations)), `P-TU-02` (Hint ladder generator), `P-MK-07` (Student-facing feedback writer)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-02 — Mock Paper Setup

- **Route:** `/mock/new`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-028 (Request a full mock paper matching the real exam's structure, timing a…)
- **Design notes (inventory):** Matches real exam structure/timing/weighting.
- **Behaviour, states & acceptance criteria:**
  - Choose board/paper/tier/duration, extra-time multiplier
  - AC: paper structure from board_style_profile
- **Endpoints wired:**
  - `MOC-01` `POST /api/v1/mock-papers` — Assemble mock (GENERATED or REAL_PAPER) with structure/timing/weighting
  - `CAT-05` `GET /api/v1/catalog/specifications/{specificationId}/topics` — Topic tree (levels 1–3)
  - `STU-06` `GET /api/v1/students/{studentId}/enrolments` — List enrolments (board/subject/goal/target grade)
- **Tables touched (via those endpoints):** `mock_paper`, `mock_paper_item`, `spec_topic`, `spec_unit`, `student_enrolment`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-03 — Mock Paper Sitting (Timed, Exam-Authentic Layout)

- **Route:** `/mock/[mockId]/sit`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-028 (Request a full mock paper matching the real exam's structure, timing a…), US-043 (See an authentic past-paper look and feel (official layout, cover, num…)
- **Design notes (inventory):** Official-look cover/numbering per board style profile.
- **Behaviour, states & acceptance criteria:**
  - Exam-authentic layout, countdown, question navigator, flag-for-review, autosave every 10s, no hints, no AI
  - AC: submission on timeout
  - resume after disconnect
- **Endpoints wired:**
  - `MOC-02` `GET /api/v1/mock-papers/{mockId}` — Paper in authentic layout
  - `MOC-03` `POST /api/v1/mock-papers/{mockId}/start` — Start clock (extended-time aware)
  - `MOC-04` `PUT /api/v1/mock-papers/{mockId}/answers/{seq}` — Autosave an answer
  - `MOC-05` `POST /api/v1/mock-papers/{mockId}/submit` — Submit; queues marking of all answers
  - `MOC-07` `POST /api/v1/mock-papers/{mockId}/photo-pages` — Photograph completed printed paper pages (masked) → answers
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
- **Tables touched (via those endpoints):** `answer_photo`, `engagement_event`, `mock_paper`, `mock_paper_item`, `nudge`, `past_paper_item`, `question`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-04 — 11+ Adaptive Entrance Test (No Skip/Back)

- **Route:** `/entrance/[runId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-030 (Sit a genuinely adaptive 11+ entrance test with no skip and no going b…)
- **Design notes (inventory):** Distinct locked-down exam mode.
- **Behaviour, states & acceptance criteria:**
  - 11+ adaptive test, no skip/back, ends on quota
  - AC: server decides next item
- **Endpoints wired:**
  - `ENT-01` `POST /api/v1/entrance-tests` — Start adaptive 11+ entrance test (locked-down rules)
  - `ENT-02` `GET /api/v1/entrance-tests/{runId}/next` — Next item (no back)
  - `ENT-03` `POST /api/v1/entrance-tests/{runId}/answers` — Answer (no skip)
  - `ENT-04` `GET /api/v1/entrance-tests/{runId}/result` — Result
- **Tables touched (via those endpoints):** `entrance_test_run`, `practice_session`, `question`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-05 — Multi-Version Drill Request

- **Route:** `/practice/multi-version`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-031 (Request several versions of the same topic/difficulty in one go, with …)
- **Design notes (inventory):** Numbers re-randomised for maths.
- **Behaviour, states & acceptance criteria:**
  - N-variant drill of same skill using calc templates
  - AC: numbers computed by code, distinct per variant
- **Endpoints wired:**
  - `PRA-10` `POST /api/v1/practice/multi-version` — Several re-randomised versions of the same topic/difficulty
  - `PRA-01` `POST /api/v1/practice/sessions` — Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT)
- **Tables touched (via those endpoints):** `calc_instance`, `practice_session`, `question`
- **AI prompts:** `P-QG-03` (Calculation template generator)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-06 — Photograph Completed Paper → Instant Score

- **Route:** `/practice/photo`  
- **Roles:** Student  
- **Platform:** Mobile (camera-first)  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-033 (Photograph a completed printed practice paper and get an instant score…)
- **Design notes (inventory):** Mobile-native; web fallback = file upload.
- **Behaviour, states & acceptance criteria:**
  - Camera capture (mobile-first, web upload), crop/rotate, transcript confirm/edit BEFORE marking, low-confidence flag
  - AC: image stripped of EXIF, PII scan, deleted per retention
- **Endpoints wired:**
  - `PRA-06` `POST /api/v1/practice/photos` — Upload a MASKED photo + mask report (client-side masking mandatory)
  - `PRA-04` `POST /api/v1/practice/sessions/{sessionId}/answers` — Submit answer (typed/spoken/photo ref/structured) + confidence + telemetry summary; returns result or marking ticket
  - `MOC-07` `POST /api/v1/mock-papers/{mockId}/photo-pages` — Photograph completed printed paper pages (masked) → answers
- **Tables touched (via those endpoints):** `answer_photo`, `mark_scheme`, `marking_result`, `mastery_state`, `outbox_event`, `student_response`
- **AI prompts:** `P-MK-06` (Handwriting transcription (vision)), `P-MK-01` (GCSE/iGCSE points marker — Pass A), `P-MK-03` (Levels-of-response marker (6-mark extended))
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-07 — Custom Mixed-Topic Quiz Builder

- **Route:** `/practice/custom`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-034 (Build my own mixed-topic quiz or mock from any combination of topics I…)
- **Behaviour, states & acceptance criteria:**
  - Pick topics/count/difficulty -> saved quiz set
  - AC: quiz composed by bank selection only
- **Endpoints wired:**
  - `PRA-13` `POST /api/v1/students/{studentId}/quiz-sets` — Save a custom mixed-topic quiz
  - `PRA-14` `GET /api/v1/students/{studentId}/topics` — Topic list with mastery ring per topic
  - `PRA-12` `GET /api/v1/students/{studentId}/quiz-sets` — Saved custom quiz sets
  - `PRA-01` `POST /api/v1/practice/sessions` — Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT)
- **Tables touched (via those endpoints):** `mastery_state`, `practice_session`, `saved_quiz_set`, `spec_topic`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-08 — Daily Micro-Goal Widget (Home Dashboard Tile)

- **Route:** `/home (widget)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-035 (Have an achievable daily micro-goal (e.g. 10 questions) as the default…), US-130 (Hold badges, streaks and XP back to Phase 2 and remove them from MVP s…)
- **Design notes (inventory):** Default rhythm; lives on Student Home (Shell-01). Shows goal progress only — no streak counter in the MVP.
- **Baseline v1.0 change:** REVISED — Streak element removed; goal progress kept (D-21).
- **Behaviour, states & acceptance criteria:**
  - Daily goal ring, adjust goal
  - AC: no streak-loss mechanics (gamification Phase 2)
- **Endpoints wired:**
  - `STU-13` `GET /api/v1/students/{studentId}/daily-goal` — Goal tile data
  - `STU-14` `PUT /api/v1/students/{studentId}/daily-goal` — Change daily question target
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
- **Tables touched (via those endpoints):** `daily_goal`, `daily_goal_progress`, `engagement_event`, `nudge`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-09 — Wrong-Answers-Only Redrill Mode

- **Route:** `/practice/redrill`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-036 (Use a "wrong answers only" mode to redrill everything I've previously …), US-058 (Have previously-mastered topics resurfaced on a spaced schedule so I d…)
- **Design notes (inventory):** Filter on D-01.
- **Behaviour, states & acceptance criteria:**
  - Redrill previously wrong answers
  - AC: spaced by review-due
- **Endpoints wired:**
  - `PRA-11` `GET /api/v1/students/{studentId}/wrong-answers` — Wrong-answers-only pool
  - `PRA-01` `POST /api/v1/practice/sessions` — Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT)
- **Tables touched (via those endpoints):** `practice_session`, `question`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-10 — Target-Grade Adaptive Drill ("Keep Going Till Consistent")

- **Route:** `/practice/keep-going`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 3 / **W4**
- **User stories:** US-042 (Have the engine keep generating questions at my target grade for a top…), US-060 (Have the teaching style (direct instruction vs guided example vs full …)
- **Design notes (inventory):** Mode setting on D-01, not a new layout.
- **Behaviour, states & acceptance criteria:**
  - Target-grade adaptive drill
  - strategy controller picks next
  - AC: stops on fatigue signal
- **Endpoints wired:**
  - `PRA-01` `POST /api/v1/practice/sessions` — Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT)
  - `PRA-17` `POST /api/v1/practice/sessions/{sessionId}/mode` — Toggle input mode/simplified language for the current question (no re-marking)
  - `MAS-01` `GET /api/v1/students/{studentId}/mastery` — Mastery tree per enrolment (levels 0–3)
- **Tables touched (via those endpoints):** `mastery_state`, `practice_session`, `session_question`, `spec_topic`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-11 — Mock Paper Results & Review

- **Route:** `/mock/[mockId]/results`  
- **Roles:** Student  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-109 (See my mock paper result broken down by topic with a targeted drill — …)
- **Design notes (inventory):** Topic-by-topic breakdown of lost marks with a one-tap targeted drill (feeds D-01).
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Per-question marks, grade estimate, topic breakdown, PDF
  - A-Level shows provisional state
  - AC: grade boundary from grade_boundary table
- **Endpoints wired:**
  - `MOC-06` `GET /api/v1/mock-papers/{mockId}/results` — Topic breakdown of lost marks + targeted drill link
  - `MOC-08` `GET /api/v1/mock-papers/{mockId}/pdf` — Printable paper PDF
  - `MRK-01` `GET /api/v1/answers/{responseId}/marking` — Per-point result, marks, feedback in mark-scheme language
  - `MRK-02` `GET /api/v1/questions/{questionId}/mark-scheme` — Full scheme reveal (only after an attempt)
- **Tables touched (via those endpoints):** `mark_scheme`, `marking_result`, `mock_paper`, `student_response`
- **AI prompts:** `P-MK-07` (Student-facing feedback writer)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## D-12 — Chemistry Structured Answer Input

- **Route:** `/practice/[sessionId] (input mode)`  
- **Roles:** Chemistry student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-110 (Write equations with state symbols, give numeric answers with units an…)
- **Design notes (inventory):** Chemistry input kit: equations with state symbols, numeric answer + units + significant figures, periodic table drawer. Pilot-critical for ≥95% accuracy.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Structured input: equation builder, state symbols, units, sig figs, working lines
  - AC: method marks & ECF handled by P-MK-05
- **Endpoints wired:**
  - `PRA-04` `POST /api/v1/practice/sessions/{sessionId}/answers` — Submit answer (typed/spoken/photo ref/structured) + confidence + telemetry summary; returns result or marking ticket
  - `PRA-05` `GET /api/v1/practice/answers/{responseId}/result` — Poll/SSE for marking result
- **Tables touched (via those endpoints):** `mark_scheme`, `marking_result`, `mastery_state`, `outbox_event`, `student_response`
- **AI prompts:** `P-MK-05` (Chemistry structured-answer assist (method/ECF/equations))
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
