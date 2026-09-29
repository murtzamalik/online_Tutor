# Epic A — A. Marketing & Discovery

## A-01 — Homepage

- **Route:** `/`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Ongoing / **W1**
- **User stories:** US-001 (Browse subject/qualification pages (11+, GCSE, iGCSE, A Level) to unde…)
- **Design notes (inventory):** Includes the live try-it sample question widget (US-003).
- **Behaviour, states & acceptance criteria:**
  - Hero + qualification tiles
  - live sample-question widget (anonymous, rate-limited, no PII)
  - outcomes strip
  - pricing teaser
  - cookie banner
  - SEO metadata + JSON-LD
  - loading/error skeletons
  - AC: renders from CMS/catalog data only, no hard-coded copy
- **Endpoints wired:**
  - `CAT-01` `GET /api/v1/catalog/qualifications` — Qualifications
  - `CAT-07` `GET /api/v1/catalog/pricing` — Price matrix by tab × year group × qualification × cycle (rules engine over data)
  - `MKT-07` `GET /api/v1/marketing/sample-question` — Anonymous sample question for the homepage
  - `MKT-08` `POST /api/v1/marketing/sample-question/{questionId}/answer` — Mark a sample answer anonymously (rate-limited, no storage of identity)
  - `MKT-05` `GET /api/v1/marketing/outcomes` — Outcome statistics with methodology
  - `CON-06` `POST /api/v1/cookie-consent` — Store cookie choices; non-essential default off
  - `MKT-09` `POST /api/v1/marketing/school-demo-request` — School demo/contact request
- **Tables touched (via those endpoints):** `cookie_consent`, `lead_capture`, `mark_scheme`, `marking_result`, `outcome_stat`, `pricing_plan`, `pricing_price`, `qualification`, `question`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-02 — Qualification / Subject Landing Page

- **Route:** `/[qualification]/[subject]`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Ongoing / **W1**
- **User stories:** US-001 (Browse subject/qualification pages (11+, GCSE, iGCSE, A Level) to unde…)
- **Design notes (inventory):** One template, parametrised by qualification (11+/GCSE/iGCSE/A-Level) and subject.
- **Behaviour, states & acceptance criteria:**
  - One template parametrised by qualification+subject slug
  - board list
  - topic tree preview
  - CTA to sign-up
  - 404 for unknown slug
  - AC: unlaunched subjects show 'coming soon' + lead capture
- **Endpoints wired:**
  - `CAT-01` `GET /api/v1/catalog/qualifications` — Qualifications
  - `CAT-02` `GET /api/v1/catalog/boards` — Boards (filter by qualification/subject)
  - `CAT-03` `GET /api/v1/catalog/subjects` — Subjects (Combined Science separate)
  - `CAT-04` `GET /api/v1/catalog/specifications` — Specifications by qualification/board/subject
  - `CAT-05` `GET /api/v1/catalog/specifications/{specificationId}/topics` — Topic tree (levels 1–3)
  - `MKT-10` `GET /api/v1/marketing/pages/{slug}` — Marketing page content blocks (qualification/subject pages)
  - `CAT-07` `GET /api/v1/catalog/pricing` — Price matrix by tab × year group × qualification × cycle (rules engine over data)
- **Tables touched (via those endpoints):** `app_config`, `exam_board`, `pricing_plan`, `pricing_price`, `qualification`, `spec_topic`, `spec_unit`, `specification`, `subject`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-03 — FAQ Page

- **Route:** `/faq`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Ongoing / **W1**
- **User stories:** US-002 (Read an FAQ covering marking accuracy, exam boards covered, cost vs tu…)
- **Design notes (inventory):** Min. 11 Q&As per brief.
- **Behaviour, states & acceptance criteria:**
  - Accordion FAQ (>=11 Q&As), search filter, FAQPage JSON-LD
  - AC: content editable via CMS-02
- **Endpoints wired:**
  - `MKT-01` `GET /api/v1/marketing/faq` — FAQ (11+ Q&As minimum)
- **Tables touched (via those endpoints):** `faq_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-04 — Live Sample Question (Try Before Signup)

- **Route:** `/try`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-003 (Try one live, marked sample question directly on the homepage before r…)
- **Design notes (inventory):** Embedded widget, reuses the Practice Question screen's marking result component.
- **Behaviour, states & acceptance criteria:**
  - Anonymous sample question, answer box, instant deterministic feedback (MCQ/numeric only, no AI cost)
  - sign-up CTA
  - AC: no cookies beyond consent, IP rate limit 10/h
- **Endpoints wired:**
  - `MKT-07` `GET /api/v1/marketing/sample-question` — Anonymous sample question for the homepage
  - `MKT-08` `POST /api/v1/marketing/sample-question/{questionId}/answer` — Mark a sample answer anonymously (rate-limited, no storage of identity)
- **Tables touched (via those endpoints):** `mark_scheme`, `marking_result`, `question`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-05 — Lead Magnet Download / Email-Gate Modal

- **Route:** `/resources/[slug]`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Should / Ongoing / **W1**
- **User stories:** US-004 (Download a free lead-magnet resource (familiarisation pack, baseline t…)
- **Behaviour, states & acceptance criteria:**
  - Email-gate modal, consent checkbox (marketing), double opt-in email via Postmark
  - download link expires
  - AC: lead stored in lead_capture with consent flag
- **Endpoints wired:**
  - `MKT-03` `GET /api/v1/marketing/resources` — Free resource library (glossary, past-paper index)
  - `MKT-02` `POST /api/v1/marketing/leads` — Email-gate lead capture with consent
- **Tables touched (via those endpoints):** `lead_capture`, `marketing_resource`, `past_paper`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-06 — Trust & Outcomes Page

- **Route:** `/results`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-005 (See transparent, methodology-explained outcome statistics rather than …)
- **Design notes (inventory):** Transparent, methodology-explained stats — ties to Section 6 AADC trust positioning.
- **Behaviour, states & acceptance criteria:**
  - Outcome stats with data-as-of date and method note
  - no unverifiable claims
  - AC: every stat has source + date
- **Endpoints wired:**
  - `MKT-05` `GET /api/v1/marketing/outcomes` — Outcome statistics with methodology
  - `MKT-04` `GET /api/v1/marketing/case-studies` — Approved, consented case studies only
- **Tables touched (via those endpoints):** `case_study`, `outcome_stat`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-07 — Case Studies / Testimonials Page

- **Route:** `/case-studies`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-006 (Read named case studies/testimonials with specific before/after scores…)
- **Design notes (inventory):** Requires a consent-collection workflow (Content Admin side, not in this inventory yet).
- **Behaviour, states & acceptance criteria:**
  - Case study cards, consent-verified only
  - AC: only rows with consent_verified=true are returned
- **Endpoints wired:**
  - `MKT-04` `GET /api/v1/marketing/case-studies` — Approved, consented case studies only
- **Tables touched (via those endpoints):** `case_study`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-08 — Exam Date Calendar

- **Route:** `/exam-dates`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Could / Ongoing / **W1**
- **User stories:** US-007 (Find an exam-date calendar by region so I can plan revision timelines.…)
- **Design notes (inventory):** Filterable by region.
- **Behaviour, states & acceptance criteria:**
  - Filter by board/subject, add-to-calendar (.ics), countdown
  - AC: dates flagged 'provisional' until confirmed
- **Endpoints wired:**
  - `CAT-06` `GET /api/v1/catalog/exam-dates` — Exam-date calendar, region filter
  - `CAT-03` `GET /api/v1/catalog/subjects` — Subjects (Combined Science separate)
- **Tables touched (via those endpoints):** `exam_date`, `subject`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-09 — "Which Plan Is Right for Us" Quiz

- **Route:** `/plan-quiz`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-008 (Take a short "which plan is right for us" quiz instead of parsing the …)
- **Design notes (inventory):** Short branching quiz, ends on Pricing Page (C-01) pre-filtered.
- **Behaviour, states & acceptance criteria:**
  - 3-5 question quiz -> recommended plan
  - result deep-links to C-02
  - AC: no account required
- **Endpoints wired:**
  - `MKT-06` `POST /api/v1/marketing/plan-quiz` — Branching quiz → recommended plan (pre-filters C-01)
  - `CAT-07` `GET /api/v1/catalog/pricing` — Price matrix by tab × year group × qualification × cycle (rules engine over data)
- **Tables touched (via those endpoints):** `pricing_plan`, `pricing_price`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## A-10 — Free Resource Library

- **Route:** `/library`  
- **Roles:** Visitor  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-009 (Browse a free, publicly-accessible resource library (glossary, past-pa…)
- **Design notes (inventory):** No email gate.
- **Behaviour, states & acceptance criteria:**
  - Free resource grid with filters
  - AC: gated items route to A-05
- **Endpoints wired:**
  - `MKT-03` `GET /api/v1/marketing/resources` — Free resource library (glossary, past-paper index)
- **Tables touched (via those endpoints):** `marketing_resource`, `past_paper`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
