# W2 Plan — Pilot completion

**Wave:** W2 · Pilot completion  
**Gate:** End-to-end pilot for consumers + one pilot school; safeguarding drill; boundary attestation harness (14-day clean evidence path); pen-test scheduled/documented.  
**Sign-off:** W1 gate approved by architect (29 Sep 2026). Do not start W3 until W2 gate report is signed off.

**Read for this wave:** docs 04 (PF-05,06,09,10,11,12), 11, 13, 16; screens C,G,H,J,L,O,P; `ai_prompts/tutor`, `voice`, `safety`, `reporting`.

## Scope checklist (28 screens from docs/18)

| Epic | Screens | Priority |
|---|---|---|
| E1 Billing & entitlements | C-02, C-03, C-08, C-09, C-10 | Must (C-10 Should) |
| E2 Parent progress & controls | H-01, H-09, H-10 (API) | Must |
| E3 Engagement overlays | G-02, G-03, G-04 | G-03 Must; G-02/04 Should |
| E4 Tutor + voice + safety | J-01, J-06; L-01, L-03, L-04, L-05; Q-05 | Must |
| E5 Schools B2B | O-01…O-07 | Must |
| E6 Support & ops | P-03, P-04, Q-04 | Must (Q-04 Should) |

**Note:** Cursor prompt mentions L-02 deletion/export; docs/18 places L-02 in **W3**. Per pack screen table, L-02 stays W3. Shell-10 already W1_BUILT.

**Acceptable process deferrals (document, do not invent legal):** live pen-test pass may be “scheduled + scope pack”; 14-day boundary attestation via daily job + report export (cannot wait 14 calendar days in-session — ship harness + seed clean window evidence).

## Implementation order (vertical slices)

| # | Slice | Size | Delivers | Gate? |
|---|---|---|---|---|
| S1 | Entitlements + Stripe billing C-02/03/08/09/10 | L | Trial, checkout, manage, dunning, invoices | Yes |
| S2 | Parent H-01/H-09 + H-10 API aggregates | M | Progress, AI controls, transcripts | Yes |
| S3 | Weekly report job + notifications basics | M | PF reporting path | Yes |
| S4 | Engagement G-02/03/04 overlays + ENG APIs | M | Confidence / nudge / frustration | Yes |
| S5 | Tutor text backend TUT-* + safety P-SF-* | L | Scripted fail-closed safety | Yes |
| S6 | Voice J-01/J-06 + consent; gateway STT/TTS path | L | Voice with separate consent | Yes |
| S7 | Privacy L-01/L-03/L-05; DSL L-04; Q-05 | L | Consent, privacy, safeguarding | Yes |
| S8 | Schools O-01…O-05 classes, assignments, insights | L | Teacher/admin pilot | Yes |
| S9 | Schools O-06/O-07 CSV roster, SSO stub, DPA, invoices | L | Onboarding + billing | Yes |
| S10 | Support P-03, audit P-04, uCheck stub, Q-04 cost | M | Ops consoles | Yes |
| S11 | Gate evidence: consumer E2E + school E2E + safeguarding drill script + boundary attestation job | M | Gate report | Yes |

## Task breakdown

### S1 — Billing
- [x] T1.1 Stripe customers/subscriptions (test mode); webhook handler; money as pence (B decisions)
- [x] T1.2 Entitlement grants from subscription state (replace W1 stub)
- [x] T1.3 C-02 plan subject selector; C-03 checkout + trial
- [x] T1.4 C-08 manage/cancel; C-09 dunning; C-10 history/invoices
- [x] T1.5 Role-map + tests; no card PAN/CVV stored

### S2 — Parent dashboards
- [x] T2.1 H-01 progress dashboard APIs + UI
- [x] T2.2 H-09 controls & AI transcript access (privacy defaults)
- [x] T2.3 H-10 mobile parent home API (reuse aggregates; web-compatible payload)

### S3 — Reports & notifications
- [x] T3.1 Weekly report generation job (code stats + AI rationale via gateway, no PII)
- [x] T3.2 Notification prefs already partial — extend send path for billing/safeguarding events

### S4 — Engagement
- [x] T4.1 ENG confidence / nudge / frustration endpoints
- [x] T4.2 Overlay components on practice (G-02/03/04)

### S5 — Tutor + safety
- [x] T5.1 Tutor session APIs (TUT-*); prompts via gateway only
- [x] T5.2 Safety layers P-SF-*; fail closed; scripted templates from `ai_prompts/safety`
- [x] T5.3 No learner PII in tutor prompts (D-15)

### S6 — Voice
- [x] T6.1 Voice consent J-06; session J-01
- [x] T6.2 STT/TTS only via gateway/vendor path with consent gate
- [x] T6.3 Error/degraded states

### S7 — Privacy & safeguarding
- [x] T7.1 L-01 under-13 consent polish; L-03 privacy settings; L-05 age-check
- [x] T7.2 L-04 DSL console; Q-05 safety flags queue
- [x] T7.3 Safeguarding drill script + SLA timers (config; do not invent legal copy)

### S8 — School teaching
- [x] T8.1 O-01 classes; O-02 admin dashboard; O-03 KCSIE
- [x] T8.2 O-04 assignments; O-05 insights heatmap
- [x] T8.3 RLS isolation tests for school tenants

### S9 — School onboarding & billing
- [x] T9.1 O-06 CSV roster; SSO FEATURE_DISABLED or stub callback; Wonde remains flag-off
- [x] T9.2 O-07 DPA + per-pupil invoice billing

### S10 — Support & AI cost
- [x] T10.1 P-03 support console; P-04 audit viewer
- [x] T10.2 Staff vetting uCheck integration stub
- [x] T10.3 Q-04 AI cost & usage

### S11 — Gate evidence
- [x] T11.1 Consumer pilot demo script (signup→trial→practise→parent dash→tutor/voice consent)
- [x] T11.2 School pilot demo (CSV roster→class→assignment→insights→DPA)
- [x] T11.3 Safeguarding drill + boundary attestation job/report
- [x] T11.4 Traceability `w2_status=W2_BUILT` for 28 screens; `docs/waves/W2_gate_report.md`

## Standing rules reminder
- AI only via `ai-gateway`; gateway DB role cannot read learner tables
- Numbers/money/entitlements in **code**; Stripe amounts in pence
- Forward-only migrations (V015+)
- Safety fails closed; safeguarding texts scripted
- `wonde_mis` / K-01 / `a_level_review` remain flag-off
- Wired endpoints match `api/endpoints.json`

## Deviations / assumptions (living)
- Stripe **test mode** keys from env only (never commit secrets)
- Pen test: schedule pack + checklist in gate report (external firm TBD)
- 14-day boundary attestation: automated daily job + export; demo with seeded clean window
- L-02 deletion remains W3 per docs/18 screen table
- Pricing placeholders until client sets final amounts (Q3 from understanding doc)
