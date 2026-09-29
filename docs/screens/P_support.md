# Epic P — P. Support

## P-01 — Help Centre / FAQ Search

- **Route:** `/help`  
- **Roles:** Parent + Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-098 (Search a help centre/FAQ to self-serve common questions.…)
- **Behaviour, states & acceptance criteria:**
  - Search, categories, article, feedback
  - AC: content via CMS-03
- **Endpoints wired:**
  - `HLP-01` `GET /api/v1/help/articles` — Search (Postgres full-text)
  - `HLP-02` `GET /api/v1/help/articles/{slug}` — Article
  - `HLP-03` `POST /api/v1/help/articles/{articleId}/feedback` — Helpful yes/no
- **Tables touched (via those endpoints):** `help_article`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## P-02 — Live Chat Widget

- **Route:** `(widget)`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-099 (Use live chat for a quick answer to an account/billing issue.…)
- **Design notes (inventory):** Account/billing quick answers.
- **Behaviour, states & acceptance criteria:**
  - In-house live chat (no third-party)
  - AC: business-hours banner
- **Endpoints wired:**
  - `HLP-04` `POST /api/v1/support/chat` — Start in-house chat (Phase 2)
  - `HLP-05` `POST /api/v1/support/chat/{chatId}/messages` — Post/read messages
- **Tables touched (via those endpoints):** `support_chat_message`, `support_chat_session`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## P-03 — Support Admin Console

- **Route:** `/staff/support`  
- **Roles:** Support agent  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-123 (Look up an account, issue a refund or send a password reset without se…)
- **Design notes (inventory):** Account lookup, refunds, password reset — no access to learning content. Every action written to P-04.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Account lookup (no learning content), reset, refund, notes, trial extend, unlock PIN
  - AC: every action audited
  - refund limit + 2nd approver above threshold
- **Endpoints wired:**
  - `SUP-01` `GET /api/v1/internal/support/accounts` — Search accounts by email/handle (no learning content)
  - `SUP-02` `GET /api/v1/internal/support/accounts/{accountId}` — Account, subscription, invoices, children names — no answers/transcripts
  - `SUP-03` `POST /api/v1/internal/support/accounts/{accountId}/password-reset` — Send reset
  - `SUP-04` `POST /api/v1/internal/support/accounts/{accountId}/refund` — Refund invoice via Stripe
  - `SUP-05` `POST /api/v1/internal/support/accounts/{accountId}/notes` — Add note
  - `SUP-06` `POST /api/v1/internal/support/accounts/{accountId}/extend-trial` — Extend trial (bounded)
  - `SUP-07` `POST /api/v1/internal/support/students/{studentId}/unlock-pin` — Unlock picture PIN
  - `HLP-06` `GET /api/v1/internal/support/chats` — Agent inbox
  - `SCH-10` `POST /api/v1/internal/schools` — Create school tenant (sales-led)
  - `SCH-11` `GET /api/v1/internal/schools` — List schools, DPA state
- **Tables touched (via those endpoints):** `account`, `audit_log`, `invoice`, `password_reset`, `refund`, `school`, `school_dpa_status`, `student_credential`, `student_profile`, `subscription`, `support_chat_session`, `support_note`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## P-04 — Audit Log

- **Route:** `/staff/audit`  
- **Roles:** Compliance lead  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-124 (See an append-only log of every privileged action — so that we can evi…)
- **Design notes (inventory):** Append-only log of every privileged action; 7-year retention.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Filter, export, verify hash chain
  - AC: read-only
- **Endpoints wired:**
  - `AUD-01` `GET /api/v1/internal/audit-log` — Search/filter
  - `AUD-02` `GET /api/v1/internal/audit-log/export` — CSV export (itself audited)
  - `AUD-03` `GET /api/v1/internal/audit-log/verify-chain` — Verify hash chain integrity
  - `PLT-04` `POST /api/v1/internal/staff` — Create staff account/roles (MFA required, vetting record checked)
  - `PLT-05` `GET /api/v1/internal/vetting` — Staff DBS status (uCheck)
- **Tables touched (via those endpoints):** `account`, `account_role`, `audit_log`, `staff_vetting_record`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
