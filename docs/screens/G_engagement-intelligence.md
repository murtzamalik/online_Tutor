# Epic G — G. Engagement Intelligence

## G-01 — Surprise Micro-Quiz Pop-Up

- **Route:** `(overlay)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-055 (Receive occasional surprise short quizzes on topics I haven't touched …)
- **Design notes (inventory):** On topics not touched recently.
- **Behaviour, states & acceptance criteria:**
  - Surprise 3-question micro-quiz pop-up, dismissable, cooldown
  - AC: parent can disable via H-09/K-02
- **Endpoints wired:**
  - `ENG-03` `GET /api/v1/students/{studentId}/surprise-quiz` — Fetch pending surprise quiz
  - `ENG-04` `POST /api/v1/surprise-quizzes/{quizId}/complete` — Complete/skip and update belief
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
- **Tables touched (via those endpoints):** `engagement_event`, `mastery_state`, `nudge`, `surprise_quiz`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## G-02 — Confidence Check Prompt

- **Route:** `(overlay)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Pilot / **W2**
- **User stories:** US-056 (Be asked how confident I am before an answer is revealed.…)
- **Design notes (inventory):** In-context on D-01, before answer reveal.
- **Behaviour, states & acceptance criteria:**
  - Confidence 1-5 before reveal
  - calibration feed
  - AC: stored in student_response
- **Endpoints wired:**
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
  - `MAS-06` `GET /api/v1/students/{studentId}/calibration` — Over/under-confidence summary
- **Tables touched (via those endpoints):** `engagement_event`, `mastery_state`, `nudge`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## G-03 — Hint / Switch-Topic Nudge

- **Route:** `(overlay)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-053 (Be offered a hint or a switch to a different topic if I stay too long …)
- **Design notes (inventory):** In-context on D-01, triggered by stall detection.
- **Behaviour, states & acceptance criteria:**
  - Hint ladder step-up or switch topic suggestion
  - AC: hint count capped
  - nudge response stored
- **Endpoints wired:**
  - `PRA-07` `POST /api/v1/practice/sessions/{sessionId}/hint` — Next hint level (1–3)
  - `ENG-01` `POST /api/v1/engagement/events` — Batch behavioural events (respects telemetry_level)
  - `ENG-02` `POST /api/v1/engagement/nudges/{nudgeId}/respond` — Accept/dismiss a hint/topic-switch/break nudge
- **Tables touched (via those endpoints):** `engagement_event`, `hint_event`, `nudge`
- **AI prompts:** `P-TU-02` (Hint ladder generator)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## G-04 — Frustration-Aware Tutor Response

- **Route:** `(overlay)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Pilot / **W2**
- **User stories:** US-054 (Have the tutor notice frustration signals and respond with encourageme…)
- **Design notes (inventory):** Tone-shift in the chat/tutor component, not a new screen.
- **Behaviour, states & acceptance criteria:**
  - Frustration detected by rules (rapid wrong, idle) -> gentle rescue
  - AC: tone friendly, offers break
- **Endpoints wired:**
  - `TUT-08` `POST /api/v1/tutor/rescue` — Engagement service triggers confusion-rescue turn
  - `ENG-02` `POST /api/v1/engagement/nudges/{nudgeId}/respond` — Accept/dismiss a hint/topic-switch/break nudge
- **Tables touched (via those endpoints):** `nudge`, `tutor_session`
- **AI prompts:** `P-TU-05` (Confusion-rescue turn), `P-SF-01` (Learner-input classifier)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
