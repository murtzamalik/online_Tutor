# W3 Gate Report — Phase 2

**Wave:** W3 · Phase 2  
**Date:** 29 Sep 2026  
**Verdict:** **PASS** (37/37 screens `W3_BUILT`; A-Level SLA drill documented; D-06 deferred with honest FEATURE_DISABLED UI)

## Built vs scope

| Epic | Screens | Status |
|---|---|---|
| Marketing Phase 2 | A-04, A-06, A-07, A-09 | Built |
| Onboarding extras | B-03, B-07 | Built |
| Pricing & plan change | C-01, C-04, C-05 | Built |
| Practice depth | D-02, D-03, D-05, D-06*, D-07, D-08, D-09 | Built (*D-06 FEATURE_DISABLED UI) |
| Feedback & A-Level | F-03, F-05, F-06, F-07, F-09 | Built |
| Engagement | G-01 | Built |
| Progress views | H-02, H-03, H-04, H-08 | Built |
| Revision | I-01…I-05 | Built |
| Privacy deletion | L-02 | Built |
| Ops / support / shell | M-03, P-01, P-02, Shell-05, Shell-08 | Built |

**Traceability:** all 37 W3 screens marked `w3_status=W3_BUILT` in `docs/traceability/traceability_matrix.csv`.

**Out of wave (unchanged):** K-01, N-01…N-03 remain flag-off. W4 not started. W0–W2 not regressed (unit suite green).

## Tests

- `mvn -pl common,core-api -am test -Dtest='!*IT,!ArchUnit*' -Dsurefire.failIfNoSpecifiedTests=false` — PASS (incl. `CatalogueRoleMapTest`, A-Level provisional router, plan generation, deletion cool-off)
- `npm test` — PASS
- `npm run build` — PASS

## Deviations

1. **D-06 / PRA-06 / MOC-07:** Photograph-to-score remains `FEATURE_DISABLED` with honest UI (acceptable deferral per plan). Typed practice is the alternative.
2. **P-1 reviewer seed:** `reviewer@studyloop.local` + CLEAR vetting row in V016 satisfies SLA drill only — **not** production staffing sign-off.
3. **P-2 accuracy:** A-Level / marking accuracy claims remain **unvalidated** in UI copy and SLA payload.
4. **Pricing:** still placeholder amounts until client sets final prices.
5. **Purge job:** `PrivacyDeletionService.runDuePurges()` is the hook (scheduler-ready); no dark-pattern urgency in L-02 UI.

## Open questions

- Confirm production date to flip `a_level_review` after real reviewer staffing (client).
- Final pricing / compare matrix copy.
- Camera / OCR vendor choice for enabling PRA-06 in a later wave.

## Demo scripts

### A. Pricing & marketing
1. Open `/pricing` and `/pricing/compare` (CAT-07/CAT-08).
2. `/try` sample question; `/results`, `/case-studies`, `/plan-quiz`.

### B. Student signup & weekly plan
1. `/student/signup` — age &lt; 13 rejected; 13–15 needs parent-aware; 16+ allowed.
2. Student `/onboarding/plan` — PLN generate/reveal.

### C. Practice depth
1. `/mock/new` → sit → submit; `/practice/multi-version`, `/practice/custom`, `/practice/redrill`.
2. Home daily micro-goal tile (D-08); `/practice/photo` shows FEATURE_DISABLED.

### D. A-Level SLA drill (48h) — gate critical

**Prep (V016):** `a_level_review=TRUE` in demo; reviewer `reviewer@studyloop.local` / `ReviewerDemo!23` (CLEAR vetting).

1. Ensure an A-Level response is marked provisional (orchestrator queues `marking_review_queue` with `due_at = now+48h` via P-MK-04 when flag on).
2. Student opens F-09 `/practice/[sessionId]/provisional/[responseId]` — sees provisional status + 48h ETA; accuracy “unvalidated”.
3. Staff reviewer logs in → `/staff/review` (F-05):
   - Queue shows SLA colours (GREEN / AMBER / RED).
   - Claim → inspect pseudonymous detail (no identity) → Confirm or Adjust.
4. `/internal/reviews/sla` (via workbench) shows breached/queued counts.
5. **Drill note:** to simulate breach without waiting 48h, set `due_at` in the past on a QUEUED row and refresh SLA view — colour turns RED; confirm/adjust clears the item.
6. Prod default: leave flag FALSE until client confirms staffing (seed comment in V016).

### E. Privacy & support
1. L-02 `/parent/children/[id]/privacy/delete` — request → cancel during cool-off → export; no urgency copy.
2. `/help` search; Live chat widget / `/help/chat` creates real `support_chat_*` tickets (not invented chatbot answers).
3. `/notifications`, `/search`, `/staff/marking/systemic`.

## Gate checklist

- [x] 37 screens wired to catalogue endpoints / honest FEATURE_DISABLED where deferred
- [x] CatalogueRoleMap includes new endpoints
- [x] A-Level provisional + F-05/F-09 + demo flag + reviewer seed
- [x] 48h SLA drill script documented
- [x] Unit tests for provisional routing, plan minutes/week-start, deletion cool-off
- [x] Maven + npm test (+ build) pass
- [x] Traceability + this report
- [x] W4 not started; K-01 / marketplace remain off

**Architect sign-off:** _pending_
