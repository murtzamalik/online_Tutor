# W4 Gate Report — Phase 3 & flag-offs

**Wave:** W4 · Phase 3 & flag-offs  
**Date:** 29 Sep 2026  
**Verdict:** **PASS** (16/16 screens `W4_BUILT`; K-01 / N-01…N-03 remain flag-off; native mobile = docs/19 separate)

## Built vs scope

| Epic | Screens | Status |
|---|---|---|
| Library & marketing | A-10 | Built |
| Accessibility | B-09, J-03, J-04, J-05 | Built |
| Billing extras | C-06, C-07 | Built (pence; FakePaymentProvider / SetupIntent) |
| Practice / entrance | D-04, D-10 | Built |
| Tutor photo stuck | F-08 | Built (masked upload + gateway/stub walkthrough) |
| Progress & alerts | H-05, H-06, H-07 | Built (H-07 honest empty until n≥50 + opt-in) |
| Share revision | I-06 | Built |
| Voice discussion | J-02 | Built (consent-gated DISCUSSION mode) |
| Goal opt-in | K-02 | Built (nudges only; default off) |

**Traceability:** 16 W4 screens marked `w4_status=W4_BUILT` in `docs/traceability/traceability_matrix.csv`.

**Explicitly not built:** K-01 Badges & Streaks; N-01…N-03 Marketplace (no UI). Prior waves not regressed.

**Mobile:** out of wave — `docs/19_mobile_phase_spec.md`.

## Tests

- Unit: entrance lock rules, keep-going consistency, cohort benchmark gate, referral codes
- `CatalogueRoleMapTest` covers new `@CatalogueRoles` (ENT-*, BIL-14…16, STU-11, MAS-05/08, TUT-06, RVN-09…11)
- `mvn -pl common,core-api -am test -Dtest='!*IT,!ArchUnit*' -Dsurefire.failIfNoSpecifiedTests=false`
- `npm test`

## Deviations

1. **F-08 vision:** masked photo + `P-TU-06` via GatewayClient; if gateway unavailable, honest stub walkthrough text (no full answer).
2. **H-07:** UI always reachable; shows honest empty when not opted in or sample &lt; 50.
3. **Micro-sub / referral amounts:** from `app_config` placeholders (pence).
4. **D-06 camera scoring:** remains FEATURE_DISABLED (W3); F-08 is a separate stuck-question path.

## Demo scripts

### A. Library & accessibility
1. `/library` — MKT-03 free resources; gated items link to A-05.
2. `/onboarding/accessibility` and `/settings/accessibility` — STU-10/11; CSS tokens apply live.
3. Create mock → sit `/mock/[id]/sit` — duration reflects `extendedTimePct` from accessibility (J-04).
4. `/practice/keep-going` — toggle simplified language (J-05); marks unchanged.

### B. Billing extras
1. Parent `/parent/billing/micro` — BIL-01 + BIL-14; amount_pence from config; FakePayment when Stripe key blank.
2. `/parent/referral` — BIL-15/16; copy explains reward only after first paid invoice.

### C. Entrance & keep-going
1. `/entrance/new?enrolmentId=…` — ENT-01…04; no skip/back; completes at quota.
2. `/practice/keep-going` — TARGET_GRADE until consistency window or fatigue stop.

### D. Tutor photo, share, voice discussion
1. `/tutor/photo` — mask report required; walkthrough steps; `fullAnswerRevealed=false`.
2. `/revise/share` — create/revoke share code.
3. `/voice/discussion` — requires voice consent + parent toggle; mode DISCUSSION.

### E. Progress & K-02
1. Parent `/parent/children/[id]/alerts` — RPT-05/06.
2. Student `/student/map`, `/student/benchmark` (empty until opt-in + n≥50).
3. Parent `/parent/children/[id]/controls#goals` — daily_goal_nudge opt-in (default off); no K-01 UI.

## Gate checklist

- [x] 16 screens wired to catalogue endpoints / honest empty where gated
- [x] CatalogueRoleMap / `@CatalogueRoles` for new endpoints
- [x] K-01 / marketplace remain off
- [x] Unit tests for entrance lock, keep-going, benchmark gate, referral code
- [x] Maven + npm test pass
- [x] Traceability + this report + CURSOR_UNDERSTANDING living notes
- [x] Mobile phase remains docs/19 (not built)

**Architect sign-off:** _pending_
