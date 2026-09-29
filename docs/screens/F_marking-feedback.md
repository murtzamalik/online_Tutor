# Epic F — F. Marking & Feedback

## F-01 — Instant Marking Result

- **Route:** `/practice/[sessionId]/result/[responseId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-044 (Get instant, exam-aligned automatic marking with a per-question right/…), US-049 (See a "this is an AI-assisted estimate, not an official mark" disclaim…)
- **Design notes (inventory):** Per-question right/wrong + explanation. GCSE/iGCSE marks are instant and final; A-Level marks route to F-09 (provisional, in review).
- **Baseline v1.0 change:** UPDATED — A-Level disclaimer replaced by the provisional-mark flow (F-09).
- **Behaviour, states & acceptance criteria:**
  - Mark awarded per point, rationale, next action
  - dispute link
  - AC: student text is generated only from validated mark result
- **Endpoints wired:**
  - `MRK-01` `GET /api/v1/answers/{responseId}/marking` — Per-point result, marks, feedback in mark-scheme language
  - `MRK-04` `POST /api/v1/answers/{responseId}/dispute` — "Disagree with this mark" → exception queue
  - `MRK-05` `GET /api/v1/answers/{responseId}/review-status` — A-Level provisional status, ETA (48 h)
  - `TUT-05` `POST /api/v1/tutor/reexplain` — Re-explain after 2nd wrong attempt in a different format
- **Tables touched (via those endpoints):** `dispute`, `hint_event`, `marking_exception`, `marking_result`, `marking_review_queue`, `student_response`, `tutor_message`
- **AI prompts:** `P-MK-07` (Student-facing feedback writer), `P-MK-01` (GCSE/iGCSE points marker — Pass A), `P-MK-03` (Levels-of-response marker (6-mark extended))
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-02 — Full Mark Scheme Reveal

- **Route:** `/practice/[sessionId]/scheme/[questionId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-045 (See the full mark scheme, point by point, for how my answer was marked…)
- **Design notes (inventory):** Point-by-point.
- **Behaviour, states & acceptance criteria:**
  - Full mark scheme reveal after attempt
  - AC: hidden until answered/skip
- **Endpoints wired:**
  - `MRK-02` `GET /api/v1/questions/{questionId}/mark-scheme` — Full scheme reveal (only after an attempt)
  - `MRK-01` `GET /api/v1/answers/{responseId}/marking` — Per-point result, marks, feedback in mark-scheme language
- **Tables touched (via those endpoints):** `mark_scheme`, `marking_result`, `student_response`
- **AI prompts:** `P-MK-07` (Student-facing feedback writer)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-03 — Self-Mark Mode

- **Route:** `/practice/[sessionId]/self-mark`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-046 (Self-mark against a revealed mark scheme as an alternative to AI marki…)
- **Design notes (inventory):** Alternative to AI marking.
- **Behaviour, states & acceptance criteria:**
  - Self-mark ticks vs points, compare with system
  - AC: informational only, does not change official mark
- **Endpoints wired:**
  - `MRK-03` `POST /api/v1/answers/{responseId}/self-mark` — Self-mark against revealed scheme
  - `MRK-06` `POST /api/v1/answers/{responseId}/self-mark-compare` — Compare self-mark with AI mark (calibration)
  - `MRK-02` `GET /api/v1/questions/{questionId}/mark-scheme` — Full scheme reveal (only after an attempt)
- **Tables touched (via those endpoints):** `mark_scheme`, `marking_result`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-04 — "Disagree With This Mark" Flag

- **Route:** `/practice/[sessionId]/dispute/[responseId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-047 (Flag "disagree with this mark" on any auto-marked question so it gets …)
- **Design notes (inventory):** Modal from F-01; sends the answer to F-10 Marking Exceptions and aggregates in M-03.
- **Baseline v1.0 change:** UPDATED — Now Must/Pilot: a student dispute is one of the three triggers for F-10 (D-17).
- **Behaviour, states & acceptance criteria:**
  - Reason chips + free text (redacted), submit
  - status
  - AC: creates dispute + marking_exception for GCSE, review item for A-Level
- **Endpoints wired:**
  - `MRK-04` `POST /api/v1/answers/{responseId}/dispute` — "Disagree with this mark" → exception queue
  - `MRK-05` `GET /api/v1/answers/{responseId}/review-status` — A-Level provisional status, ETA (48 h)
- **Tables touched (via those endpoints):** `dispute`, `marking_exception`, `marking_review_queue`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-05 — A-Level Review Workbench

- **Route:** `/staff/review`  
- **Roles:** A-Level Reviewer  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Phase 2 (A-Level go-live) / **W3**
- **User stories:** US-048 (Review every AI-marked A-Level long answer in an anonymised workbench,…), US-114 (Confirm or adjust the AI mark using its marking trail, without seeing …)
- **Design notes (inventory):** Every A-Level long answer is reviewed (client Round 1). Reviewer never sees the student's identity. Confirmed/adjusted marks feed the gold set (Q-01). GCSE/iGCSE exceptions are handled separately in F-10.
- **Baseline v1.0 change:** REVISED — was "Marking Reviewer Queue". Mixed-level queue → A-Level only, anonymised, with AI marking trail, adjust/confirm and 48h SLA tracking (D-16).
- **Behaviour, states & acceptance criteria:**
  - Split view: answer, scheme, marking trail
  - confirm/adjust/release
  - SLA timers
  - AC: release requires reviewer MFA session
  - audit on adjust
- **Endpoints wired:**
  - `REV-01` `GET /api/v1/internal/reviews/queue` — A-Level queue with SLA colours (pseudonymous refs only)
  - `REV-02` `GET /api/v1/internal/reviews/{reviewId}` — Answer, question, scheme, AI marking trail — never identity
  - `REV-03` `POST /api/v1/internal/reviews/{reviewId}/claim` — Claim (prevents double review)
  - `REV-04` `POST /api/v1/internal/reviews/{reviewId}/confirm` — Confirm AI mark
  - `REV-05` `POST /api/v1/internal/reviews/{reviewId}/adjust` — Adjust per-point marks + reason
  - `REV-06` `POST /api/v1/internal/reviews/{reviewId}/release` — Release a claim
  - `REV-07` `GET /api/v1/internal/reviews/sla` — SLA breach view, throughput, agreement rate
- **Tables touched (via those endpoints):** `audit_log`, `gold_set_item`, `mark_scheme`, `marking_result`, `marking_review_queue`, `mastery_state`, `student_response`
- **AI prompts:** `P-MK-04` (A-Level provisional marker with marking trail)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-06 — Re-Explain Concept (Diagram / Worked Example)

- **Route:** `/tutor/reexplain/[questionId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-050 (Be re-explained a concept in a different format (diagram/worked exampl…)
- **Design notes (inventory):** Triggered on 2nd wrong attempt.
- **Behaviour, states & acceptance criteria:**
  - Choose format (diagram/worked example/analogy/simpler)
  - AC: all output passes safety classifier
- **Endpoints wired:**
  - `TUT-05` `POST /api/v1/tutor/reexplain` — Re-explain after 2nd wrong attempt in a different format
  - `TUT-01` `POST /api/v1/tutor/sessions` — Start chat tutor session (checks parent AI controls and quiet hours)
- **Tables touched (via those endpoints):** `hint_event`, `parent_ai_controls`, `tutor_message`, `tutor_session`
- **AI prompts:** `P-TU-03` (Re-explain in a different format), `P-TU-07` (Worked-example builder), `P-SF-01` (Learner-input classifier), `P-SF-02` (Tutor-output classifier)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-07 — Socratic Explain-Back Chat

- **Route:** `/tutor/[tutorSessionId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-051 (Be prompted to explain my reasoning before the answer is revealed (Soc…), US-060 (Have the teaching style (direct instruction vs guided example vs full …), US-083 (Refuse to do a student's homework verbatim, keeping the tool a practic…)
- **Design notes (inventory):** Chat-style component, reused by Voice Tutor (J-01).
- **Behaviour, states & acceptance criteria:**
  - Chat UI, Socratic turns, explain-back check, end session summary
  - streaming
  - AC: parent-visible transcript (H-09)
  - crisis path -> scripted response
- **Endpoints wired:**
  - `TUT-01` `POST /api/v1/tutor/sessions` — Start chat tutor session (checks parent AI controls and quiet hours)
  - `TUT-02` `POST /api/v1/tutor/sessions/{tutorSessionId}/messages` — Learner message → SSE stream of tutor reply (safety-checked before display)
  - `TUT-03` `GET /api/v1/tutor/sessions/{tutorSessionId}` — Session + messages
  - `TUT-04` `POST /api/v1/tutor/sessions/{tutorSessionId}/end` — End
  - `TUT-07` `POST /api/v1/tutor/sessions/{tutorSessionId}/explain-back` — Submit explanation; get evaluation and next hint
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
- **Tables touched (via those endpoints):** `engagement_event`, `nudge`, `parent_ai_controls`, `safety_classification`, `safety_flag`, `tutor_message`, `tutor_session`
- **AI prompts:** `P-TU-00` (Tutor shared persona & rules), `P-TU-01` (Tutor dialogue turn (Socratic / strategy-driven)), `P-TU-04` (Explain-back evaluator), `P-TU-07` (Worked-example builder), `P-SF-01` (Learner-input classifier), `P-SF-02` (Tutor-output classifier)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-08 — Photo-of-Stuck-Question Walkthrough

- **Route:** `/tutor/photo`  
- **Roles:** Student  
- **Platform:** Mobile (camera-first)  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-052 (Photograph a question I'm stuck on (not just a finished answer) and ge…)
- **Design notes (inventory):** Distinct from D-06 — question not yet attempted.
- **Behaviour, states & acceptance criteria:**
  - Photo of stuck question -> guided walkthrough
  - AC: no full answer given, hint ladder logic
- **Endpoints wired:**
  - `TUT-06` `POST /api/v1/tutor/photo-walkthrough` — Photo of a stuck (unattempted) question → step-by-step (Phase 3)
  - `PRA-06` `POST /api/v1/practice/photos` — Upload a MASKED photo + mask report (client-side masking mandatory)
- **Tables touched (via those endpoints):** `answer_photo`, `tutor_session`
- **AI prompts:** `P-TU-06` (Photo-of-stuck-question walkthrough (vision)), `P-MK-06` (Handwriting transcription (vision)), `P-SF-01` (Learner-input classifier), `P-SF-02` (Tutor-output classifier)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-09 — A-Level Provisional Mark / In Review

- **Route:** `/practice/[sessionId]/provisional/[responseId]`  
- **Roles:** A-Level student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Phase 2 (A-Level go-live) / **W3**
- **User stories:** US-113 (See my AI mark labelled provisional with review status and expected tu…)
- **Design notes (inventory):** AI mark shown immediately, labelled PROVISIONAL, with review status and 48h expected turnaround. Counts toward progress only once confirmed in F-05.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - 'Provisional mark - in human review' banner, ETA, final on release
  - AC: provisional never shown as final
- **Endpoints wired:**
  - `MRK-01` `GET /api/v1/answers/{responseId}/marking` — Per-point result, marks, feedback in mark-scheme language
  - `MRK-05` `GET /api/v1/answers/{responseId}/review-status` — A-Level provisional status, ETA (48 h)
  - `MRK-04` `POST /api/v1/answers/{responseId}/dispute` — "Disagree with this mark" → exception queue
- **Tables touched (via those endpoints):** `dispute`, `marking_exception`, `marking_result`, `marking_review_queue`, `student_response`
- **AI prompts:** `P-MK-04` (A-Level provisional marker with marking trail)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## F-10 — Marking Exceptions — GCSE/iGCSE

- **Route:** `/staff/marking/exceptions`  
- **Roles:** Operations reviewer  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-115 (Resolve only GCSE/iGCSE answers that were low-confidence, where two ma…)
- **Design notes (inventory):** GCSE/iGCSE only. Triggers: low AI confidence, two marking passes disagree, or student dispute (F-04). Resolved items join the gold set.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Queue of Pass A/B disagreements & low confidence & disputes
  - resolve with reason
  - AC: resolution feeds gold set candidate
- **Endpoints wired:**
  - `EXC-01` `GET /api/v1/internal/marking/exceptions` — F-10 queue (filters: trigger, board, status)
  - `EXC-02` `GET /api/v1/internal/marking/exceptions/{exceptionId}` — Anonymised detail: question, scheme, answer, both passes, dispute reason
  - `EXC-03` `POST /api/v1/internal/marking/exceptions/{exceptionId}/claim` — Claim
  - `EXC-04` `POST /api/v1/internal/marking/exceptions/{exceptionId}/resolve` — Final marks + note; recompute mastery; optionally add to gold set
  - `EXC-05` `GET /api/v1/internal/marking/systemic-issues` — Aggregate disputes/outcomes by board/topic/question (M-03)
- **Tables touched (via those endpoints):** `audit_log`, `dispute`, `gold_set_item`, `mark_scheme`, `marking_exception`, `marking_result`, `mastery_state`, `student_response`
- **AI prompts:** `P-MK-02` (GCSE/iGCSE points marker — independent Pass B), `P-MK-09` (Exception reviewer assist)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
