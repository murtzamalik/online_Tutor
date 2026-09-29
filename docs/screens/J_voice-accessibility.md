# Epic J — J. Voice & Accessibility

## J-01 — Voice Tutor Conversation

- **Route:** `/voice/[voiceSessionId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-075 (Use a spoken-dialogue tutor mode to talk through a topic hands-free.…), US-083 (Refuse to do a student's homework verbatim, keeping the tool a practic…)
- **Design notes (inventory):** The single biggest UI departure — waveform/listening states, live transcript, Socratic scaffolding. See design system doc.
- **Baseline v1.0 change:** UPDATED — Priority aligned to client Round 1 (voice from day 1). Consent/errors in J-06.
- **Behaviour, states & acceptance criteria:**
  - Push-to-talk / continuous, live captions, barge-in, fallback to text
  - AC: needs voice_consent
  - audio not stored unless configured
  - latency budget <1.5s first token
- **Endpoints wired:**
  - `VOX-01` `POST /api/v1/voice/sessions` — Create voice session (requires voice_consent, parent voice toggle, quiet hours OK) → ws URL + short-lived token
  - `VOX-02` `WS /api/v1/voice/sessions/{voiceSessionId}/stream` — Bidirectional audio + control frames (see docs/11)
  - `VOX-03` `POST /api/v1/voice/sessions/{voiceSessionId}/end` — End and finalise metrics
  - `VOX-04` `POST /api/v1/voice/connectivity-check` — Mic/network pre-flight (returns error class for J-06)
  - `VOX-05` `POST /api/v1/voice/sessions/{voiceSessionId}/fallback-to-text` — Switch to chat keeping context
  - `CON-03` `POST /api/v1/students/{studentId}/consents/voice` — Separate voice consent incl. Google processing acknowledgement
  - `TUT-01` `POST /api/v1/tutor/sessions` — Start chat tutor session (checks parent AI controls and quiet hours)
- **Tables touched (via those endpoints):** `audit_log`, `parent_ai_controls`, `tutor_message`, `tutor_session`, `voice_consent`, `voice_session`
- **AI prompts:** `P-TU-01` (Tutor dialogue turn (Socratic / strategy-driven)), `P-VO-01` (Spoken-style overlay), `P-SF-01` (Learner-input classifier), `P-SF-02` (Tutor-output classifier)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## J-02 — Verbal Discussion Mode (English Lang/Lit)

- **Route:** `/voice/discussion`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-076 (As an English Language/Literature student, practise verbal discussion …)
- **Design notes (inventory):** Variant of J-01 tuned for discussion, not Q&A.
- **Behaviour, states & acceptance criteria:**
  - English discussion tutor (verbal)
  - AC: same consent + safety
- **Endpoints wired:**
  - `VOX-01` `POST /api/v1/voice/sessions` — Create voice session (requires voice_consent, parent voice toggle, quiet hours OK) → ws URL + short-lived token
  - `VOX-02` `WS /api/v1/voice/sessions/{voiceSessionId}/stream` — Bidirectional audio + control frames (see docs/11)
  - `VOX-03` `POST /api/v1/voice/sessions/{voiceSessionId}/end` — End and finalise metrics
- **Tables touched (via those endpoints):** `parent_ai_controls`, `tutor_message`, `tutor_session`, `voice_consent`, `voice_session`
- **AI prompts:** `P-TU-08` (Verbal discussion tutor (English)), `P-VO-01` (Spoken-style overlay)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## J-03 — Accessibility Settings Panel

- **Route:** `/settings/accessibility`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 3 / **W4**
- **User stories:** US-077 (Use dyslexia-friendly fonts, adjustable spacing and colour/contrast se…)
- **Design notes (inventory):** Dyslexia font, spacing, contrast. Also reachable from onboarding (B-09).
- **Behaviour, states & acceptance criteria:**
  - Full accessibility panel
  - AC: persists per student
- **Endpoints wired:**
  - `STU-10` `GET /api/v1/students/{studentId}/accessibility` — Read accessibility profile
  - `STU-11` `PUT /api/v1/students/{studentId}/accessibility` — Dyslexia font, text size, TTS, reduced motion, simplified language, extended-time %
- **Tables touched (via those endpoints):** `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## J-04 — Extended-Time Exam Simulation

- **Route:** `/mock/[mockId]/sit (extra time)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-078 (Practise under extended-time simulation matching my real exam access a…)
- **Design notes (inventory):** Mode toggle on D-03.
- **Behaviour, states & acceptance criteria:**
  - Extra-time multiplier 25/50/100%
  - AC: applied from accessibility profile
- **Endpoints wired:**
  - `MOC-01` `POST /api/v1/mock-papers` — Assemble mock (GENERATED or REAL_PAPER) with structure/timing/weighting
  - `STU-10` `GET /api/v1/students/{studentId}/accessibility` — Read accessibility profile
- **Tables touched (via those endpoints):** `mock_paper`, `mock_paper_item`, `student_profile`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## J-05 — Simplified-Language Toggle

- **Route:** `(toggle)`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-079 (Toggle simplified-language question wording without the underlying con…)
- **Design notes (inventory):** In-context on D-01, not a new screen.
- **Behaviour, states & acceptance criteria:**
  - Simplified-language rewrite of notes/explanations
  - AC: never alters marks or facts
- **Endpoints wired:**
  - `TUT-05` `POST /api/v1/tutor/reexplain` — Re-explain after 2nd wrong attempt in a different format
  - `RVN-01` `GET /api/v1/revision/topics/{topicId}/notes` — Revision notes
- **Tables touched (via those endpoints):** `hint_event`, `revision_note`, `tutor_message`
- **AI prompts:** `P-RC-05` (Simplified-language rewrite)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## J-06 — Voice Consent & Error States

- **Route:** `/voice/consent`  
- **Roles:** Parent / student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Must / Pilot / **W2**
- **User stories:** US-118 (Give separate consent for voice, and see clear microphone and connecti…)
- **Design notes (inventory):** Separate parent consent for voice (audio goes to Google Cloud Speech — the one vendor path with personal data, D-20). Mic/network errors always offer a text fallback.
- **Baseline v1.0 change:** NEW in v1.0
- **Behaviour, states & acceptance criteria:**
  - Parental voice consent screen, mic permission errors, connectivity check
  - AC: voice off until consent
- **Endpoints wired:**
  - `CON-03` `POST /api/v1/students/{studentId}/consents/voice` — Separate voice consent incl. Google processing acknowledgement
  - `CON-04` `DELETE /api/v1/students/{studentId}/consents/voice` — Withdraw voice consent (ends live voice sessions)
  - `VOX-04` `POST /api/v1/voice/connectivity-check` — Mic/network pre-flight (returns error class for J-06)
  - `VOX-05` `POST /api/v1/voice/sessions/{voiceSessionId}/fallback-to-text` — Switch to chat keeping context
- **Tables touched (via those endpoints):** `audit_log`, `tutor_session`, `voice_consent`, `voice_session`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
