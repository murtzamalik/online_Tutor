# 04 · Process Flows (end-to-end)

Each flow lists actors, steps, error paths and the screens/endpoints/prompts involved. IDs refer to `api/API_CATALOGUE.md` and `ai_prompts/PROMPT_INDEX.md`.

## PF-01 Parent sign-up → child → trial
```mermaid
sequenceDiagram
  participant P as Parent
  participant W as Web
  participant A as core-api
  P->>W: B-01 sign-up
  W->>A: AUTH-01 register-parent
  A-->>P: email code (Postmark)
  P->>W: B-10 verify (AUTH-02)
  W->>A: AGE-01..03 age assurance (adult)
  P->>W: B-02 add child (STU-02)
  alt child < 13
    W->>A: CON-02 under-13 consent (L-01)
  end
  P->>W: B-04/B-05 subject+goal (STU-07, STU-14)
  P->>W: C-02/C-03 plan + card (BIL-01/02, Stripe SCA)
  A-->>P: trial started; stripe webhook BIL-17 updates entitlement
  P->>W: B-06 diagnostic (DIA-*) → B-07 plan (PLN-01)
```
Errors: unverified email blocks trial; age assurance fail → support path; card SCA failure → C-03 retry state; under-13 without consent → profile stays LOCKED.

## PF-02 Answer → marking (GCSE/iGCSE)
1. D-01 submit (`PRA-04`) with confidence + telemetry. 2. Store `student_response`; outbox event. 3. Code pre-checks (numeric vs `calc_instance`, equation balance, units, sig figs). 4. If photo: `PRA-06` → gateway image-prepare → **P-MK-06** transcript → student confirms/edits. 5. Structured chemistry: **P-MK-05** assist. 6. **P-MK-01** (Pass A) and **P-MK-02** (Pass B) in parallel (6-mark: **P-MK-03** ×2). 7. Code validates & compares → agree/high confidence → **P-MK-07** feedback → SSE result (`PRA-05`). 8. Disagree/low confidence/flag → `marking_exception` (F-10) and student sees provisional result "being double-checked". 9. Events → mastery update (BKT), misconception classification (**P-MK-08**) async.
Errors: gateway timeout → retry once → queue exception; schema failure → retry once → exception; budget exceeded → degrade to queued marking with student notice.

## PF-03 A-Level answer (flag `a_level_review`)
Submit → **P-MK-04** provisional + trail → `marking_review_queue` (F-05, SLA 48 h) → reviewer confirm/adjust/release (MFA session) → student sees final on F-09 (until then "In review", no mark). Both AI and human marks stored; adjust audited; reviewer edits feed gold set.

## PF-04 Dispute
F-04 (`MRK-04`) → dispute row + GCSE `marking_exception(reason=DISPUTE)` (or A-Level review) → **P-MK-09** assist → OPS resolves (`EXC-04`) → student notified; systemic-issue counter (M-03) updates; resolution → gold-set candidate.

## PF-05 Tutor turn (text)
Student message → **P-SF-01** → (flag ⇒ scripted SG-T-0x, `safety_flag`, DSL queue, STOP) → context builder (code; strategy from mastery) → **P-TU-01** → **P-SF-02** → display. Hint ladder (**P-TU-02**), re-explain (**P-TU-03**), explain-back (**P-TU-04**), photo walkthrough (**P-TU-06**), rescue (**P-TU-05**). Parent can view transcript (H-09). Time limit/AI toggle enforced server-side (PCT-02).

## PF-06 Voice turn
Consent check (`voice_consent`) → `VOX-01` → WS stream → VAD/utterance → STT (`GW-06`) → redact → **P-SF-01** → **P-TU-01+P-VO-01** → **P-SF-02** → TTS (`GW-07`) → audio stream. Barge-in cancels TTS. Fallback to text (`VOX-05`) on network/STT failure. Audio not retained; transcript 30 days; summary **P-VO-02**.

## PF-07 Nightly bank generation
JobRunr 01:00 → coverage report (`GEN-01`) → blueprints (`GEN-02`) → batch (`GW-03`): **P-QG-02/03** → code checks C1–C10 → **QG-04/05/06/07/08** → all pass ⇒ APPROVED + embed; fail ⇒ **P-QG-09** once → E-01 exceptions. Reviewer fixes re-run checks. Cost recorded per run (Q-04).

## PF-08 Past-paper ingestion
Content admin adds paper (`CNT-12`), sets licence (`CNT-17`), uploads PDFs → `CNT-15` job: **P-IN-03** (human confirms) → **P-IN-01** → **P-IN-02** → validation → **P-QG-05** tag → embed → NEEDS_REVIEW → per-item approve (`CNT-19`). Status polling `CNT-16`.

## PF-09 Safeguarding disclosure escalation
P-SF-01 MEDIUM+ → scripted response → `safety_flag` → Q-05 triage (DSL SLA clock) → escalate (`SAF-05`) → disclosure log with **P-SF-04** summary → DSL actions (`SAF-08`: contact school DSL/parent/authorities) → close (`SAF-09`). Every view audited. School pupils: also notify school safeguarding contact (`safeguarding_contact`).

## PF-10 School onboarding
Owner creates school (`SCH-10`) → admin invite → DPA sign (O-07, `DPA-02`) gate → roster CSV/Wonde (`ONB-01..04`, dry-run diff, commit) → SSO (`ONB-06`) → staff invites → pupil login cards (`ONB-08`) → KCSIE confirmation (O-03) → classes/assignments live. Pupil data disabled until DPA signed.

## PF-11 Billing lifecycle & dunning
Trial → (T-3 d reminder job) → first charge → `invoice.payment_failed` webhook → dunning banner (C-09), Postmark email sequence, 14-day grace (child keeps access) → recovered or subscription paused/cancelled (entitlement removed). Cancel (C-08) effective at period end; reactivate; refunds by support (limit + second approver).

## PF-12 Weekly report
Sunday 18:00 local (per parent tz) JobRunr → facts JSON (code) → **P-RP-01/02** → validate (numbers/ids) → store `weekly_report` → Postmark + in-app + push; suppress if inactivity policy or parent disabled.

## PF-13 Prompt/model promotion
AIE creates version (`AIO-22`) → evaluate on gold/eval set (`AIO-23`) → gate vs live (per-point accuracy, per board × type) → promote (`AIO-24`) with audit; rollback (`AIO-25`). One LIVE per prompt enforced by DB.

## PF-14 Deletion & export
Parent requests (`PRV-03`) → 14-day cooling-off (cancelable) → hard-delete job removes/anonymises learner data across modules, deletes objects, revokes tokens; certificate stored; export (`PRV-06`) builds zip in MinIO, signed URL. Legal holds (audit/billing records) retained per law.

## PF-15 Age assurance & under-13 consent
Adult signup → AGE-01 provider adapter (in-house now; swappable) → outcome only stored (`age_assurance_record`); child <13 → L-01 verifiable parental consent before any data collection beyond account shell.

## PF-16 Question selection (adaptive)
`PRA-03`: strategy controller inputs mastery + IRT difficulty + review-due (FSRS) + target grade + recent misconceptions + no-repeat window → pick from approved bank (bank-first); if cell thin (< `bank.min_items_per_cell`) trigger on-demand top-up job and serve nearest.
