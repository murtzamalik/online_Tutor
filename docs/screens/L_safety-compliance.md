# Epic L — L. Safety & Compliance

## L-01 — Under-13 Parental Consent Flow

- **Route:** `/parent/children/[id]/consent`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-084 (Give explicit consent for my under-13 child's data collection.…)
- **Design notes (inventory):** Explicit consent capture.
- **Behaviour, states & acceptance criteria:**
  - Verifiable parental consent (age-assured adult + card micro-check or ID per D-11)
  - AC: child profile locked until consent_record exists
- **Endpoints wired:**
  - `CON-01` `GET /api/v1/consents` — Consents per child with versions
  - `CON-02` `POST /api/v1/students/{studentId}/consents/under13` — Record verifiable parental consent for under-13 data processing
  - `AGE-01` `POST /api/v1/age-assurance/start` — Start adult check via configured provider (pilot: self-declared + consent)
  - `AGE-02` `POST /api/v1/age-assurance/{recordId}/complete` — Complete check; sets outcome
  - `AGE-03` `GET /api/v1/age-assurance/status` — Current outcome (gates paid features)
- **Tables touched (via those endpoints):** `age_assurance_record`, `consent_record`, `voice_consent`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## L-02 — Data Deletion Request

- **Route:** `/parent/children/[id]/privacy/delete`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Phase 2 / **W3**
- **User stories:** US-086 (Request deletion of my child's data.…)
- **Design notes (inventory):** Right-to-erasure self-service.
- **Behaviour, states & acceptance criteria:**
  - Delete/export request, cooling-off, confirm
  - AC: SLA 30 days
  - hard delete job proves completion
- **Endpoints wired:**
  - `PRV-03` `POST /api/v1/students/{studentId}/deletion-request` — Request erasure; 14-day cooling-off
  - `PRV-04` `GET /api/v1/students/{studentId}/deletion-request` — Status / cancel window
  - `PRV-05` `DELETE /api/v1/students/{studentId}/deletion-request` — Cancel during cooling-off
  - `PRV-06` `POST /api/v1/students/{studentId}/data-export` — Request data export (async ZIP)
  - `PRV-07` `GET /api/v1/students/{studentId}/data-export/{exportId}` — Download when ready
- **Tables touched (via those endpoints):** `data_export_request`, `deletion_request`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## L-03 — Privacy / Data Settings (High-Privacy Defaults)

- **Route:** `/parent/children/[id]/privacy`  
- **Roles:** Parent + Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-085 (Default engagement-telemetry collection to high-privacy settings.…)
- **Design notes (inventory):** Engagement-telemetry opt-out defaults shown explicitly, not buried.
- **Behaviour, states & acceptance criteria:**
  - High-privacy defaults, data-sharing toggles
  - AC: defaults most-private
- **Endpoints wired:**
  - `PRV-01` `GET /api/v1/students/{studentId}/privacy` — Privacy settings (high-privacy defaults visible)
  - `PRV-02` `PUT /api/v1/students/{studentId}/privacy` — Change telemetry level, cohort opt-in, teacher visibility
  - `CON-06` `POST /api/v1/cookie-consent` — Store cookie choices; non-essential default off
- **Tables touched (via those endpoints):** `cookie_consent`, `privacy_settings`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## L-04 — Safeguarding Disclosure — Internal Ops View

- **Route:** `/staff/safeguarding`  
- **Roles:** Safeguarding Lead (internal)  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-082 (Run a secondary monitoring model reviewing every tutor conversation in…)
- **Design notes (inventory):** Not in the original catalogue — added because the locked architecture requires a human-facing screen for the Safeguarding/Disclosure Escalation service.
- **Behaviour, states & acceptance criteria:**
  - Disclosure list, detail, actions log, close
  - DSL only + MFA
  - AC: every view audited
  - scripted response templates
- **Endpoints wired:**
  - `SAF-06` `GET /api/v1/internal/safeguarding/disclosures` — L-04 list
  - `SAF-07` `GET /api/v1/internal/safeguarding/disclosures/{disclosureId}` — Detail with contacts (school DSL / parent)
  - `SAF-08` `POST /api/v1/internal/safeguarding/disclosures/{disclosureId}/actions` — Log an action/referral
  - `SAF-09` `POST /api/v1/internal/safeguarding/disclosures/{disclosureId}/close` — Close with outcome
  - `SAF-10` `GET /api/v1/internal/safeguarding/metrics` — Response times, volumes
  - `SAF-02` `GET /api/v1/internal/safety/flags` — Q-05 queue (pseudonymous refs)
  - `SAF-03` `GET /api/v1/internal/safety/flags/{flagId}` — Redacted excerpt + classifier reasoning
  - `SAF-04` `POST /api/v1/internal/safety/flags/{flagId}/triage` — Dismiss / triage with note
  - `SAF-05` `POST /api/v1/internal/safety/flags/{flagId}/escalate` — Escalate → creates disclosure (identity revealed to DSL only)
- **Tables touched (via those endpoints):** `audit_log`, `safeguarding_action`, `safeguarding_contact`, `safeguarding_disclosure_log`, `safety_classification`, `safety_flag`, `school`
- **AI prompts:** `P-SF-04` (Disclosure summary for the DSL)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## L-05 — Age Assurance

- **Route:** `/age-check`  
- **Roles:** Platform  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-105 (Confirm the paying account holder is an adult using a swappable method…)
- **Design notes (inventory):** Adult check on the paying account holder, behind a swappable interface (Decision 9) pending the OSA legal opinion.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Swappable age assurance provider adapter, result screen
  - AC: only outcome + method stored
- **Endpoints wired:**
  - `AGE-01` `POST /api/v1/age-assurance/start` — Start adult check via configured provider (pilot: self-declared + consent)
  - `AGE-02` `POST /api/v1/age-assurance/{recordId}/complete` — Complete check; sets outcome
  - `AGE-03` `GET /api/v1/age-assurance/status` — Current outcome (gates paid features)
- **Tables touched (via those endpoints):** `age_assurance_record`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
