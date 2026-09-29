# 13 · Billing & Schools (B2B)

## Consumer (D-22)
- **Stripe** Products/Prices mirror `pricing_plan`/`pricing_price` (placeholder prices in V010: £39.99 / £59.99 / £69.99 monthly; yearly discounted — **confirm with client, OI**). Prices are always read from DB/Stripe, never hard-coded in UI.
- Flow: SetupIntent (`BIL-01`) → subscription with trial (`billing.trial_days` = 7, confirm) (`BIL-02`) → webhooks (`BIL-17`) update `subscription`/`entitlement`. SCA/3DS handled by Stripe Elements. VAT: Stripe Tax or per-config; display incl./excl. per config (**open item**).
- **Sibling discount (US-022):** automatic coupon when ≥2 children on plan; preview in `BIL-18`.
- **Trial-end reminder** T-3 days (DMCC/consumer law) via Postmark; clear cancel path (no dark patterns).
- **Change plan** with proration preview (`BIL-04`, `BIL-18`); **cancel** at period end with reason capture (`BIL-05/06`); **reactivate** (`BIL-07`).
- **Dunning (C-09):** Stripe smart retries + our email sequence; grace 14 days (`billing.dunning_grace_days`) with access retained; after grace → entitlement `SUSPENDED`.
- **Refunds/credits:** support console (P-03) with limit and second-approver threshold; audited.
- **Entitlements:** derived only from webhook state; checked server-side per feature.
- Micro-subscriptions (C-06) and referrals (C-07): flag-off until Phase 3.

## Schools (D-23)
- **Model:** per-pupil price at the same tier (D-22), **invoice billing** via Stripe Invoicing/PO; DPA before data (`school_dpa_status`); `sub_processor` list exposed to schools (`CON-07`).
- **Onboarding:** see PF-10. Roster: CSV template (upn/mis id, name, year, class) with dry-run diff; Wonde adapter behind `wonde_mis`; SSO Google/Microsoft OIDC per school (`sso_connection`).
- **Pupil identity:** school-created pupil accounts (no parent needed), pupil login cards (printable), SSO where available; pupil data visible to teachers only within their classes (RLS + privacy flags).
- **Teacher features:** class management, assignments (topics/questions, due dates, targets; auto-marking; overdue alerts), insights (mastery heatmap, misconceptions, engagement, drill-down; P-RP-05 summary; CSV export).
- **School admin:** school dashboard (aggregate only), KCSIE confirmation, safeguarding contacts, staff invites.
- **School business manager:** DPA e-sign, PO upload, invoices.
- **Safeguarding for schools:** pupil flags route to the school DSL contact by policy; Karsaaz DSL retains oversight.
- **Hosting note:** schools may require UK-only hosting (P-9) — architecture is region-portable (Docker); decision pending.
