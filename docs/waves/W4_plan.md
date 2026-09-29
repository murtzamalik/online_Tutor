# W4 Plan — Phase 3 & flag-offs

**Wave:** W4 · Phase 3 & flag-offs  
**Gate:** Per-feature acceptance for all 16 W4 screens.  
**Sign-off:** W3 gate approved by architect (29 Sep 2026). After W4 gate PASS, build-pack waves are complete (mobile = separate phase per docs/19).

**Read for this wave:** docs/screens (W4 rows), `docs/19_mobile_phase_spec.md` (API stays mobile-ready; do not build native apps).

## Scope checklist (16 screens from docs/18)

| Epic | Screens | Priority |
|---|---|---|
| E1 Library & marketing | A-10 | Could |
| E2 Accessibility | B-09, J-03, J-04, J-05 | Should / Could |
| E3 Billing extras | C-06, C-07 | Could |
| E4 Practice / entrance | D-04, D-10 | Could / Should |
| E5 Tutor photo stuck | F-08 | Could |
| E6 Progress & alerts | H-05, H-06, H-07 | Should / Could |
| E7 Share revision | I-06 | Could |
| E8 Voice discussion | J-02 | Could |
| E9 Goal opt-in | K-02 | Should |

## Explicitly NOT built (flag-off / Won't)

| ID | Status |
|---|---|
| K-01 Badges & Streaks | Flag-off — do not implement UI or pressure loops |
| N-01…N-03 Marketplace | Won't yet — endpoints may return FEATURE_DISABLED only if already in catalogue; no screens |

## Implementation order (vertical slices)

| # | Slice | Size | Delivers | Gate? |
|---|---|---|---|---|
| S1 | A-10 free resource library | S | MKT resources browse | Yes |
| S2 | Accessibility B-09 + J-03/04/05 | M | Prefs, extra time, simplified language | Yes |
| S3 | C-06 micro-sub + C-07 referral | M | Billing extras (pence; no PAN) | Yes |
| S4 | D-04 11+ entrance test (adaptive, no skip/back) | L | ENT-* APIs + UI | Yes |
| S5 | D-10 target-grade keep-going drill | M | Adaptive until consistent | Yes |
| S6 | F-08 photo-of-stuck walkthrough | M | Consent + masked photo tutor path | Yes |
| S7 | H-05 drift alerts; H-06 knowledge map; H-07 cohort benchmark (n≥50 gate) | M | Parent/student insight | Yes |
| S8 | I-06 share deck/quiz | S | Share links + ACL | Yes |
| S9 | J-02 verbal discussion mode | M | Voice discussion (consent-gated) | Yes |
| S10 | K-02 daily goal nudge opt-in (parent controls) | S | No gamification pressure | Yes |
| S11 | Traceability + W4_gate_report + living understanding update | S | Gate | Yes |

## Task breakdown

### S1 — Library
- [ ] T1.1 A-10 `/library` wired to marketing resources API

### S2 — Accessibility
- [ ] T2.1 B-09 onboarding accessibility prefs (STU-10/11)
- [ ] T2.2 J-03 settings panel; J-05 simplified-language toggle
- [ ] T2.3 J-04 extended-time on mock sit (reads accessibility_json)

### S3 — Micro billing & referral
- [ ] T3.1 C-06 micro-subscription purchase (Stripe/fake provider)
- [ ] T3.2 C-07 referral codes + rewards config (no dark patterns)

### S4 — Entrance test
- [ ] T4.1 ENT-01…04 adaptive 11+; no skip/back; lock-down rules
- [ ] T4.2 D-04 UI

### S5 — Keep-going drill
- [ ] T5.1 D-10 session mode until consistency threshold (code)

### S6 — Photo stuck
- [ ] T6.1 F-08 walkthrough; reuse PRA-06 masking rules; FEATURE_DISABLED only if camera still blocked — prefer implement stub upload + tutor response via gateway

### S7 — Alerts & maps
- [ ] T7.1 H-05 early-warning drift alerts
- [ ] T7.2 H-06 skill map from mastery_state
- [ ] T7.3 H-07 cohort benchmark only if n≥50 / opted in (else empty/honest state)

### S8 — Share
- [ ] T8.1 I-06 share deck/quiz set with expiry + revoke

### S9 — Verbal discussion
- [ ] T9.1 J-02 discussion mode (English Lang/Lit scoped); voice consent required

### S10 — K-02
- [ ] T10.1 Parent toggle for daily goal **nudges** only (goals tile already exists); no K-01 streaks

### S11 — Gate
- [ ] T11.1 `w4_status=W4_BUILT` for 16 screens; confirm K-01/N-* still deferred
- [ ] T11.2 `docs/waves/W4_gate_report.md`
- [ ] T11.3 Update `docs/CURSOR_UNDERSTANDING.md` living notes for W4 complete
- [ ] T11.4 Note mobile phase remains docs/19 (out of this wave)

## Standing rules reminder
- AI only via gateway; D-15
- Numbers in code; money in pence
- Forward-only migrations (V017+)
- No gamification pressure; K-01 stays off
- Children's privacy-by-default; AA; no dark patterns
- API mobile-ready; no native app build in W4

## Deviations / assumptions (living)
- Cohort benchmark honest empty state until sample size ≥ 50
- Micro-sub / referral amounts from config placeholders
- F-08 may use masked upload + stub vision path if vendor STT/vision already gated
- Native mobile deferred to docs/19 after W4 gate
