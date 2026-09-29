# Epic C — C. Subscription & Billing

## C-01 — Pricing Page

- **Route:** `/pricing`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Phase 2 / **W3**
- **User stories:** US-019 (See a pricing page segmented by age/qualification/tier with a monthly/…)
- **Design notes (inventory):** Segmented by age/qualification/tier, monthly/yearly toggle.
- **Behaviour, states & acceptance criteria:**
  - Plan cards, monthly/annual toggle, GBP incl./excl. VAT per config, promo field
  - AC: prices from pricing_price only
- **Endpoints wired:**
  - `CAT-07` `GET /api/v1/catalog/pricing` — Price matrix by tab × year group × qualification × cycle (rules engine over data)
  - `CAT-08` `GET /api/v1/catalog/plans/compare` — What is included per plan
  - `BIL-13` `POST /api/v1/billing/promo/validate` — Validate promo code
- **Tables touched (via those endpoints):** `pricing_plan`, `pricing_price`, `promo_code`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-02 — Plan Subject Selector

- **Route:** `/parent/plan/subjects`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-020 (Select subjects within my plan, including Combined Science as an alter…)
- **Design notes (inventory):** Includes Combined Science as alt to 3 separate sciences.
- **Behaviour, states & acceptance criteria:**
  - Choose children x subjects, live price preview
  - AC: total computed server-side
- **Endpoints wired:**
  - `CAT-07` `GET /api/v1/catalog/pricing` — Price matrix by tab × year group × qualification × cycle (rules engine over data)
  - `STU-06` `GET /api/v1/students/{studentId}/enrolments` — List enrolments (board/subject/goal/target grade)
  - `BIL-18` `POST /api/v1/billing/checkout/plan-preview` — Compute price, sibling discount and VAT before payment
- **Tables touched (via those endpoints):** `pricing_plan`, `pricing_price`, `student_enrolment`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-03 — Free Trial Sign-Up / Card Capture

- **Route:** `/parent/checkout`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-021 (Try the platform on a free trial before committing to a paid plan.…), US-022 (Have a sibling/multi-child discount applied automatically.…)
- **Design notes (inventory):** Stripe.
- **Behaviour, states & acceptance criteria:**
  - Stripe Elements card capture, SCA/3DS, 'trial ends on' date, consent to recurring
  - AC: no card data touches our servers
  - trial requires verified email
- **Endpoints wired:**
  - `BIL-01` `POST /api/v1/billing/setup-intent` — Stripe SetupIntent for trial card capture
  - `BIL-02` `POST /api/v1/billing/subscriptions` — Create subscription with trial (plan, cycle, child × subject items)
  - `BIL-13` `POST /api/v1/billing/promo/validate` — Validate promo code
  - `BIL-18` `POST /api/v1/billing/checkout/plan-preview` — Compute price, sibling discount and VAT before payment
- **Tables touched (via those endpoints):** `billing_customer`, `entitlement`, `pricing_price`, `promo_code`, `subscription`, `subscription_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-04 — Plan Comparison (What's Included)

- **Route:** `/pricing/compare`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Phase 2 / **W3**
- **User stories:** US-025 (See exactly what's included/excluded per tier (e.g. mock tests) before…)
- **Behaviour, states & acceptance criteria:**
  - Feature comparison table
  - AC: driven by entitlement matrix
- **Endpoints wired:**
  - `CAT-08` `GET /api/v1/catalog/plans/compare` — What is included per plan
- **Tables touched (via those endpoints):** `pricing_plan`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-05 — Upgrade / Downgrade / Change Subjects

- **Route:** `/parent/billing/change`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-023 (Upgrade, downgrade or change subjects mid-subscription.…), US-022 (Have a sibling/multi-child discount applied automatically.…)
- **Behaviour, states & acceptance criteria:**
  - Upgrade/downgrade/subjects with proration preview
  - AC: preview matches Stripe invoice preview
- **Endpoints wired:**
  - `BIL-03` `GET /api/v1/billing/subscription` — Current subscription, trial end, next charge
  - `BIL-04` `PATCH /api/v1/billing/subscription` — Change plan/subjects/cycle with proration preview
  - `BIL-18` `POST /api/v1/billing/checkout/plan-preview` — Compute price, sibling discount and VAT before payment
  - `STU-09` `DELETE /api/v1/enrolments/{enrolmentId}` — End an enrolment (keeps history)
- **Tables touched (via those endpoints):** `entitlement`, `pricing_price`, `student_enrolment`, `subscription`, `subscription_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-06 — Micro-Subscription Purchase

- **Route:** `/parent/billing/micro`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-024 (Buy a lower-commitment single-subject/single-board micro-subscription.…)
- **Design notes (inventory):** Single subject/board.
- **Behaviour, states & acceptance criteria:**
  - One-off exam-window micro-subscription
  - AC: expires by date
- **Endpoints wired:**
  - `BIL-14` `POST /api/v1/billing/micro-subscriptions` — Single-subject plan (Phase 3)
  - `BIL-01` `POST /api/v1/billing/setup-intent` — Stripe SetupIntent for trial card capture
- **Tables touched (via those endpoints):** `billing_customer`, `subscription`, `subscription_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-07 — Referral Page

- **Route:** `/parent/referral`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-026 (Refer a friend and receive a reward.…)
- **Design notes (inventory):** Sibling discount (US-022) is an automatic banner on this or the billing summary, not a separate screen.
- **Behaviour, states & acceptance criteria:**
  - Referral code, invite by email, reward status
  - AC: reward only after referee's first paid invoice
- **Endpoints wired:**
  - `BIL-15` `GET /api/v1/billing/referral` — Referral code + status
  - `BIL-16` `POST /api/v1/billing/referral/invite` — Invite friend by email
- **Tables touched (via those endpoints):** `referral`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-08 — Manage Subscription & Cancel

- **Route:** `/parent/billing`  
- **Roles:** Parent  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-106 (Get a reminder before my free trial ends and cancel in two clicks — so…)
- **Design notes (inventory):** DMCC Act 2024: trial-end reminder and two-click cancel; no retention dark patterns.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Current plan, next charge, cancel flow with preview + reason, reactivate
  - AC: cancel effective end of period
  - no dark patterns
- **Endpoints wired:**
  - `BIL-03` `GET /api/v1/billing/subscription` — Current subscription, trial end, next charge
  - `BIL-05` `POST /api/v1/billing/subscription/cancel-preview` — Step 1 of two-click cancel: what ends when
  - `BIL-06` `POST /api/v1/billing/subscription/cancel` — Step 2: cancel at period end (no dark patterns)
  - `BIL-07` `POST /api/v1/billing/subscription/reactivate` — Undo cancel before period end
  - `BIL-10` `POST /api/v1/billing/payment-method/setup` — New SetupIntent to update card
  - `BIL-11` `POST /api/v1/billing/payment-method/confirm` — Attach new card and retry the open invoice
- **Tables touched (via those endpoints):** `audit_log`, `billing_customer`, `payment_attempt`, `subscription`, `subscription_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-09 — Payment Failed / Dunning

- **Route:** `/parent/billing/payment-failed`  
- **Roles:** Parent  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-107 (Be told when a payment fails and update my card while my child keeps a…)
- **Design notes (inventory):** Stripe dunning. Child keeps access during the grace period; parent updates the card in place.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Dunning banner + update-card flow, grace period countdown
  - AC: grace 14 days (billing.dunning_grace_days)
  - access retained during grace
- **Endpoints wired:**
  - `BIL-12` `GET /api/v1/billing/dunning` — Dunning state + grace end (child keeps access)
  - `BIL-10` `POST /api/v1/billing/payment-method/setup` — New SetupIntent to update card
  - `BIL-11` `POST /api/v1/billing/payment-method/confirm` — Attach new card and retry the open invoice
- **Tables touched (via those endpoints):** `billing_customer`, `payment_attempt`, `subscription`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## C-10 — Billing History & Family Billing

- **Route:** `/parent/billing/history`  
- **Roles:** Parent with more than one child  
- **Platform:** Web  
- **Priority / Phase / Build wave:** Should / Pilot / **W2**
- **User stories:** US-108 (See one bill for all children and download invoices — so that I can ma…), US-022 (Have a sibling/multi-child discount applied automatically.…)
- **Design notes (inventory):** One bill across children; invoice PDFs; sibling discount shown as a line item.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Per-child breakdown, invoice list + PDF
  - AC: PDF via signed URL
- **Endpoints wired:**
  - `BIL-08` `GET /api/v1/billing/invoices` — Invoices list (one bill across children)
  - `BIL-09` `GET /api/v1/billing/invoices/{invoiceId}/pdf` — Invoice PDF (pre-signed URL)
  - `BIL-03` `GET /api/v1/billing/subscription` — Current subscription, trial end, next charge
- **Tables touched (via those endpoints):** `invoice`, `subscription`, `subscription_item`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
