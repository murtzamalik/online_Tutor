# Epic I — I. Revision Content

## I-01 — Flashcard Study Mode

- **Route:** `/revise/decks/[deckId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-069 (Get auto-generated flashcard decks per topic as a lighter revision mod…), US-058 (Have previously-mastered topics resurfaced on a spaced schedule so I d…)
- **Design notes (inventory):** Auto-generated per topic.
- **Behaviour, states & acceptance criteria:**
  - Flashcard flip, FSRS rating (again/hard/good/easy)
  - AC: schedule by FSRS on server
- **Endpoints wired:**
  - `RVN-02` `GET /api/v1/revision/topics/{topicId}/decks` — System decks for the topic
  - `RVN-05` `GET /api/v1/revision/decks` — My decks
  - `RVN-06` `POST /api/v1/revision/cards/{cardId}/review` — Rate a card (FSRS update)
  - `MAS-07` `GET /api/v1/students/{studentId}/review-due` — FSRS reviews due
- **Tables touched (via those endpoints):** `flashcard`, `flashcard_deck`, `flashcard_review`, `flashcard_state`, `mastery_state`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## I-02 — Custom Flashcard Builder

- **Route:** `/revise/decks/new`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-070 (Build my own custom flashcard deck.…)
- **Behaviour, states & acceptance criteria:**
  - Card editor, KaTeX preview
  - AC: user content moderated (P-SF-03) only when shared
- **Endpoints wired:**
  - `RVN-03` `POST /api/v1/revision/decks` — Create custom deck
  - `RVN-04` `PUT /api/v1/revision/decks/{deckId}` — Edit deck/cards (moderation on save)
- **Tables touched (via those endpoints):** `flashcard`, `flashcard_deck`, `safety_classification`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## I-03 — Revision Notes Reader

- **Route:** `/revise/notes/[topicId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-071 (Read short, AI-rewritten (original, non-copied) revision notes per top…)
- **Design notes (inventory):** AI-rewritten, original.
- **Behaviour, states & acceptance criteria:**
  - Notes reader, headings, glossary, diagrams
  - AC: only QC-approved notes served
- **Endpoints wired:**
  - `RVN-01` `GET /api/v1/revision/topics/{topicId}/notes` — Revision notes
- **Tables touched (via those endpoints):** `revision_note`
- **AI prompts:** `P-RC-01` (Revision notes writer), `P-RC-04` (Revision content QC)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## I-04 — One-Page Cheat Sheet

- **Route:** `/revise/cheat-sheet/[topicId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 2 / **W3**
- **User stories:** US-072 (Get a one-page cheat sheet per topic/subject for last-minute review.…)
- **Design notes (inventory):** Print/export friendly.
- **Behaviour, states & acceptance criteria:**
  - One-page cheat sheet + PDF
  - AC: print CSS
- **Endpoints wired:**
  - `RVN-07` `GET /api/v1/revision/topics/{topicId}/cheat-sheet` — Cheat sheet JSON
  - `RVN-08` `GET /api/v1/revision/topics/{topicId}/cheat-sheet/pdf` — Print/export
- **Tables touched (via those endpoints):** `cheat_sheet`
- **AI prompts:** `P-RC-03` (Cheat-sheet generator)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## I-05 — 2-Minute Knowledge-Check Quiz

- **Route:** `/revise/check/[topicId]`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-073 (Do a quick 2-minute knowledge-check quiz between longer practice sessi…)
- **Design notes (inventory):** Short-form, between longer sessions.
- **Behaviour, states & acceptance criteria:**
  - 2-minute 5-question check
  - AC: bank items only
- **Endpoints wired:**
  - `PRA-01` `POST /api/v1/practice/sessions` — Start session (mode: TOPIC, MIXED, WRONG_ONLY, TARGET_GRADE, QUICK_CHECK, REVIEW_DUE, MULTI_VERSION, ASSIGNMENT)
  - `PRA-03` `GET /api/v1/practice/sessions/{sessionId}/next` — Next question (adaptive selection, bank-first; may trigger on-demand top-up)
  - `PRA-04` `POST /api/v1/practice/sessions/{sessionId}/answers` — Submit answer (typed/spoken/photo ref/structured) + confidence + telemetry summary; returns result or marking ticket
- **Tables touched (via those endpoints):** `mark_scheme`, `marking_result`, `mastery_state`, `outbox_event`, `practice_session`, `question`, `question_embedding`, `session_question`, `student_response`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## I-06 — Share Deck / Quiz Set

- **Route:** `/revise/share`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Could / Phase 3 / **W4**
- **User stories:** US-074 (Share a flashcard deck or quiz set with classmates or a study group.…)
- **Design notes (inventory):** To classmates/study group — needs a lightweight sharing/safety check.
- **Behaviour, states & acceptance criteria:**
  - Share code, import shared deck, revoke
  - AC: shared content moderated before visible
  - disabled for <13 unless parent allows
- **Endpoints wired:**
  - `RVN-09` `POST /api/v1/revision/decks/{deckId}/share` — Create share code (expiring; moderated)
  - `RVN-10` `GET /api/v1/revision/shared/{shareCode}` — Open shared deck (read-only)
  - `RVN-11` `DELETE /api/v1/revision/shares/{shareCode}` — Revoke share
- **Tables touched (via those endpoints):** `deck_share`, `flashcard`, `safety_classification`
- **AI prompts:** `P-SF-03` (Shared-content moderation)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
