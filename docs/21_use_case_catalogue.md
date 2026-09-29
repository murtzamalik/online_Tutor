# 21 · Use-Case Catalogue

Complete coverage is guaranteed by the **story → screen → endpoint** matrix (`traceability/`): every one of the 130 user stories maps to at least one screen, and every screen has its wiring in `docs/screens/`. The use cases below are the *behavioural* narratives (main flow, alternates, exceptions) that Cursor must implement precisely; sequence diagrams are in `04_process_flows.md` (PF-xx). Format: **Actor · Pre · Main · Alt/Exceptions · Post · Screens**.

## Visitor & onboarding
**UC-01 Explore & try** · Visitor · none · browses qualification/subject pages, FAQ, pricing; tries the live sample question; downloads a gated resource with consent · Alt: unlaunched subject → "coming soon" + lead capture; rate-limit hit → friendly wait · Post: lead stored with consent flag · A-01…A-10, Shell-10.
**UC-02 Parent registers** · Parent · none · signs up, verifies email, passes adult age assurance · Alt: OIDC; age check fails → support route · Exc: email already used → generic message · Post: parent ACTIVE · B-01, B-10, L-05 (PF-01).
**UC-03 Add child** · Parent · verified · creates child profile (year, DOB), picture PIN (11+), or standalone email (13+) · Alt: <13 → verifiable parental consent before profile activates · Post: profile ACTIVE/LOCKED · B-02, L-01.
**UC-04 Student standalone sign-up** · Student 13+ · none · registers, age assurance, parent notified/consent per policy · Exc: <13 blocked → parent flow · B-03.
**UC-05 Choose subjects & goals** · Student/Parent · profile · selects qualification→board→subject (tier), sets target grade & exam date, accessibility prefs · B-04, B-05, B-08, B-09.
**UC-06 Baseline diagnostic** · Student · enrolled · adaptive 15–25 items, pause/resume, seeds mastery · Exc: network loss → resume from last saved · B-06 (DIA-*).
**UC-07 Weekly plan** · Student · diagnostic done · plan built by code, rationale by AI, editable · B-07 (PLN-*).
**UC-08 Child login** · Child · picture PIN set · picks avatar sequence; 5 failures → locked, parent notified; parent/support unlocks · B-11.

## Subscription
**UC-09 Trial & checkout** · Parent · verified · picks plan/subjects (server-priced), card via Stripe SCA, trial starts, reminder at T-3d · Exc: card declined/SCA fail → retry state · C-01…C-04, C-03 (PF-11).
**UC-10 Manage/cancel/reactivate** · Parent · subscribed · change plan with proration preview; cancel with reason (end of period); reactivate · C-05, C-08.
**UC-11 Payment failure** · Parent · charge fails · banner + emails, update card, 14-day grace with access, then suspend · C-09.
**UC-12 Billing history & family billing** · C-10. **UC-13 Micro-sub / referral** (flag-off until Phase 3) · C-06, C-07.

## Learning
**UC-14 Practice** · Student · entitled · session by topic/mixed/wrong-only/review-due/target-grade; each question: answer (type/speak/photo), optional confidence, hints (ladder), skip, end; instant marking; reveal scheme after attempt · Exc: marking delayed → provisional + notice; offline → local draft · D-01, D-09, D-10, D-12, F-01…F-04 (PF-02, PF-16).
**UC-15 Photo answer** · Student · photo_marking on · captures paper answer; transcript shown; must confirm/edit; then normal marking · Exc: low OCR confidence → forced confirm; PII detected → masked · D-06.
**UC-16 Mock paper** · Student · plan tier · builds paper from style profile, sits timed exam-authentic (autosave, flag, extra time), submits/timeouts; results with grade estimate, topic breakdown, PDF; photo pages upload · D-02, D-03, D-11, J-04.
**UC-17 Multi-version drill / custom quiz / redrill** · D-05, D-07, D-09 · numbers via calc templates; saved sets.
**UC-18 11+ entrance test** · no skip/back, server-driven order · D-04 (Phase 3).
**UC-19 Dispute a mark** · Student · after marking · reasons + text; creates exception/review; outcome notification (PF-04) · F-04, F-10.
**UC-20 A-Level answer** · provisional → reviewer → final (PF-03) · F-09, F-05.

## Tutor, voice, engagement
**UC-21 Ask the tutor** · Student · AI allowed by parent · Socratic chat; hints; re-explain (format choice); explain-back; photo walkthrough; rescue on frustration · Exc: safety flag → scripted message + DSL flow (PF-05) · F-06, F-07, F-08, G-03, G-04.
**UC-22 Voice tutor** · Student · voice consent · speak/listen, captions, barge-in, fallback to text · Exc: mic denied/connectivity → J-06 states (PF-06) · J-01, J-02, J-06.
**UC-23 Nudges & surprise quiz** · G-01…G-04 · capped, parent-disableable, supportive only.
**UC-24 Revision** · notes, flashcards (FSRS), cheat sheet PDF, 2-min check, share deck (moderated) · I-01…I-06.
**UC-25 Accessibility** · font/spacing/contrast/TTS/extra time/simplified language applied immediately · B-09, J-03…J-05.

## Parent monitoring & privacy
**UC-26 Monitor progress** · Parent · child linked · dashboard mastery/trend, predicted grade band (estimate), misconceptions (with min evidence), weekly report, alerts, printable action plan · H-01…H-05, H-08, Shell-02 (PF-12).
**UC-27 Control AI/voice & view transcripts** · Parent · toggles, time limits, teacher visibility, transcripts · H-09.
**UC-28 Consent & privacy** · under-13 consent, voice consent, high-privacy defaults, cookie consent, data export & deletion with cooling-off · L-01…L-03, Shell-10 (PF-14, PF-15).

## Schools
**UC-29 School onboarding** · School admin/owner · DPA signed first, roster (CSV/Wonde) dry-run→commit, SSO, staff invites, pupil login cards, KCSIE confirmation · O-06, O-07, O-03 (PF-10).
**UC-30 Set homework** · Teacher · class exists · builds assignment (topics/questions, due, targets), publishes; pupils see it; auto-marked; overdue alerts · O-04, Shell-01.
**UC-31 Class insight** · Teacher · data · heatmap, misconceptions, drill-down, AI summary (aggregates only), CSV export · O-01, O-05.
**UC-32 School dashboard & billing** · School admin/SBM · aggregates; PO/invoices · O-02, O-07.

## Staff
**UC-33 QC exceptions** · Content admin · reviews failed items; edit/rerun/approve/reject · E-01 (PF-07). **UC-34 Author & import papers** · E-02 (PF-08). **UC-35 Spec/style management** · M-01, M-02, M-04. **UC-36 Marking exceptions** · Ops · F-10, M-03. **UC-37 A-Level review** · Reviewer · F-05 (PF-03).
**UC-38 Safeguarding** · DSL · triage flags, disclosures, actions, close, metrics · L-04, Q-05 (PF-09).
**UC-39 Support** · Agent · lookup (no learning content), reset, refund (limits), notes, trial extend, unlock PIN, chat · P-03, P-02, P-01.
**UC-40 Audit & compliance** · CMP · filter/export/verify chain · P-04; boundary log Q-02.
**UC-41 AI operations** · AIE/OWN · eval dashboard, gold set, prompt versions/promote/rollback, model routing, cost/budgets, feature flags · Q-01, Q-03, Q-04.

## Cross-cutting
**UC-42 Notifications** · in-app, email (Postmark), push (OneSignal), preferences · Shell-05. **UC-43 Search** · Shell-08. **UC-44 Auth & MFA** · Shell-04, Shell-09. **UC-45 Empty/error/offline/maintenance** · Shell-07.

## System use cases (no screen)
SUC-01 nightly generation (PF-07) · SUC-02 mastery update from answer stream · SUC-03 FSRS scheduling · SUC-04 weekly report job · SUC-05 retention purge jobs (gateway payload 14 d, photos 30 d, voice 30 d, chat 90 d, events 90 d) · SUC-06 boundary attestation · SUC-07 audit chain verification · SUC-08 Stripe webhook processing · SUC-09 uCheck webhook · SUC-10 IRT calibration & item retirement · SUC-11 predicted-grade snapshots · SUC-12 trial-end reminders · SUC-13 alert generation (drift/inactivity/calibration/overdue) · SUC-14 outbox publisher.
