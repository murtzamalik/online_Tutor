# 20 · Open Items, Assumptions & Questions

## A. Open items from the tracker (block or affect build)
| ID | Item | Impact on build | Owner | Handling until resolved |
|---|---|---|---|---|
| P-1 | Marking-review staffing (A-Level only): who, how many, cost | A-Level go-live (F-05/F-09) | Arshad | Flag `a_level_review` OFF; workbench built in W3 |
| P-2 | Owner & budget for examiner-marked **gold set** (≥ 2,000 answers) | Cannot *prove* the ≥ 95% claim (D-19) | Arshad | Build eval harness with synthetic/seed gold; label accuracy "unvalidated" until real gold exists |
| P-3 (legal) | Exam-board licensing for AI-assisted use of past papers | Whether papers can be displayed / used for grounding | Arshad + Legal | Ingest as UNKNOWN; grounding only; no verbatim display unless teaching-use terms allow |
| P-8 | Product name ("Study Loop" placeholder) | Branding strings, domains | Arshad | All brand strings from config/CMS; package names neutral (`studyloop` internal codename) |
| P-9 | UK-only hosting for schools (Hetzner is EU) | Pilot-school contracts | Arshad / schools | Region-portable Docker; decision needed before school go-live |
| P-10 | Final design reference (HTML prototype/PDF vs Figma rebuild) | UI fidelity | Murtaza + Arshad | Implement from tokens; prototype as visual truth |
| — | Sign-off on Requirements Baseline v1.0 | Scope freeze | Arshad | Build proceeds on v1.0 LOCKED |
| — | OSA 2023 children's access assessment; ICO AADC review; KCSIE alignment; safeguarding lead & escalation path; DPA template; T&C/Privacy/Cookie/Safeguarding policies | Compliance go-live gates | Legal / Compliance | Scripted templates & policies are placeholders (⟦…⟧) |
| — | Safer recruitment (Enhanced DBS + Barred List) for reviewers/DSL/support | Staff access | Arshad/HR | uCheck integration in W2; access blocked until vetted |
| — | Marketing site CMS platform | A-* content editing | Arshad | Built-in CMS endpoints (CMS-*) + admin UI in E-02/M-* |
| — | Outcome-metric collection plan | A-06 claims | Product | Stats only from `outcome_stat` with source/date |
| — | Pilot budget & timeline; final sign-off authority | Planning | Arshad | Wave timings indicative |

## B. Assumptions made in this pack (challenge these)
1. **Pricing placeholders** in V010 (£39.99/£59.99/£69.99 monthly; annual discounted) — replace with client's. VAT treatment (incl./excl., Stripe Tax) undecided.
2. **Trial** 7 days (`billing.trial_days`), dunning grace 14 days, deletion cooling-off 14 days, chat retention 90 days — confirm in DPIA/commercial terms.
3. **Model IDs** (`claude-sonnet-5-5`, `claude-haiku-4-5-20251001`, `claude-opus-5-5`, Google `chirp_2`, `en-GB-Chirp3-HD`) are config defaults; verify availability/pricing at build time.
4. **Spec codes/durations** in V009 and paper codes in the manifest are from the scaffold and general knowledge; **verify against official specs** (e.g. Edexcel 1CH0 duration discrepancy; OCR/Eduqas/WJEC component codes flagged VERIFY).
5. **Safeguarding SLAs** (15 min / 4 h / 24 h) and helpline texts are proposals for the client's DSL to approve.
6. **Age rules:** parent-mediated <13; 13–15 standalone requires parent email notification (configurable); OSA age-assurance provider swappable (D-09) — thresholds per legal advice.
7. **Sampling review of auto-approved questions** (5% for 4 weeks) is an added recommendation, not a client requirement.
8. **Sibling discount** rule (≥ 2 children) is assumed — client to define percentage.
9. **Unlimited practice** (US-027) is subject to fair-use and AI budget caps; bank-first keeps marginal cost low.
10. **Voice retention:** audio not stored; transcripts 30 d (D-20).
11. **Native app store payments (M-1):** Apple/Google IAP policy may force IAP for mobile subscriptions — decide before mobile phase.
12. **Data residency for AI vendors:** Anthropic/Google regions per enterprise DPA (D-01, D-05) — confirm UK/EU processing terms with procurement.

## C. Questions Cursor may raise (answers pre-decided where possible)
- *Which board-track first?* AQA 8462 (best-documented), then Cambridge 0620, Edexcel 1CH0, 4CH1, OCR, Eduqas, WJEC — but all seven are in the pilot data model from W1.
- *Other subjects?* Data-driven catalogue only; no code changes to add subjects (content/scaffolds are not started for Maths/English/Physics/Biology/11+/A-Level).
- *Mock users/data?* Synthetic seed script in `testkit`; never real children's data.
- *Real Stripe/Anthropic keys in dev?* No — Stripe test mode, gateway stub with recorded fixtures; live keys only in staging/prod secrets.
