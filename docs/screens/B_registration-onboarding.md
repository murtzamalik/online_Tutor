# Epic B — B. Registration & Onboarding

## B-01 — Parent Sign-Up

- **Route:** `/signup`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-010 (Create an account to manage my child's subscription and progress.…)
- **Behaviour, states & acceptance criteria:**
  - Parent email/password + OIDC (Google/Apple)
  - T&C + privacy consent
  - age assurance step (adult)
  - password strength meter
  - AC: parent must be 18+ via age assurance before child creation
- **Endpoints wired:**
  - `AUTH-01` `POST /api/v1/auth/register-parent` — Create parent account; sends 6-digit email code; records terms consent
  - `AGE-01` `POST /api/v1/age-assurance/start` — Start adult check via configured provider (pilot: self-declared + consent)
  - `AGE-02` `POST /api/v1/age-assurance/{recordId}/complete` — Complete check; sets outcome
  - `AGE-03` `GET /api/v1/age-assurance/status` — Current outcome (gates paid features)
  - `CON-05` `GET /api/v1/legal/{slug}` — Current legal document (terms, privacy, ai-data, cookies, safeguarding)
  - `CON-06` `POST /api/v1/cookie-consent` — Store cookie choices; non-essential default off
- **Tables touched (via those endpoints):** `account`, `account_role`, `age_assurance_record`, `consent_record`, `cookie_consent`, `email_verification`, `legal_document`, `sub_processor`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-02 — Add Child Profile

- **Route:** `/parent/children/new`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-011 (Add multiple child profiles under one account.…)
- **Design notes (inventory):** Multi-child, one parent login.
- **Behaviour, states & acceptance criteria:**
  - Child name, year group, DOB->under-13 detection, picture-PIN chooser for 11+ learners, standalone email for 13+
  - AC: <13 triggers L-01 before profile is active
  - no child email for <13
- **Endpoints wired:**
  - `STU-01` `GET /api/v1/students` — List the parent's children with tier, enrolments, status
  - `STU-02` `POST /api/v1/students` — Add child (email-verified parent only); computes age band/tier; under-13 triggers consent gate
  - `STU-04` `PUT /api/v1/students/{studentId}/picture-pin` — Set/replace picture PIN; returns login handle
  - `CON-02` `POST /api/v1/students/{studentId}/consents/under13` — Record verifiable parental consent for under-13 data processing
  - `AGE-01` `POST /api/v1/age-assurance/start` — Start adult check via configured provider (pilot: self-declared + consent)
- **Tables touched (via those endpoints):** `age_assurance_record`, `consent_record`, `daily_goal`, `parent_ai_controls`, `parent_student_link`, `privacy_settings`, `student_credential`, `student_enrolment`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-03 — Student Standalone Sign-Up

- **Route:** `/student/signup`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-012 (Have my own profile under a parent account, or use the platform standa…)
- **Design notes (inventory):** No parent account required.
- **Behaviour, states & acceptance criteria:**
  - Student 13+ self sign-up, age assurance, parent-email request for 13-15 (configurable)
  - AC: <13 blocked with parent-flow redirect
- **Endpoints wired:**
  - `AUTH-16` `POST /api/v1/auth/student/register` — Standalone student (13+) sign-up; under-13 rejected here
  - `AGE-01` `POST /api/v1/age-assurance/start` — Start adult check via configured provider (pilot: self-declared + consent)
  - `AGE-02` `POST /api/v1/age-assurance/{recordId}/complete` — Complete check; sets outcome
  - `AGE-03` `GET /api/v1/age-assurance/status` — Current outcome (gates paid features)
  - `CON-05` `GET /api/v1/legal/{slug}` — Current legal document (terms, privacy, ai-data, cookies, safeguarding)
- **Tables touched (via those endpoints):** `account`, `age_assurance_record`, `legal_document`, `student_profile`, `sub_processor`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-04 — Qualification / Board / Subject Selector

- **Route:** `/onboarding/subjects`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-013 (Select qualification, exam board and subject(s) so content is tailored…)
- **Design notes (inventory):** Data model = qualification x board x subject. Must support 7 board-tracks including both iGCSE boards.
- **Behaviour, states & acceptance criteria:**
  - Qualification -> board -> subject -> spec tiles
  - multi-select subject
  - tier (Foundation/Higher) choice
  - AC: only launched specs selectable
- **Endpoints wired:**
  - `CAT-01` `GET /api/v1/catalog/qualifications` — Qualifications
  - `CAT-02` `GET /api/v1/catalog/boards` — Boards (filter by qualification/subject)
  - `CAT-03` `GET /api/v1/catalog/subjects` — Subjects (Combined Science separate)
  - `CAT-04` `GET /api/v1/catalog/specifications` — Specifications by qualification/board/subject
  - `CAT-05` `GET /api/v1/catalog/specifications/{specificationId}/topics` — Topic tree (levels 1–3)
  - `STU-06` `GET /api/v1/students/{studentId}/enrolments` — List enrolments (board/subject/goal/target grade)
  - `STU-07` `POST /api/v1/students/{studentId}/enrolments` — Select qualification/board/subject (checks entitlement)
- **Tables touched (via those endpoints):** `entitlement`, `exam_board`, `qualification`, `spec_topic`, `spec_unit`, `specification`, `student_enrolment`, `subject`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-05 — Study Goal Setter

- **Route:** `/onboarding/goals`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-014 (Be asked what I want from this subject — exam prep, general study, tar…)
- **Design notes (inventory):** Exam prep / general study / target score / weak-area focus.
- **Behaviour, states & acceptance criteria:**
  - Target grade, exam date, weekly hours
  - AC: exam date defaults from CAT-06
- **Endpoints wired:**
  - `STU-14` `PUT /api/v1/students/{studentId}/daily-goal` — Change daily question target
  - `STU-08` `PATCH /api/v1/enrolments/{enrolmentId}` — Set goal type, weak-area focus, exam date; parent sets target grade
  - `CAT-06` `GET /api/v1/catalog/exam-dates` — Exam-date calendar, region filter
- **Tables touched (via those endpoints):** `daily_goal`, `exam_date`, `student_enrolment`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-06 — Adaptive Diagnostic / Baseline Test

- **Route:** `/onboarding/diagnostic`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-015 (Take a short adaptive diagnostic/baseline test so the system knows my …), US-059 (Run an IRT-based adaptive placement test so a student's starting level…)
- **Design notes (inventory):** Multi-screen flow: intro, IRT-adaptive question sequence, results. No skip/back once started.
- **Behaviour, states & acceptance criteria:**
  - Adaptive 15-25 question baseline
  - progress
  - pause/resume
  - result maps to mastery seeds
  - AC: mastery_state seeded for all level-1 topics touched
- **Endpoints wired:**
  - `DIA-01` `POST /api/v1/diagnostics` — Start adaptive baseline (IRT), no skip/back
  - `DIA-02` `GET /api/v1/diagnostics/{diagnosticId}/next` — Next adaptive item
  - `DIA-03` `POST /api/v1/diagnostics/{diagnosticId}/answers` — Answer; updates theta
  - `DIA-04` `GET /api/v1/diagnostics/{diagnosticId}/result` — Results + starting mastery + recommended tier
  - `MOC-09` `GET /api/v1/students/{studentId}/mock-papers` — History
- **Tables touched (via those endpoints):** `diagnostic_run`, `mastery_state`, `mock_paper`, `practice_session`, `question`, `student_response`
- **AI prompts:** `P-RP-04` (Weekly plan rationale)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-07 — Personalised Weekly Plan Reveal

- **Route:** `/onboarding/plan`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-016 (Receive a personalised weekly revision plan generated from my subject/…)
- **Design notes (inventory):** Generated from subject/board/target exam date.
- **Behaviour, states & acceptance criteria:**
  - Weekly plan reveal with rationale, editable items
  - AC: plan built by code, rationale text by AI (no PII)
- **Endpoints wired:**
  - `PLN-01` `POST /api/v1/students/{studentId}/weekly-plan/generate` — Build plan (code) from subject/board/date/mastery; AI writes rationale text only
  - `PLN-02` `GET /api/v1/students/{studentId}/weekly-plan` — Current plan
  - `PLN-03` `PATCH /api/v1/weekly-plan-items/{itemId}` — Mark complete / move
- **Tables touched (via those endpoints):** `weekly_plan`, `weekly_plan_item`
- **AI prompts:** `P-RP-04` (Weekly plan rationale)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-08 — Parent Sets Target Grade

- **Route:** `/parent/children/[id]/target`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-017 (Set my child's target grade or score per subject so practice is pitche…)
- **Design notes (inventory):** Per subject.
- **Behaviour, states & acceptance criteria:**
  - Parent target grade with realism indicator vs predicted grade
  - AC: change audited
- **Endpoints wired:**
  - `STU-03` `PATCH /api/v1/students/{studentId}` — Edit first name, year group, avatar
  - `STU-08` `PATCH /api/v1/enrolments/{enrolmentId}` — Set goal type, weak-area focus, exam date; parent sets target grade
  - `MAS-02` `GET /api/v1/students/{studentId}/predicted-grades` — Predicted grade band with interval
- **Tables touched (via those endpoints):** `grade_boundary`, `predicted_grade_snapshot`, `student_enrolment`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-09 — Accessibility Preferences (Onboarding)

- **Route:** `/onboarding/accessibility`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 3 / **W4**
- **User stories:** US-018 (Set accessibility preferences (dyslexia font, text size, TTS) during o…)
- **Design notes (inventory):** Dyslexia font, text size, TTS toggle. Links to Settings > Accessibility (J-03).
- **Behaviour, states & acceptance criteria:**
  - Font, spacing, contrast, reduce motion, TTS, extra-time preference
  - AC: applied immediately via CSS tokens and persisted
- **Endpoints wired:**
  - `STU-10` `GET /api/v1/students/{studentId}/accessibility` — Read accessibility profile
  - `STU-11` `PUT /api/v1/students/{studentId}/accessibility` — Dyslexia font, text size, TTS, reduced motion, simplified language, extended-time %
- **Tables touched (via those endpoints):** `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-10 — Email Verification

- **Route:** `/verify-email`  
- **Roles:** Parent  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-100 (Verify my email with a code before adding a child — so that the accoun…)
- **Design notes (inventory):** 6-digit code, resend with cooldown. Blocks Add Child (B-02) until verified.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Token landing, resend with cooldown, expired-link state
  - AC: unverified parents cannot start trial
- **Endpoints wired:**
  - `AUTH-02` `POST /api/v1/auth/verify-email` — Verify code (max 5 attempts, TTL 15 min); activates account
  - `AUTH-03` `POST /api/v1/auth/verify-email/resend` — Resend code with 60 s cooldown (rate limited)
- **Tables touched (via those endpoints):** `account`, `email_verification`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## B-11 — Child Login — Picture PIN

- **Route:** `/child-login`  
- **Roles:** 11+ learner  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-101 (Log in with a picture PIN instead of an email and password — so that I…)
- **Design notes (inventory):** Tier 1 (11+). Parent sets the picture PIN in B-02; lockout after repeated failures notifies the parent.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Child picks avatar/picture sequence PIN
  - lockout after 5 tries -> parent unlock
  - AC: no child email or free-text password for <13
- **Endpoints wired:**
  - `AUTH-15` `POST /api/v1/auth/student/picture-pin` — Child login by handle + picture sequence; lockout after 5 failures and parent notified
  - `SUP-07` `POST /api/v1/internal/support/students/{studentId}/unlock-pin` — Unlock picture PIN
- **Tables touched (via those endpoints):** `audit_log`, `auth_session`, `notification`, `student_credential`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
