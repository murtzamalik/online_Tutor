# Epic H — H. Progress & Reporting

## H-01 — Parent Progress Dashboard

- **Route:** `/parent/children/[id]`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-061 (See a longitudinal progress dashboard (topic-level mastery, trend over…), US-057 (Maintain a mastery model (BKT, graduating to DKT at scale) per student…)
- **Design notes (inventory):** Longitudinal, topic-level mastery + trend.
- **Behaviour, states & acceptance criteria:**
  - Mastery by topic, trend, time-on-task, alerts
  - AC: teacher-visible flag respected
- **Endpoints wired:**
  - `MAS-01` `GET /api/v1/students/{studentId}/mastery` — Mastery tree per enrolment (levels 0–3)
  - `MAS-02` `GET /api/v1/students/{studentId}/predicted-grades` — Predicted grade band with interval
  - `MAS-03` `GET /api/v1/students/{studentId}/progress/timeline` — Mastery/accuracy trend
  - `RPT-05` `GET /api/v1/students/{studentId}/alerts` — Early-warning alerts
  - `RPT-04` `GET /api/v1/students/{studentId}/action-plan` — Printable action plan
  - `STU-12` `GET /api/v1/students/{studentId}/home` — Student home aggregate (goal, continue, due reviews, recent mastery, assignments)
- **Tables touched (via those endpoints):** `alert`, `assignment_target`, `daily_goal_progress`, `grade_boundary`, `mastery_state`, `misconception_observation`, `predicted_grade_snapshot`, `spec_topic`, `student_enrolment`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-02 — Misconception Detail View

- **Route:** `/parent/children/[id]/misconceptions`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-062 (See the specific misconception behind each wrong answer in plain Engli…)
- **Design notes (inventory):** Plain-English, per wrong answer.
- **Behaviour, states & acceptance criteria:**
  - Top misconceptions with plain-English explanation and suggested action
  - AC: explanation generated w/o child name
- **Endpoints wired:**
  - `MAS-04` `GET /api/v1/students/{studentId}/misconceptions` — Misconceptions in plain English
  - `TRN-01` `GET /api/v1/students/{studentId}/ai-transcripts` — List chat/voice sessions within retention
- **Tables touched (via those endpoints):** `misconception_observation`, `tutor_session`, `voice_session`
- **AI prompts:** `P-MK-08` (Misconception classifier), `P-RP-03` (Misconception explainer for parents)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-03 — Weekly AI Narrative Report

- **Route:** `/parent/children/[id]/reports/[reportId]`  
- **Roles:** Parent  
- **Platform:** Web + Mobile + Email  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-063 (Receive a weekly AI-generated narrative summary (what improved, what's…)
- **Design notes (inventory):** Parent version + a more direct student version.
- **Behaviour, states & acceptance criteria:**
  - Weekly narrative
  - email + in-app
  - AC: facts_json deterministic
  - text validated against facts
- **Endpoints wired:**
  - `RPT-02` `GET /api/v1/students/{studentId}/reports/weekly` — Weekly narrative list
  - `RPT-03` `GET /api/v1/students/{studentId}/reports/weekly/{reportId}` — One report (parent or student version by caller)
  - `RPT-10` `GET /api/v1/notification-preferences` — Channel × kind
- **Tables touched (via those endpoints):** `notification_preference`, `weekly_report`
- **AI prompts:** `P-RP-01` (Weekly narrative — parent), `P-RP-02` (Weekly narrative — student)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-04 — Predicted Grade Band

- **Route:** `/parent/children/[id]/predicted`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-064 (See a predicted grade band per subject with an honest confidence inter…)
- **Design notes (inventory):** Shown with an honest confidence interval, not a single number.
- **Behaviour, states & acceptance criteria:**
  - Predicted grade band with confidence and 'what would move it'
  - AC: labelled estimate, not a guarantee
- **Endpoints wired:**
  - `MAS-02` `GET /api/v1/students/{studentId}/predicted-grades` — Predicted grade band with interval
- **Tables touched (via those endpoints):** `grade_boundary`, `predicted_grade_snapshot`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-05 — Early-Warning Drift Alert

- **Route:** `/parent/children/[id]/alerts`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 3 / **W4**
- **User stories:** US-065 (Get an early-warning alert when my child is drifting on a topic, befor…)
- **Design notes (inventory):** Push notification + detail screen.
- **Behaviour, states & acceptance criteria:**
  - Drift/inactivity/calibration alerts with ack
  - AC: max 1 alert per kind per 7 days
- **Endpoints wired:**
  - `RPT-05` `GET /api/v1/students/{studentId}/alerts` — Early-warning alerts
  - `RPT-06` `POST /api/v1/alerts/{alertId}/ack` — Acknowledge
- **Tables touched (via those endpoints):** `alert`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-06 — Student Knowledge Map / Skill Tree

- **Route:** `/student/map`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-066 (See a visual knowledge map/skill tree showing which topics are secure.…), US-057 (Maintain a mastery model (BKT, graduating to DKT at scale) per student…)
- **Design notes (inventory):** Shared visual language with K-01 (badges).
- **Behaviour, states & acceptance criteria:**
  - Skill tree/knowledge map by topic mastery
  - AC: keyboard accessible
- **Endpoints wired:**
  - `MAS-08` `GET /api/v1/students/{studentId}/skill-map` — Knowledge map graph
  - `MAS-01` `GET /api/v1/students/{studentId}/mastery` — Mastery tree per enrolment (levels 0–3)
  - `PRA-15` `GET /api/v1/students/{studentId}/topics/{topicId}` — Topic detail + question history
- **Tables touched (via those endpoints):** `mastery_state`, `spec_topic`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-07 — Anonymised Cohort Benchmark

- **Route:** `/student/benchmark`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-067 (See anonymised cohort context (e.g. "top 20% this month") without any …)
- **Design notes (inventory):** e.g. "top 20% this month", no other student identifiable.
- **Behaviour, states & acceptance criteria:**
  - Anonymised cohort benchmark
  - AC: hidden if cohort < cohort.min_sample_size (50)
- **Endpoints wired:**
  - `MAS-05` `GET /api/v1/students/{studentId}/cohort-benchmark` — Anonymised percentile (only if opted in, n ≥ 50)
- **Tables touched (via those endpoints):** `cohort_benchmark_snapshot`, `privacy_settings`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-08 — Printable Action-Plan Checklist

- **Route:** `/parent/children/[id]/action-plan/print`  
- **Roles:** Parent  
- **Platform:** Web (print view)  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-068 (Get a printable action-plan checklist after a diagnostic/session for o…)
- **Design notes (inventory):** Export/print stylesheet of H-01/H-02.
- **Behaviour, states & acceptance criteria:**
  - Print stylesheet checklist
  - AC: A4 print CSS
- **Endpoints wired:**
  - `RPT-04` `GET /api/v1/students/{studentId}/action-plan` — Printable action plan
- **Tables touched (via those endpoints):** `mastery_state`, `misconception_observation`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-09 — Parent Controls & AI Transcripts

- **Route:** `/parent/children/[id]/controls`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-116 (Switch voice and chat on or off, set time limits and quiet hours, and …)
- **Design notes (inventory):** Voice/chat on-off, time limits, quiet hours, and read-only AI tutor transcripts (voice transcripts kept 30 days).
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - AI on/off, voice on/off, transcripts, time limits, teacher visibility
  - AC: changes effective on next request
- **Endpoints wired:**
  - `PCT-01` `GET /api/v1/students/{studentId}/ai-controls` — Chat/voice toggles, time limits, quiet hours
  - `PCT-02` `PUT /api/v1/students/{studentId}/ai-controls` — Update controls
  - `PCT-03` `GET /api/v1/students/{studentId}/ai-usage` — Minutes used per day
  - `TRN-01` `GET /api/v1/students/{studentId}/ai-transcripts` — List chat/voice sessions within retention
  - `TRN-02` `GET /api/v1/students/{studentId}/ai-transcripts/{tutorSessionId}` — Read-only transcript (audit-logged)
  - `CON-03` `POST /api/v1/students/{studentId}/consents/voice` — Separate voice consent incl. Google processing acknowledgement
  - `CON-04` `DELETE /api/v1/students/{studentId}/consents/voice` — Withdraw voice consent (ends live voice sessions)
- **Tables touched (via those endpoints):** `audit_log`, `parent_ai_controls`, `tutor_message`, `tutor_session`, `voice_consent`, `voice_session`
- **AI prompts:** `P-VO-02` (Voice session summary)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## H-10 — Parent Home (mobile)

- **Route:** `(mobile) Parent Home`  
- **Roles:** Parent  
- **Platform:** Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-117 (See my children's progress and reports in the mobile app — so that I c…)
- **Design notes (inventory):** Mobile-native parent home: per-child progress cards, reports, alerts.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Mobile only
  - API contract + spec (mobile phase)
- **Endpoints wired:**
  - `RPT-01` `GET /api/v1/parents/home` — Per-child cards (web + mobile)
  - `RPT-05` `GET /api/v1/students/{studentId}/alerts` — Early-warning alerts
  - `RPT-07` `GET /api/v1/notifications` — Notification centre
- **Tables touched (via those endpoints):** `alert`, `mastery_state`, `notification`, `student_profile`, `weekly_report`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
