# Fix + Retest Report — 2026-09-30

**Agents completed before this report:**
- [Fix backend P0 NPEs](42b26964-f9c6-4de0-b64e-375eedd12986) — success
- [Replace all JSON dump UIs](7121ef33-2799-4ed0-9878-4449b4ecf8a5) — success

**Deploy:** `studyloop-core-api` + `studyloop-web` rebuilt and restarted on Docker.

---

## Backend P0/P1 — retested PASS

| Bug | Before | After |
|-----|--------|-------|
| Picture-PIN login NPE | 500 | **PASS** — student JWT issued |
| Billing GET subscription (no row) | 500 | **PASS** — 200 empty |
| Billing GET dunning (no row) | 500 | **PASS** — 200 empty |
| Privacy deletion / export Instant JDBC | 500 | **PASS** — 200 |
| Review SLA Instant param | 500 | **PASS** — 200 metrics |
| Exam-dates SQL null typing | 500 | **PASS** — items returned |
| Enrolment missing specificationId | 500 | **PASS** — 400 validation |

---

## Frontend — customer-ready (no raw JSON)

- Zero remaining `JSON.stringify` dumps under `web/src/app`.
- Browser `/pricing`: plan cards with prices and CTAs (not JSON).
- Browser `/try`: MCQ “Which particle has a relative charge of +1?” with A–D options (not JSON).
- Also redesigned: compare, case-studies, plan-quiz, notifications, results, help, search, billing empty state, plus remaining practice/parent/staff stubs.

---

## Still open (non-blocking for this pass)

1. Deeper post-login learning journey (practice session end-to-end) — PIN login fixed; full walk not fully browser-automated here.
2. Extra staff role seeds (CONTENT_ADMIN / DSL / AUDIT) for staff UCs.
3. Full checkout create-subscription with items → entitlement.

---

## Process

Report issued only after both agents finished and Docker rebuild + retests completed.
