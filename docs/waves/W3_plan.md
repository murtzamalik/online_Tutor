# W3 Plan — Phase 2

**Wave:** W3 · Phase 2  
**Gate:** Per-feature acceptance from screen specs; A-Level review SLA drill.  
**Sign-off:** W2 gate approved by architect (29 Sep 2026). Do not start W4 until W3 gate report is signed off.

**Read for this wave:** docs/screens (W3 rows), `ai_prompts/revision_content`, docs/09 (A-Level), docs/10; PF flows as referenced by screens.

## Scope checklist (37 screens from docs/18)

| Epic | Screens | Priority |
|---|---|---|
| E1 Marketing Phase 2 | A-04, A-06, A-07, A-09 | Should/Could |
| E2 Onboarding extras | B-03, B-07 | Should |
| E3 Pricing & plan change | C-01, C-04, C-05 | Must / Should |
| E4 Practice depth | D-02, D-03, D-05, D-06, D-07, D-08, D-09 | Should/Could |
| E5 Feedback & A-Level | F-03, F-05, F-06, F-07, F-09 | Must (F-05/09); others Should/Could |
| E6 Engagement | G-01 | Should |
| E7 Progress views | H-02, H-03, H-04, H-08 | Should/Could |
| E8 Revision | I-01…I-05 | Should/Could |
| E9 Privacy deletion | L-02 | Must |
| E10 Ops / support / shell | M-03, P-01, P-02, Shell-05, Shell-08 | Should/Could |

**A-Level (P-1):** Build F-05/F-09 fully; seed a vetted reviewer account; flip `a_level_review` **on in local/demo** for SLA drill (document; leave prod default off until client confirms staffing). Do not invent reviewer staffing dates.

**Out of wave:** K-01, N-01…N-03 remain flag-off. W4 screens stay deferred.

## Implementation order (vertical slices)

| # | Slice | Size | Delivers | Gate? |
|---|---|---|---|---|
| S1 | Pricing C-01/C-04 + C-05 change subjects | M | Public pricing + upgrade path | Yes |
| S2 | Marketing A-04/06/07/09 | M | Try sample, outcomes, cases, plan quiz | Yes |
| S3 | B-03 student standalone signup; B-07 weekly plan reveal | M | PLN-* + auth path | Yes |
| S4 | Mocks D-02/D-03 (+ deepen D-11 if needed) | L | Timed mock sitting | Yes |
| S5 | Practice modes D-05/07/08/09; D-06 photo (enable or keep FEATURE_DISABLED with UI) | L | Drill/custom/redrill/goals | Yes |
| S6 | F-03 self-mark; F-06 re-explain; F-07 Socratic | L | Tutor UI depth | Yes |
| S7 | A-Level F-05 workbench + F-09 provisional; SLA drill; flag flip path | L | Gate SLA drill | Yes |
| S8 | G-01 surprise quiz; H-02/03/04/08 | M | Parent insight views | Yes |
| S9 | Revision I-01…I-05 + P-RC prompts via gateway | L | Flashcards/notes/cheatsheet/check | Yes |
| S10 | L-02 deletion/export cool-off | M | Privacy Must | Yes |
| S11 | M-03, P-01/02, Shell-05/08 | M | Support + shell | Yes |
| S12 | Traceability + W3_gate_report + demo (incl. A-Level SLA) | S | Gate | Yes |

## Task breakdown

### S1 — Pricing
- [x] T1.1 C-01 `/pricing` from CAT-07 / pricing tables
- [x] T1.2 C-04 compare matrix
- [x] T1.3 C-05 upgrade/downgrade/change subjects (BIL change endpoints)

### S2 — Marketing Phase 2
- [x] T2.1 A-04 `/try` sample (MKT-07/08)
- [x] T2.2 A-06 `/results` outcomes; A-07 case studies; A-09 plan quiz

### S3 — Signup & plan
- [x] T3.1 B-03 student standalone register (age gates)
- [x] T3.2 B-07 PLN-01/02/03 weekly plan reveal UI

### S4 — Mocks
- [x] T4.1 D-02 mock setup; D-03 timed sit; results already partial from W1
- [x] T4.2 Exam-authentic layout basics + timer/extended-time hook

### S5 — Practice modes
- [x] T5.1 D-05 multi-version; D-07 custom quiz; D-08 home goal widget; D-09 redrill
- [x] T5.2 D-06 photo path: wire PRA-06 if feasible else explicit FEATURE_DISABLED UI

### S6 — Feedback / tutor UI
- [x] T6.1 F-03 self-mark against scheme
- [x] T6.2 F-06 re-explain; F-07 Socratic session (gateway prompts, no PII)

### S7 — A-Level go-live path
- [x] T7.1 Provisional marking path when `a_level_review` on (P-MK-04 via gateway)
- [x] T7.2 F-05 review workbench; F-09 student provisional status
- [x] T7.3 Seed reviewer; SLA 48h drill script; config to enable flag in demo

### S8 — Engagement & parent insights
- [x] T8.1 G-01 surprise micro-quiz
- [x] T8.2 H-02 misconceptions; H-03 narrative report; H-04 predicted; H-08 print checklist

### S9 — Revision
- [x] T9.1 Decks/notes/cheat sheets/knowledge-check APIs + UIs
- [x] T9.2 Generation/QC via existing RVC/revision prompts where needed

### S10 — Deletion
- [x] T10.1 L-02 request, cool-off, export, purge job hooks (GDPR-style; no dark patterns)

### S11 — Support & shell
- [x] T11.1 M-03 systemic marking flags; P-01 help; P-02 live chat widget (staff queue)
- [x] T11.2 Shell-05 notifications centre; Shell-08 search

### S12 — Gate
- [x] T12.1 `w3_status=W3_BUILT` for 37 screens
- [x] T12.2 `docs/waves/W3_gate_report.md` + A-Level SLA demo script

## Standing rules reminder
- AI only via gateway; D-15 boundary
- Numbers/grades/money in code
- Forward-only migrations (V016+)
- Safety fails closed; K-01 / marketplace remain off
- A-Level flag: demo-on for SLA; prod default remains client-controlled

## Deviations / assumptions (living)
- P-1: local seed reviewer satisfies “vetting” for SLA drill only — not production staffing sign-off
- P-2 gold still unvalidated; A-Level accuracy claims stay “unvalidated”
- D-06 photo remains FEATURE_DISABLED with honest UI (camera pipeline not ready)
- Pricing copy still placeholder until client sets final prices
