# Epic O — O. School / B2B Channel

## O-01 — Teacher Class Management

- **Route:** `/school/classes`  
- **Roles:** Teacher  
- **Platform:** Web (+ Mobile view)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-095 (Manage a class of students and assign topics/homework.…)
- **Design notes (inventory):** Catalogue lists this as "Deferred (B2B)"; superseded by Arshad's locked decision to launch schools in parallel with consumer. Assign topics/homework to a class.
- **Baseline v1.0 change:** UPDATED — Phase label normalised to Pilot (D-23).
- **Behaviour, states & acceptance criteria:**
  - Class list, add pupils, engagement
  - AC: RLS proves teacher sees own school only
- **Endpoints wired:**
  - `SCH-01` `GET /api/v1/schools/{schoolId}` — School overview, seats, DPA state
  - `SCH-02` `GET /api/v1/schools/{schoolId}/classes` — Classes
  - `SCH-03` `POST /api/v1/schools/{schoolId}/classes` — Create class
  - `SCH-04` `PATCH /api/v1/classes/{classId}` — Rename/archive
  - `SCH-05` `GET /api/v1/classes/{classId}/pupils` — Roster
  - `SCH-06` `POST /api/v1/classes/{classId}/pupils` — Add rostered pupils
  - `SCH-07` `DELETE /api/v1/classes/{classId}/pupils/{studentId}` — Remove
  - `INS-01` `GET /api/v1/classes/{classId}/mastery` — Class × topic heatmap
  - `INS-02` `GET /api/v1/classes/{classId}/engagement` — Time-on-task, participation
- **Tables touched (via those endpoints):** `class_pupil`, `class_teacher`, `engagement_daily`, `mastery_state`, `school`, `school_class`, `school_dpa_status`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## O-02 — School Admin Class Dashboard

- **Route:** `/school/dashboard`  
- **Roles:** School Admin  
- **Platform:** Web (+ Mobile view)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-096 (See a class-level dashboard of mastery and engagement.…)
- **Design notes (inventory):** Class-level mastery/engagement — matches the Teacher/School Admin Console in the locked architecture doc.
- **Baseline v1.0 change:** UPDATED — Phase label normalised to Pilot (D-23).
- **Behaviour, states & acceptance criteria:**
  - School KPIs, class comparison, CSV export
  - AC: aggregate only, no AI transcripts
- **Endpoints wired:**
  - `INS-04` `GET /api/v1/schools/{schoolId}/dashboard` — School-level dashboard
  - `INS-07` `GET /api/v1/classes/{classId}/export.csv` — CSV export
  - `SCH-02` `GET /api/v1/schools/{schoolId}/classes` — Classes
- **Tables touched (via those endpoints):** `class_teacher`, `engagement_daily`, `mastery_state`, `school_class`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## O-03 — KCSIE Compliance Confirmation

- **Route:** `/school/kcsie`  
- **Roles:** School Admin  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-097 (Confirm the platform aligns with our KCSIE filtering/monitoring policy…)
- **Design notes (inventory):** Confirms filtering/monitoring alignment before school-premises use — ties to the Safeguarding Note already delivered.
- **Baseline v1.0 change:** UPDATED — Phase label normalised to Pilot (D-23).
- **Behaviour, states & acceptance criteria:**
  - KCSIE pack, confirmation with named signatory, safeguarding contacts
  - AC: confirmation immutable + audited
- **Endpoints wired:**
  - `KCS-01` `GET /api/v1/schools/{schoolId}/kcsie-pack` — Downloadable KCSIE-mapped policy pack + questionnaire
  - `KCS-02` `POST /api/v1/schools/{schoolId}/kcsie-confirmation` — Confirm filtering/monitoring alignment
  - `KCS-03` `GET /api/v1/schools/{schoolId}/safeguarding-contacts` — Our DSL + school DSL contacts
- **Tables touched (via those endpoints):** `kcsie_confirmation`, `safeguarding_contact`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## O-04 — Teacher Homework / Assignment Builder

- **Route:** `/school/classes/[classId]/assignments/new`  
- **Roles:** Teacher  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-119 (Set adaptive homework for a class with due dates and track completion …)
- **Design notes (inventory):** Adaptive homework per class with due dates and completion tracking.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Builder: topics/questions, due date, targets
  - AC: publish notifies pupils
- **Endpoints wired:**
  - `ASG-01` `POST /api/v1/classes/{classId}/assignments` — Create adaptive homework (topics, count, due date)
  - `ASG-02` `GET /api/v1/classes/{classId}/assignments` — List with completion
  - `ASG-03` `GET /api/v1/assignments/{assignmentId}` — Completion tracker per pupil
  - `ASG-04` `PATCH /api/v1/assignments/{assignmentId}` — Edit/extend/close
  - `ASG-06` `POST /api/v1/assignments/{assignmentId}/publish` — Publish + notify pupils
  - `CAT-05` `GET /api/v1/catalog/specifications/{specificationId}/topics` — Topic tree (levels 1–3)
- **Tables touched (via those endpoints):** `assignment`, `assignment_target`, `notification`, `spec_topic`, `spec_unit`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## O-05 — Class Misconception Heatmap & Pupil Drill-Down

- **Route:** `/school/classes/[classId]/insights`  
- **Roles:** Teacher  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-120 (See a class misconception heatmap and drill into any pupil — so that I…)
- **Design notes (inventory):** Class misconception heatmap by spec point; drill into any pupil.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Heatmap topic x pupil, drill-down, AI class insight summary
  - AC: summary generated from aggregates only
- **Endpoints wired:**
  - `INS-03` `GET /api/v1/classes/{classId}/pupils/{studentId}/drilldown` — Pupil detail (respects teacher_visibility)
  - `INS-05` `GET /api/v1/classes/{classId}/misconceptions` — Top misconceptions for the class
  - `INS-06` `GET /api/v1/classes/{classId}/insight-summary` — AI narrative over the heatmap (statistics only)
- **Tables touched (via those endpoints):** `mastery_state`, `misconception_observation`, `student_response`
- **AI prompts:** `P-RP-05` (Class insight summary (teacher)), `P-MK-08` (Misconception classifier)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## O-06 — School Onboarding — Rostering & SSO

- **Route:** `/school/onboarding`  
- **Roles:** School admin  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-121 (Import pupils and classes from our MIS or a CSV and enable Google/Micr…)
- **Design notes (inventory):** MIS or CSV rostering; Google/Microsoft SSO for pupils and staff.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Roster CSV/MIS (Wonde) import, SSO, staff invites, pupil login cards
  - AC: dry-run diff before commit
- **Endpoints wired:**
  - `ONB-01` `POST /api/v1/schools/{schoolId}/roster-imports` — Upload CSV
  - `ONB-02` `GET /api/v1/schools/{schoolId}/roster-imports/{importId}` — Validation preview (new / moved / errors)
  - `ONB-03` `POST /api/v1/schools/{schoolId}/roster-imports/{importId}/commit` — Create pupils/classes; issue credentials
  - `ONB-04` `POST /api/v1/schools/{schoolId}/mis-connection` — Connect MIS (Wonde adapter)
  - `ONB-05` `GET /api/v1/schools/{schoolId}/sso` — SSO config
  - `ONB-06` `PUT /api/v1/schools/{schoolId}/sso` — Enable Google/Microsoft SSO for domain
  - `ONB-07` `POST /api/v1/schools/{schoolId}/staff-invites` — Invite teachers (MFA enforced for admins)
  - `ONB-08` `POST /api/v1/schools/{schoolId}/pupil-login-cards` — Printable pupil credential cards
- **Tables touched (via those endpoints):** `account`, `class_pupil`, `mis_connection`, `roster_import`, `roster_import_row`, `school_class`, `school_member`, `sso_connection`, `student_credential`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## O-07 — School DPA & Invoice Billing

- **Route:** `/school/billing`  
- **Roles:** School business manager  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-122 (Sign the DPA online and pay by invoice and purchase order — so that we…)
- **Design notes (inventory):** Online DPA signature (template pending legal review, P-5); invoice + purchase-order billing at the same per-pupil price.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - DPA e-sign, PO upload, invoices
  - AC: DPA signed before pupil data enabled
- **Endpoints wired:**
  - `DPA-01` `GET /api/v1/schools/{schoolId}/dpa` — DPA text/status/sub-processors
  - `DPA-02` `POST /api/v1/schools/{schoolId}/dpa/sign` — Sign online (typed signature, role, IP hash) → PDF
  - `DPA-03` `GET /api/v1/schools/{schoolId}/dpa/pdf` — Countersigned PDF
  - `SCB-01` `GET /api/v1/schools/{schoolId}/billing` — Seats, price, PO status, invoices
  - `SCB-02` `POST /api/v1/schools/{schoolId}/purchase-orders` — Submit PO
  - `SCB-03` `GET /api/v1/schools/{schoolId}/invoices` — Invoices
  - `SCB-04` `GET /api/v1/schools/{schoolId}/invoices/{invoiceId}/pdf` — Invoice PDF
- **Tables touched (via those endpoints):** `audit_log`, `purchase_order`, `school_dpa_signature`, `school_dpa_status`, `school_invoice`, `sub_processor`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
