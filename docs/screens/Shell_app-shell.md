# Epic Shell — App Shell

## Shell-01 — Student Home Dashboard

- **Route:** `/home`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-130 (Hold badges, streaks and XP back to Phase 2 and remove them from MVP s…), US-057 (Maintain a mastery model (BKT, graduating to DKT at scale) per student…), US-058 (Have previously-mastered topics resurfaced on a spaced schedule so I d…)
- **Design notes (inventory):** Landing screen post-login: today's micro-goal, continue-practice, recent mastery, quick links. Ties together D-08, H-06. No streak/XP elements in the MVP.
- **Baseline v1.0 change:** REVISED — Streak counter removed from greeting (D-21).
- **Behaviour, states & acceptance criteria:**
  - Student home: continue, daily goal, due reviews, assignments, weekly plan
- **Endpoints wired:**
  - `STU-12` `GET /api/v1/students/{studentId}/home` — Student home aggregate (goal, continue, due reviews, recent mastery, assignments)
  - `STU-13` `GET /api/v1/students/{studentId}/daily-goal` — Goal tile data
  - `MAS-07` `GET /api/v1/students/{studentId}/review-due` — FSRS reviews due
  - `ASG-05` `GET /api/v1/students/{studentId}/assignments` — Pupil's assignments
  - `PLN-02` `GET /api/v1/students/{studentId}/weekly-plan` — Current plan
  - `ENG-03` `GET /api/v1/students/{studentId}/surprise-quiz` — Fetch pending surprise quiz
- **Tables touched (via those endpoints):** `assignment`, `assignment_target`, `daily_goal`, `daily_goal_progress`, `flashcard_state`, `mastery_state`, `student_enrolment`, `surprise_quiz`, `weekly_plan`, `weekly_plan_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-02 — Parent Home Dashboard

- **Route:** `/parent`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** 
- **Design notes (inventory):** Landing screen post-login: per-child summary cards, linking to H-01.
- **Behaviour, states & acceptance criteria:**
  - Parent home across children
  - alerts
  - billing status
- **Endpoints wired:**
  - `RPT-01` `GET /api/v1/parents/home` — Per-child cards (web + mobile)
  - `STU-01` `GET /api/v1/students` — List the parent's children with tier, enrolments, status
  - `RPT-05` `GET /api/v1/students/{studentId}/alerts` — Early-warning alerts
  - `BIL-03` `GET /api/v1/billing/subscription` — Current subscription, trial end, next charge
- **Tables touched (via those endpoints):** `alert`, `mastery_state`, `parent_student_link`, `student_enrolment`, `student_profile`, `subscription`, `subscription_item`, `weekly_report`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-03 — Global Navigation / App Shell

- **Route:** `(layout)`  
- **Roles:** All  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** 
- **Design notes (inventory):** Top nav (web) / tab bar (mobile): Home, Practice, Revision, Progress, Voice Tutor, Settings.
- **Behaviour, states & acceptance criteria:**
  - Role-aware nav, notifications bell, profile menu, feature-flag gating
- **Endpoints wired:**
  - `AUTH-17` `GET /api/v1/me` — Profile, roles, visual tier, entitlements, feature flags
  - `RPT-07` `GET /api/v1/notifications` — Notification centre
  - `PRA-16` `GET /api/v1/search` — In-app search across topics, notes, decks, past papers
- **Tables touched (via those endpoints):** `account`, `account_role`, `entitlement`, `feature_flag`, `flashcard_deck`, `notification`, `past_paper`, `revision_note`, `spec_topic`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-04 — Login / Forgot Password / Auth

- **Route:** `/login`  
- **Roles:** All  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** 
- **Design notes (inventory):** Standard auth flow, not called out by any user story but required.
- **Baseline v1.0 change:** UPDATED — Web login, reset and staff MFA are detailed in Shell-09; Shell-04 remains the mobile/app auth flow.
- **Behaviour, states & acceptance criteria:**
  - Parent/student/child login, forgot/reset
  - AC: generic errors, rate limits
- **Endpoints wired:**
  - `AUTH-04` `POST /api/v1/auth/login` — Email+password login; returns tokens or an MFA challenge for MFA-required accounts
  - `AUTH-09` `POST /api/v1/auth/refresh` — Rotate refresh token (reuse of a rotated token revokes the family)
  - `AUTH-10` `POST /api/v1/auth/logout` — Revoke current session
  - `AUTH-11` `POST /api/v1/auth/password/forgot` — Send reset link (always 202, no account enumeration)
  - `AUTH-12` `POST /api/v1/auth/password/reset` — Set new password with token; revokes all sessions
  - `AUTH-13` `GET /api/v1/auth/oidc/{provider}/start` — Start Google/Microsoft sign-in (PKCE); school SSO uses domain match
  - `AUTH-14` `GET /api/v1/auth/oidc/{provider}/callback` — Complete OIDC; links or creates account; pupils provisioned only if rostered
  - `AUTH-15` `POST /api/v1/auth/student/picture-pin` — Child login by handle + picture sequence; lockout after 5 failures and parent notified
- **Tables touched (via those endpoints):** `account`, `auth_session`, `notification`, `oidc_identity`, `password_reset`, `sso_connection`, `student_credential`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-05 — Notifications Centre

- **Route:** `/notifications`  
- **Roles:** Parent + Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** 
- **Design notes (inventory):** Surfaces H-05 alerts, weekly report ready, homework due (O-04).
- **Baseline v1.0 change:** UPDATED — Streak reminders removed (D-21).
- **Behaviour, states & acceptance criteria:**
  - List, read state, preferences, device registration
- **Endpoints wired:**
  - `RPT-07` `GET /api/v1/notifications` — Notification centre
  - `RPT-08` `POST /api/v1/notifications/{notificationId}/read` — Mark read
  - `RPT-09` `POST /api/v1/notifications/read-all` — Mark all read
  - `RPT-10` `GET /api/v1/notification-preferences` — Channel × kind
  - `RPT-11` `PUT /api/v1/notification-preferences` — Update
  - `RPT-12` `POST /api/v1/devices` — Register OneSignal id
- **Tables touched (via those endpoints):** `device_registration`, `notification`, `notification_preference`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-06 — Account & Profile Settings

- **Route:** `/settings`  
- **Roles:** All  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** 
- **Design notes (inventory):** Name, child switcher, subscription link (C-04), accessibility link (J-03), privacy link (L-03).
- **Behaviour, states & acceptance criteria:**
  - Profile, password, sessions, notification prefs
- **Endpoints wired:**
  - `AUTH-17` `GET /api/v1/me` — Profile, roles, visual tier, entitlements, feature flags
  - `AUTH-18` `PATCH /api/v1/me` — Update display name, locale, marketing opt-in
  - `AUTH-19` `POST /api/v1/me/password/change` — Change password (requires current)
  - `AUTH-20` `GET /api/v1/me/sessions` — List active sessions
  - `AUTH-21` `DELETE /api/v1/me/sessions/{sessionId}` — Revoke a session
  - `STU-03` `PATCH /api/v1/students/{studentId}` — Edit first name, year group, avatar
  - `RPT-10` `GET /api/v1/notification-preferences` — Channel × kind
  - `RPT-11` `PUT /api/v1/notification-preferences` — Update
  - `STU-05` `GET /api/v1/students/{studentId}` — Single learner summary
- **Tables touched (via those endpoints):** `account`, `account_role`, `auth_session`, `entitlement`, `feature_flag`, `notification_preference`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-07 — Empty / Loading / Error States

- **Route:** `(components)`  
- **Roles:** All  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** 
- **Design notes (inventory):** Not a single screen — a required state-set for every list/dashboard screen above. Called out separately so it isn't silently skipped.
- **Behaviour, states & acceptance criteria:**
  - Shared empty/loading/error/offline/maintenance/403/404/500 patterns
  - AC: all pages use these
- **Endpoints wired:** none (specced only / flag off)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-08 — In-App Search

- **Route:** `/search`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** 
- **Design notes (inventory):** Topic/subject search across practice, revision, past papers.
- **Behaviour, states & acceptance criteria:**
  - Topic/notes/deck search
  - AC: scoped to entitlements
- **Endpoints wired:**
  - `PRA-16` `GET /api/v1/search` — In-app search across topics, notes, decks, past papers
- **Tables touched (via those endpoints):** `flashcard_deck`, `past_paper`, `revision_note`, `spec_topic`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-09 — Web Login, Reset & Staff MFA

- **Route:** `/staff/login`  
- **Roles:** All (MFA: staff, reviewers, school admins)  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-102 (Log in on the web, reset my password and use Google or Microsoft sign-…), US-103 (Be required to use two-step verification — so that privileged access t…)
- **Design notes (inventory):** Web login, password reset, Google/Microsoft sign-in; two-step verification enforced for staff, reviewers and school admins.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Staff login + TOTP MFA enrol/verify + recovery codes
  - AC: MFA mandatory for staff/reviewer/school admin
- **Endpoints wired:**
  - `AUTH-04` `POST /api/v1/auth/login` — Email+password login; returns tokens or an MFA challenge for MFA-required accounts
  - `AUTH-05` `POST /api/v1/auth/mfa/verify` — Complete MFA challenge (TOTP or recovery code)
  - `AUTH-06` `POST /api/v1/auth/mfa/enroll/start` — Begin TOTP enrolment; returns otpauth URI
  - `AUTH-07` `POST /api/v1/auth/mfa/enroll/confirm` — Confirm TOTP; returns 10 recovery codes once
  - `AUTH-08` `POST /api/v1/auth/mfa/recovery-codes/regenerate` — Regenerate recovery codes (requires fresh MFA)
  - `AUTH-11` `POST /api/v1/auth/password/forgot` — Send reset link (always 202, no account enumeration)
  - `AUTH-12` `POST /api/v1/auth/password/reset` — Set new password with token; revokes all sessions
- **Tables touched (via those endpoints):** `account`, `audit_log`, `auth_session`, `mfa_factor`, `mfa_recovery_code`, `password_reset`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## Shell-10 — Legal Pages & Cookie Consent

- **Route:** `/legal/[slug]`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-104 (Read plain-English terms, privacy and AI-data pages and choose which c…)
- **Design notes (inventory):** Plain-English terms, privacy and AI-data pages; PECR cookie consent with non-essential cookies off by default.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Terms, privacy, cookies, sub-processors
  - versioned legal_document
- **Endpoints wired:**
  - `CON-05` `GET /api/v1/legal/{slug}` — Current legal document (terms, privacy, ai-data, cookies, safeguarding)
  - `CON-06` `POST /api/v1/cookie-consent` — Store cookie choices; non-essential default off
  - `CON-07` `GET /api/v1/legal/sub-processors` — Public sub-processor list (AI-data page)
- **Tables touched (via those endpoints):** `cookie_consent`, `legal_document`, `sub_processor`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
