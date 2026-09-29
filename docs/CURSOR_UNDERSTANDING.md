# CURSOR_UNDERSTANDING — Study Loop (pack absorption)

**Absorbed:** 29 Sep 2026 · Pack root: `online_tutor_build_pack/` · Baseline: Requirements v1.0 LOCKED  
**Status:** Living doc. Raise questions here; do not change `docs/02_decisions_register.md`.  
**Scope of this file:** Understanding only — no application code yet.

---

## 1. System in one page

Study Loop is a UK exam-prep product for parents, learners (11+, GCSE/iGCSE, A-Level), teachers/schools, and internal staff. The product combines adaptive practice, exam-style instant marking, an AI tutor (text + voice), parent monitoring, and a parallel schools channel (assignments, insights, rostering, SSO, DPA, invoice billing). Delivery is by Karsaaz for client Arshad Ashraf; brand name is a placeholder (P-8).

**What is built (pilot):** a subject-agnostic platform with catalogue-driven content. Pilot *content* is GCSE + iGCSE Chemistry across seven board-tracks (AQA 8462, Edexcel 1CH0, OCR Gateway A J248, Eduqas, WJEC, Edexcel Intl 4CH1, Cambridge 0620/0971). The build covers 121 screens wired to ~339 REST endpoints, a 147-table Postgres 16 + pgvector schema (Flyway V001–V011), and 57 versioned AI prompts behind a separate AI Gateway. Consumer Stripe subscriptions and school per-pupil invoices share the same tier pricing model. Voice tutor ships in the pilot with separate parental consent (Google STT/TTS is the only intentional path where personal audio leaves the estate). A-Level marking UI and review workbench are in the inventory; the feature flag stays off until reviewers are vetted (P-1).

**For whom:** visitors (marketing), parents (pay, consent, monitor), students/children (practice, tutor, revise), school teachers/admins/business managers, and staff roles (content, ops marking exceptions, A-Level reviewers, support, compliance, AI ops, DSL, owners).

**Deferred / flag-off (not deleted — D-14):** K-01 gamification (client held to Phase 2); N-01…N-03 tutor marketplace (Won't yet); cohort benchmark UI until sample size ≥ 50; micro-subscriptions and referrals (Phase 3); 11+ entrance test (Phase 3); native mobile apps (separate phase after web — API must stay mobile-ready); own LLM hosting and webcam/affect sensing (non-goals). Wonde MIS is behind `wonde_mis` until a commercial agreement exists; CSV rostering is always on.

**Why flag rather than cut:** standing rule D-14 — client-stated requirements stay in the pack as deferred/flagged specs so they are not reinterpreted away during build.

**Success bar (pilot):** ≥ 95% marking-point agreement vs examiner gold set by board × type (unvalidated until P-2 gold data); GCSE mark p95 &lt; 8 s; zero personal-data egress to AI vendors (daily attestation); DSL SLAs on flags; ≥ 12 approved bank items per spec-point cell.

---

## 2. Architecture map

### Deployables (Docker Compose / Hetzner-style; Caddy TLS)
| Deployable | Role |
|---|---|
| `web` | Next.js 15 App Router (route groups: public, auth, parent, student, school, staff) |
| `core-api` | Java 21 / Spring Boot 3 modular monolith — all domain modules |
| `ai-gateway` | Separate process: tokenise, redact, route, schema-validate, log; only caller of Anthropic/Google |
| `voice-service` | Java WebSocket voice loop (VAD → STT → tutor pipeline → TTS) |
| `embedding-service` | Python FastAPI + ONNX `bge-base-en-v1.5` (768-d); exam content only |
| Postgres 16 + pgvector | System of record |
| Redis | Streams (via outbox), cache, rate limits |
| MinIO | PDFs, photos, exports (signed URLs) |
| External | Stripe, Postmark, OneSignal, uCheck; Anthropic Claude; Google Speech |

Native iOS/Android are later; they consume the same `/api/v1` surface.

### `core-api` modules (package `com.karsaaz.studyloop.<module>`)
`platform`, `identity`, `consent`, `catalog`, `billing`, `content`, `learning`, `marking`, `mastery`, `engagement`, `tutor`, `safety`, `reporting`, `school`, `support`, `aiops`, `gatewayclient`. Cross-module imports only via each module's `api` package (ArchUnit). Controllers thin; jOOQ/JDBC (no JPA); money as long pence; science numbers as BigDecimal.

### AI Gateway boundary — how enforced
1. **Process:** feature code never imports vendor SDKs; only `gatewayclient` talks to `ai-gateway` (GW-01…08, service-to-service).
2. **Application:** caller de-identifies variables before the gateway; gateway adds regex/NER redaction and image EXIF/PII masking; request tokens are random (never stable user ids). Mapping `request_token → learner` lives in `ai_request_map` on core-api only.
3. **Database (hard guarantee, V011):** role `tutor_gateway` may SELECT `prompt_version`, `model_routing` and write AI-ops tables (`ai_gateway_log`, `ai_gateway_payload`, `redaction_event`, `boundary_attestation`, `ai_usage_cost`). It has **no grants** on learner, account, school, or billing tables. Daily `boundary_attestation` samples outbound payloads for PII patterns (Q-02).
4. **Fail modes:** structured-output validate → one retry → degrade (queue/exception), never fabricate. Safety classifier down → learner tutor chat pauses (fail closed).

Events: transactional outbox → Redis Streams. Jobs: JobRunr (Postgres). Observability: OpenTelemetry → Grafana stack; logs/traces carry ids only.

---

## 3. Every process

### PF-01…PF-16

**PF-01 Parent sign-up → child → trial**  
Steps: B-01 register (`AUTH-01`) → email verify (`AUTH-02`) → adult age assurance (`AGE-01…03`) → add child (`STU-02`) → if &lt;13 under-13 consent (`CON-02`, L-01) → subjects/goals (`STU-07`, `STU-14`) → plan + card (`BIL-01/02`, Stripe SCA) → webhook `BIL-17` entitlement → diagnostic (`DIA-*`) → plan (`PLN-01`).  
Failures: unverified email blocks trial; age fail → support; SCA fail → C-03 retry; under-13 without consent → profile LOCKED.  
Tables: account, email_verification, age_assurance_record, student_profile, consent_record, student_enrolment, billing_*, entitlement.

**PF-02 Answer → marking (GCSE/iGCSE)**  
Steps: D-01 submit `PRA-04` → `student_response` + outbox → code pre-checks (calc_instance, equation, units, sig figs) → optional photo `PRA-06` / **P-MK-06** confirm → optional **P-MK-05** → **P-MK-01** + **P-MK-02** (or **P-MK-03**×2 for 6-mark) → code validate/compare → **P-MK-07** feedback → SSE `PRA-05` → mastery + async **P-MK-08**.  
Failures: disagree/low conf/flags → `marking_exception` (F-10), student sees provisional “being double-checked”; gateway timeout/schema → retry once → exception; budget → queued marking notice.  
Endpoints: PRA-04/05/06, MRK-*, EXC-*. Tables: student_response, marking_result, marking_exception, calc_instance, answer_photo, outbox_event, mastery_*.

**PF-03 A-Level answer (flag `a_level_review`)**  
Submit → **P-MK-04** provisional → `marking_review_queue` (F-05, SLA 48 h) → reviewer confirm/adjust/release (`REV-*`, MFA) → student F-09 until release shows “In review” (no final mark). Both AI and human marks stored; adjusts audited; feed gold set. Flag off until P-1.

**PF-04 Dispute**  
F-04 `MRK-04` → dispute + exception (DISPUTE) or A-Level review → **P-MK-09** → OPS `EXC-04` → notify student; M-03 systemic counters; gold-set candidate.

**PF-05 Tutor turn (text)**  
Message → **P-SF-01** (flag ⇒ scripted SG-T-0x, `safety_flag`, DSL, STOP) → code context (strategy from mastery) → **P-TU-01** (+ hint/re-explain/explain-back/photo/rescue variants) → **P-SF-02** → display. Parent transcript H-09. Limits via `PCT-02` server-side. Endpoints: TUT-*, SAF-*, PCT-*. Tables: tutor_session, tutor_message, safety_*.

**PF-06 Voice turn**  
`voice_consent` → `VOX-01` → WS `VOX-02` → STT `GW-06` → redact → same safety/tutor path (+ **P-VO-01**) → TTS `GW-07`. Barge-in cancels TTS. Fail → `VOX-05` text. Audio not retained; transcript 30 d; summary **P-VO-02**.

**PF-07 Nightly bank generation**  
JobRunr ~01:00 → `GEN-01` coverage → `GEN-02` blueprints → batch `GW-03` **P-QG-02/03** → code C1–C10 → QC **P-QG-04…08** → APPROVED+embed or **P-QG-09** once → E-01. Cost Q-04. Tables: generation_run, blueprint, question, qc_check_result, question_embedding.

**PF-08 Past-paper ingestion**  
CNT-12 paper → CNT-17 licence → upload → CNT-15: **P-IN-03** (human confirm) → **P-IN-01/02** → validate → **P-QG-05** → embed → NEEDS_REVIEW → CNT-19. Poll CNT-16. Licence UNKNOWN until P-3; display gated.

**PF-09 Safeguarding escalation**  
P-SF-01 MEDIUM+ → scripted template → `safety_flag` → Q-05/L-04 triage (SLA clock) → SAF-05 disclosure (**P-SF-04**) → SAF-08 actions → SAF-09 close. School pupils also notify `safeguarding_contact`. All views audited.

**PF-10 School onboarding**  
SCH-10 create school → invite → DPA (`DPA-02`) gate → roster CSV/Wonde dry-run/commit (`ONB-*`) → SSO → staff invites → login cards → KCSIE (O-03) → classes/assignments. No pupil data use until DPA signed.

**PF-11 Billing & dunning**  
Trial → T-3 reminder → charge → `invoice.payment_failed` → C-09 banner + emails, 14-day grace (access kept) → recover or suspend entitlement. Cancel at period end; refunds via support with limits/approver. Stripe is SoT via webhooks (`stripe_event`).

**PF-12 Weekly report**  
Sunday 18:00 parent-local JobRunr → facts JSON (code) → **P-RP-01/02** → validate numbers/ids → `weekly_report` → Postmark + in-app + push (suppress if inactive/disabled).

**PF-13 Prompt/model promotion**  
AIO-22 draft → AIO-23 eval on gold → gate vs live → AIO-24 promote (one LIVE per prompt, DB unique) / AIO-25 rollback. Audit.

**PF-14 Deletion & export**  
PRV-03 → 14-day cooling-off → hard-delete/anonymise across modules + MinIO + tokens; certificate; PRV-06 export zip. Legal holds (audit/billing) retained.

**PF-15 Age assurance & under-13 consent**  
Adult AGE-* → outcome only stored; child &lt;13 → L-01 verifiable parental consent before data beyond account shell.

**PF-16 Adaptive question selection**  
`PRA-03`: strategy controller (mastery, IRT, FSRS due, target grade, misconceptions, no-repeat) picks from APPROVED bank; thin cell → on-demand top-up + nearest serve.

### Use cases (45) — ambiguity list

All UC-01…UC-45 are mapped via screens/stories. Ambiguous or policy-dependent items (do not invent answers):

1. **UC-04** — Exact parent notification/consent rules for 13–15 standalone signup (“per policy”; OSA thresholds legal).
2. **UC-09 / sibling discount** — Percentage and eligibility for ≥2 children not fixed (assumption in pack).
3. **UC-13** — Micro-sub/referral behaviour when flags later turn on vs current “Phase 3 only” (specced, not built).
4. **UC-14 “unlimited practice”** — Fair-use / AI budget caps vs marketing language (assumption B.9).
5. **UC-15 / US-029 past-paper display** — When `is_displayable` becomes true depends on unresolved board licensing (P-3).
6. **UC-20** — A-Level go-live depends on reviewer staffing (P-1); flag remains off.
7. **UC-21 vs UC-22 timing** — Tutor *engines* pull forward for J-01 (W2) while F-06/F-07 chat UIs are W3; exact shared-component contract needs care in W2.
8. **UC-29 Wonde** — Adapter exists behind flag; commercial MIS agreement open.
9. **UC-38** — DSL SLA numbers and helpline copy are proposals (`⟦…⟧` placeholders) until client DSL/legal approve.
10. **UC-26 predicted grade / outcome stats** — Methodology and claim language need product/legal before marketing use (A-06).

System use cases SUC-01…14 (generation, mastery, FSRS, reports, purges, attestation, audit chain, Stripe/uCheck webhooks, IRT retirement, grade snapshots, trial reminders, alerts, outbox) have no dedicated screens and must still be implemented as jobs/consumers.

---

## 4. The five hard rules

### 1) D-15 AI data boundary
**Meaning:** No name, DOB, email, school, stable user id, or free-text identity reaches an AI vendor. All model/STT/TTS/vision calls go through `ai-gateway` via `gatewayclient`. `tutor_gateway` cannot read learner tables.  
**How I will test:** (a) ArchUnit / dependency check: no Anthropic/Google SDK in feature modules; (b) DB test: `tutor_gateway` SELECT on `student_profile`/`student_response` fails; (c) red-team PII corpus never appears in `ai_gateway_payload`; (d) daily attestation job + Q-02 UI; (e) CI gateway stub forbids undeclared variable shapes that look like PII fields.

### 2) Numbers in code (D-26 / B-15)
**Meaning:** Mark totals, numeric correctness, mastery, grades, money, VAT, dates — deterministic code. Models may propose points or prose under schema; code recomputes totals and owns calc_instance answers.  
**How I will test:** Unit tests on marking validator (Σ points, caps, evidence substring); property tests on calc templates/ECF; assert model `total` ignored if it disagrees with recomputed sum; billing money always `long` pence; report narrative rejected if numbers ≠ facts JSON.

### 3) A-Level review vs GCSE exceptions (D-16 / D-17)
**Meaning:** A-Level AI marks are provisional until a human releases them. GCSE/iGCSE have no routine human review — only exceptions (low confidence, pass disagreement, dispute, invalid output, flags).  
**How I will test:** Flag-off: A-Level path returns 404/feature-disabled; flag-on: student never sees FINAL until `REV-06`; GCSE happy path never enqueues review queue; exception matrix covers each trigger; dual-mark storage for A-Level audited.

### 4) Safety fails closed
**Meaning:** If the safety classifier is unavailable, learner-facing tutor chat pauses. Sensitive responses are only from `safeguarding_templates.md` / config — never model-generated. P-SF-01 on every learner message; P-SF-02 on every tutor reply.  
**How I will test:** Chaos: kill safety route → tutor returns pause/friendly message, no model reply shown; inject MEDIUM+ category → only SG-T-* text, session `SAFEGUARD_PAUSED`, flag created; assert no concatenation of model text onto scripts; voice uses pre-synthesised script audio.

### 5) Standing rule D-14 (pack wins)
**Meaning:** Client-stated requirements are not removed or quietly reinterpreted. Deferred means feature flag / later wave, not deletion. Pack docs beat supporting_docs on conflict. Decisions D-01…D-28 are final; challenge B-01…B-18 before W0 if needed, then lock.  
**How I will test:** Traceability: every Must/Pilot screen and story has a wave assignment; deferred screens (K-01, N-*) remain in inventory with `feature_flag` off and no “deleted” status; PR checklist requires story/screen IDs; questions go here rather than editing the decisions register.

---

## 5. Marking, mastery and safety engines

### Marking (pseudo-code)
```
onAnswer(response):
  store student_response; emit outbox
  if photo: prepareImage → P-MK-06 → require studentConfirm → answer_text
  codePrecheck:
    if MCQ: exact match → FINAL (no model)
    if numeric: compare to calc_instance (value, unit, sigfig, ECF) → method marks may still need model
    if equation: balancer + units
  if chem_structured: chemAssist = P-MK-05
  if a_level && flag(a_level_review):
    prov = P-MK-04; enqueue marking_review_queue; student sees IN_REVIEW; return
  if six_mark: A,B = P-MK-03, P-MK-03 else A,B = P-MK-01, P-MK-02  # parallel
  validate(A); validate(B)  # totals = Σ points; awarded ≤ max; evidence ⊆ answer
  if invalid: retry_once; else EXCEPTION(INVALID_OUTPUT)
  agree = all points |A.awarded - B.awarded| < pass_disagreement (1)
  lowConf = min(A.conf,B.conf) < threshold (0.70; levels 0.80)
  flags = A.flags ∪ B.flags
  if agree && !lowConf && flags empty:
    marks = recompute(A.points); feedback = P-MK-07; FINAL; SSE
  else:
    EXCEPTION(...); show provisional A + "being double-checked"
  async: P-MK-08 misconception; mastery consumer
onDispute: EXCEPTION(DISPUTE) + P-MK-09 assist → OPS resolve → gold candidate
```

### Mastery / adaptive (pseudo-code)
```
onScoredResponse(event):
  w = evidenceWeight(hints)  # L1 0.75, L2 0.5, L3 0.25
  updateBKT(student, topic, correct?, w)  # bands: LOW/DEVELOPING/SECURE/MASTERED
  updateIRT_ability(student); schedule FSRS review from score/hints
  strategy = map(band) with overrides (3 wrongs → step down; fatigue → break nudge)
selectNext(session):
  filter APPROVED, board/tier, not in no-repeat window
  score = w1·difficultyMatch + w2·topicPriority(weak/exam/due) + w3·misconception + w4·variety + ε
  if cell.count < min_items: trigger topUpJob; serve nearest
predictedGrade: weighted mastery → expected marks → grade_boundary band + uncertainty
```

### Safety (pseudo-code)
```
onLearnerMessage(text):
  codeRules(redact PII, block URLs, profanity, length, rate)
  if safetyService.down: pauseTutor(); return  # FAIL CLOSED
  c = P-SF-01(text)
  if c.severity >= MEDIUM and c.needs_script:
    show scripted(SG-T-0x); create safety_flag; pause 60s; start DSL SLA; STOP
  ctx = buildDeidentifiedContext(strategy, mastery, …)
  reply = P-TU-01(ctx)  # or hint/rescue/…
  out = P-SF-02(reply)
  if out.fail or safety down: discard; pause or scripted SG-T-04
  else display (voice: sentence-buffer TTS only after P-SF-02 on buffer)
onSharedDeck: P-SF-03 → moderate
onEscalate: P-SF-04 summary → disclosure_log → DSL actions (never auto-notify parent without DSL)
```

---

## 6. Screen inventory check

**Confirmed: 121 unique screens** across epic files A–Q + Shell (matches `api/screens.json` and `docs/screens/README.md`).

| Wave | Count | Notes |
|---|---|---|
| W0 | 0 screens (foundation only) | Monorepo, CI, migrations, gateway stub, shell primitives |
| W1 | 36 | Core learning loop, marketing slice, content/QC, marking GCSE, AI ops eval/boundary/prompts, shell login/home |
| W2 | 28 | Billing, parent controls, safety/DSL, voice, schools, support/audit, AI cost/safety queue; **H-10** mobile parent home (API/web stub; native later) |
| W3 | 37 | Phase 2 practice/mocks/tutor UIs, revision, A-Level F-05/F-09, more parent reports, help/chat |
| W4 | 16 | Phase 3 accessibility deep, entrance test, benchmarks, micro-sub/referral, etc. |
| DEFERRED | 4 | K-01; N-01, N-02, N-03 |

**Pull-forward:** Tutor dialogue + safety classifiers must exist by W2 for **J-01** voice even though **F-06/F-07** UIs are W3. Photo transcription (**P-MK-06**) is W2-capable while D-06 screen is W3. Weekly narrative prompts may land before H-03 UI.

**Flag-off / deferred screens:** K-01 (`gamification_phase2=off`); N-01…N-03 (no endpoints); cohort benchmark H-07 hidden until n≥50 / flag; C-06/C-07 Phase 3 flags; `a_level_review` off until P-1; `wonde_mis` off until agreement; `voice_tutor` gated on consent + flag.

**Traceability:** 130 user stories mapped; matrix CSV present (story↔screen↔endpoints↔tables↔prompts). Catalogue header text says “338” endpoints while `endpoints.json` has **339** — treat JSON as authoritative.

---

## 7. Gaps, contradictions, risks

| Item | Observation | Safest assumption until decided |
|---|---|---|
| Endpoint count | API_CATALOGUE.md says 338; JSON/START_HERE say 339 | Implement to `endpoints.json` (339); fix catalogue header in a docs PR |
| Pricing / VAT | Placeholder £39.99/£59.99/£69.99; VAT incl/excl undecided | Keep amounts in DB/Stripe only; UI reads catalogue; do **not** invent final prices or VAT policy |
| Trial / retention knobs | 7-day trial, 14-day dunning grace, 14-day deletion cool-off, chat 90 d | Use V010/config seeds; confirm in DPIA before calling them contractual |
| P-2 gold set | Cannot prove ≥95% (D-19) | Ship eval harness + synthetic gold; label accuracy “unvalidated” |
| P-3 board licensing | Past papers UNKNOWN; display vs grounding | Grounding/retrieval only; never verbatim student display unless licence says so |
| P-1 A-Level reviewers | Staffing unknown | Keep `a_level_review` OFF; still build workbench in W3 behind flag |
| P-9 UK-only hosting | Schools may require UK; Hetzner often EU | Keep region-portable Compose; do **not** pick final region for school go-live |
| P-8 / P-10 brand & design | Placeholder name; HTML prototype vs Figma | Config/CMS strings; tokens + HTML prototype as visual SoT until told otherwise |
| Spec/paper VERIFY flags | Scaffold codes/durations may be wrong (e.g. Edexcel 1CH0) | Seed as-is for W0/W1; content team VERIFY before pilot claims |
| Model IDs in V010 | May be unavailable or renamed | Config-only; verify at build; never hard-code in feature code |
| Safeguarding copy & SLAs | Templates and 15m/4h/24h are proposals | Ship placeholders behind config; **do not** invent legal escalation policy |
| OSA / AADC / DPIA / DPA / T&Cs | Legal open items | Engineering implements technical controls; legal sign-off is a go-live gate, not a W0 code invent |
| Sibling discount % | Undefined | Implement hook/coupon structure; percentage from config when client sets it |
| API_CATALOGUE vs mobile IAP (M-1) | Store may force IAP | Out of scope until mobile phase; keep Stripe web path |
| Supporting_docs vs pack | Older briefs may disagree | **Pack wins (D-14)** |
| Sampling 5% auto-approved Qs | Pack “recommendation”, not client req | Nice-to-have after bank exists; not a W0 blocker |
| RLS coverage | V011 lists core school tables; new school tables must add policies | Every new school-tenant table gets RLS + isolation test |

**Will NOT decide (legal / pricing / safeguarding):** final prices and VAT; exam-board AI licensing terms; DPIA/OSA/AADC legal conclusions; DSL escalation to authorities/parents; safeguarding helpline final copy; brand trademark; UK data-residency contract for schools; Apple/Google IAP policy for mobile; examiner gold-set budget/ownership.

**Risks:** Content licensing delay starving “real past paper” UX; gold-set delay blocking accuracy claims; reviewer shortage blocking A-Level; voice as sole intentional PII-to-vendor path needs airtight consent UX; children’s AADC (no dark patterns / no streak pressure) conflicts with future gamification — keep K-01 off.

---

## 8. Questions

Only items that change behaviour or compliance if answered wrong. **None of these block Wave 0 foundation** (per pack § known gaps); they should be answered before the wave noted.

1. Confirm B-01…B-18 (Java modular monolith, Next.js 15, jOOQ, JobRunr, Stripe money-as-pence, etc.) are accepted as-is for implementation — any challenge before W0 starts? *(default: accept)*
2. Who is the named DSL for pilot, and are IMMEDIATE 15 min / SAME_DAY 4 h / ROUTINE 24 h SLAs approved? *(needed before W2 safeguarding go-live)*
3. Final consumer price points, annual discount, VAT display (incl. vs excl.), and sibling-discount %? *(needed before W2 billing UX copy / Stripe products)*
4. For each of the seven boards: written position on AI-assisted grounding vs student-visible past-paper verbatim use (P-3)? *(needed before pilot content claims / E-02 display flags)*
5. A-Level reviewer staffing plan and target date to flip `a_level_review` (P-1)? *(needed before W3 A-Level go-live)*
6. Gold-set owner, budget, and minimum first slice size/board mix for D-19 validation (P-2)? *(needed before accuracy marketing / prompt promotion gates bind)*
7. Must school pilot data stay UK-only (P-9), and which region should prod Postgres/object storage use? *(needed before school go-live)*
8. Is the HTML prototype + design-system doc still the visual source of truth, or is a Figma rebuild landing (P-10)? *(needed before polishing public A-* pages)*
9. Age thresholds for 13–15 standalone accounts: parent email notify only, or verifiable consent? *(needed before B-03 / UC-04)*
10. Confirm chat transcript retention 90 days and voice transcript 30 days for the DPIA text? *(needed before L-02/L-03 copy and purge jobs are called contractual)*

---

## Working notes for later waves

- Install pack at repo root (`docs/`, `api/`, `db/`, `ai_prompts/`, `AGENTS.md`, `.cursor/`) when starting W0.
- Definition of Done per screen: real endpoints, all Shell-07 states, a11y AA, tests, traceability row, RBAC/audit.
- Prompt changes only via eval gate; one LIVE version per prompt_id.
- Forward-only migrations from V012+.
- Update this file at each wave end.
