# Study Loop — E2E Gaps for Fix Round

**Date tested:** 19 Oct 2026  
**Environment:** Local Docker `studyloop` · http://localhost:8080  
**Code base:** Colleague AI/UI fix pack synced into `online_tutor_build_pack`  
**Scope of this doc:** Gaps only — for engineering fix. No code was changed during QA.  
**Overall system score:** 7.5 / 10 (core loop strong; gaps below block confident client UAT)

---

## How to use this doc

1. Fix **P0** first (client demo blockers).  
2. Then **P1** (trust / RBAC / legal).  
3. Then **P2** (polish / seeds / incomplete areas).  
4. After each fix, retest the **Verify** steps.  
5. Tick the checkbox when done and note PR / commit if useful.

**Demo accounts used in QA**

| Role | Login | Notes |
|------|--------|--------|
| Student (Alex) | `/child-login` · handle `learner-e9ae-7469` · PIN **cat → dog → tree** | Primary learner |
| Student (Jordan) | handle `learner-6848-4701` · PIN **star → moon → book** | Secondary |
| Parent | `demo.family@studyloop.local` / `DemoFamily!234` | `/login` |
| Staff reviewer | `reviewer@studyloop.local` / `ReviewerDemo!23` | `/staff/login` |
| Content admin | `content@studyloop.local` / `ReviewerDemo!23` | `/staff/login` |

---

## Priority summary

| Priority | Count | Meaning |
|----------|------:|---------|
| P0 | 3 | Fix before any client demo / UAT |
| P1 | 5 | Fix before calling the build “client-ready” |
| P2 | 6 | Fix for completeness; can follow after UAT start |
| Info | — | Seed / env notes (not always product bugs) |

---

# P0 — Client demo blockers

## GAP-001 — Diagnostic shows file-ingest metadata instead of question text

- [ ] Fixed  
**Severity:** P0 / HIGH  
**Area:** Student onboarding / diagnostic  
**URL:** `/onboarding/diagnostic?...`  
**Observed:** Page renders (STEP 4 of 5) but question body is raw ingest text, e.g.  
`[file-backed ingest] JUN2024 8462/1H Q01 — paper=past-papers/GCSE-AQA-8462/JUN2024/8462_1H/paper.pdf scheme=…`  
**Expected:** Actual exam question stem + options / answer inputs.  
**Impact:** Student cannot do placement diagnostic; looks broken in any client walkthrough.  
**Likely cause:** Past-paper ingest left placeholder / metadata in question body; FE displays stored text as-is.  
**Suggested direction:** Ensure ingested items store rendered question text (or FE falls back to a human-readable stem); backfill demo diagnostic items.  
**Verify:**
1. Login as Alex.  
2. Open diagnostic / onboarding diagnostic.  
3. Confirm real Chemistry question text (not file paths).  
4. Submit an answer end-to-end.

---

## GAP-002 — Exact correct answer marked wrong (marking false-negative)

- [ ] Fixed  
**Severity:** P0 / HIGH (trust)  
**Area:** PF-02 Answer → marking  
**URL:** `/practice/{sessionId}`  
**Observed:** Question: “State the colour of hydrated copper(II) sulfate crystals.” Student answered `Blue`. Model answer shown as `Blue`. Score **0/2** + banner “Your answer is being double-checked” (OPS queue).  
**Expected:** Exact (or normalised) match should score full marks, or at least not route as low-confidence failure when identical.  
**Impact:** Destroys trust in AI marking during demo.  
**Suggested direction:** Check short-answer normalisation (case/whitespace), MCQ/short-text equality path before AI pass, and confidence threshold that dumps exact matches into exceptions.  
**Verify:**
1. Start practice as Alex.  
2. Answer a known short-answer with exact model answer.  
3. Expect full marks (or clear partial with correct feedback), not 0 + OPS double-check for exact match.

---

## GAP-003 — Dead student routes (404 / marketing catch-all)

- [ ] Fixed  
**Severity:** P0 / MEDIUM–HIGH (UX)  
**Area:** Student routing  
**URLs & observed:**

| URL | Observed |
|-----|----------|
| `/settings/voice` | Marketing catch-all: “We couldn't find that subject” |
| `/student/results` | Same marketing catch-all |
| `/revise/flashcards/{id}` | Bare Next.js 404 |

**Expected:** Real settings/results/flashcard pages, or clean in-app “not available yet” under student shell (not marketing 404).  
**Impact:** Easy to hit from bookmarks / old links; looks unfinished.  
**Suggested direction:** Implement missing pages **or** remove/redirect links + add proper student empty states; fix catch-all so authenticated student routes never fall into marketing `[qualification]/[subject]`.  
**Verify:** Each URL above either works with student chrome or redirects to a sensible student page with empty state.

---

# P1 — Client-ready blockers

## GAP-004 — Legal privacy (and likely other legal) body is stub

- [ ] Fixed  
**Severity:** P1 / MEDIUM  
**Area:** Public / compliance  
**URL:** `/legal/privacy` (also check `/legal/terms`, `/legal/cookies`, `/legal/ai`)  
**Observed:** Page chrome OK; body is essentially one placeholder sentence about UK/EEA processing and AI gateway.  
**Expected:** Full policy text suitable for pilot / client review.  
**Impact:** Cannot honestly present as launch/UAT-ready compliance surface.  
**Verify:** Privacy (and sibling legal pages) show substantive copy; sidebar nav works.

---

## GAP-005 — REVIEWER nav vs Exceptions page guard mismatch

- [ ] Fixed  
**Severity:** P1 / MEDIUM  
**Area:** Staff RBAC / nav  
**URL:** `/staff/marking/exceptions`  
**Observed:** REVIEWER sidebar includes **Exceptions**, but page denies: “The exceptions queue is for marking operations staff…”  
**Expected:** Either REVIEWER can view (read-only) **or** nav entry removed for REVIEWER.  
**Impact:** Confusing staff UX; looks like a permissions bug in demo.  
**Likely files:** staff `nav.ts` + `staff/marking/exceptions/page.tsx`  
**Verify:** As `reviewer@…`, either no Exceptions nav item, or page loads with data/empty queue (no deny message).

---

## GAP-006 — Deferred UI RBAC (forms shown before 403)

- [ ] Fixed  
**Severity:** P1 / MEDIUM  
**Area:** Staff / school RBAC UX  
**URLs:**
- `/staff/support` (as REVIEWER) — full search form; 403 only on submit  
- `/school/onboarding` — CSV upload UI renders for non-school roles (falls back to pilot school id); 403 on submit  

**Expected:** Upfront `ForbiddenState` / role guard consistent with safeguarding, audit, AI cost pages.  
**Impact:** Misleading UX; API is safe but UI looks broken / insecure.  
**Verify:** Wrong roles see deny state immediately; no interactive form until authorised.

---

## GAP-007 — Voice student entry broken

- [ ] Fixed  
**Severity:** P1 / MEDIUM  
**Area:** PF-06 Voice  
**URL:** `/tutor/voice` (and any in-app Voice entry)  
**Observed:** Parent AI controls show **Voice tutor: On**; historical voice sessions exist in transcript table; direct `/tutor/voice` → “Something went wrong — couldn't load this tutor session”.  
**Expected:** Clear voice start flow (consent → session) or disabled entry with explanation.  
**Impact:** Voice looks half-wired in demo.  
**Verify:** From student UI, start voice session without error; or hide entry until ready.

---

## GAP-008 — Duplicate “Jordan Nexus” children in demo family

- [ ] Fixed  
**Severity:** P1 / LOW–MEDIUM (data)  
**Area:** Demo seed / parent UX  
**URL:** `/parent`, `/parent/plan/subjects`  
**Observed:** Two children named **Jordan Nexus** (one with no subjects, one enrolled).  
**Expected:** One Jordan (or clearly distinct names).  
**Impact:** Confuses parent demo and plan assignment.  
**Verify:** Parent dashboard shows unique, sensible child set for `demo.family@…`.

---

# P2 — Completeness / polish

## GAP-009 — Revise notes empty for all topics

- [ ] Fixed  
**Severity:** P2  
**Area:** Revise content  
**URL:** `/revise/notes/{topicId}`  
**Observed:** “No notes yet — Approved notes for this topic will appear here.” for topics checked.  
**Expected:** At least pilot-topic approved notes for GCSE Chemistry demo, **or** intentional empty state documented.  
**Verify:** Open 2–3 topics; see real notes for pilot content.

---

## GAP-010 — Tutor tone vs product copy (Socratic mismatch)

- [ ] Fixed  
**Severity:** P2  
**Area:** PF-05 Tutor  
**URL:** `/tutor/{sessionId}`  
**Observed:** UI says tutor won’t just give the answer; first response often full direct explanation.  
**Expected:** Hint-ladder / Socratic behaviour per prompt pack (P-TU-01 / P-TU-02).  
**Verify:** Ask a standard GCSE Chem question; first reply should guide, not dump full answer (unless rescue mode).

---

## GAP-011 — Missing staff / school role seeds

- [ ] Fixed  
**Severity:** P2 (blocks QA of PF-09, PF-10, ops)  
**Area:** Local seed data  
**Accounts missing in DB (login 404):**  
`teacher@studyloop.local`, `schooladmin@studyloop.local`, `ops@studyloop.local`, `dsl@studyloop.local`, `support@studyloop.local`  
**Note:** Script exists at `infra/scripts/seed_local_demo_roles.sql` (password `ReviewerDemo!23`) — may not have been applied on this volume.  
**Impact:** Cannot E2E school onboarding, DSL safeguarding, support console, exceptions as OPS.  
**Verify:** Seed script applied; each account logs in; school + safeguarding + support routes work for correct roles.

---

## GAP-012 — `/search` is auth-gated (document or expose)

- [ ] Fixed / documented  
**Severity:** P2 / LOW  
**Area:** Public IA  
**URL:** `/search` (anon) → redirect `/login?next=%2Fsearch`  
**Observed:** Correct for auth-guarded search; if marketing promised public search, mismatch.  
**Expected:** Either document as logged-in only, or provide public search.  
**Verify:** Product decision reflected in UI/docs.

---

## GAP-013 — Parent reports hash `#reports` does not switch tab

- [ ] Fixed  
**Severity:** P2 / LOW  
**Area:** Parent child detail  
**URL:** `/parent/children/{id}#reports`  
**Observed:** Loads Overview; Reports tab exists but hash does not auto-select.  
**Expected:** Hash/deep-link opens Reports tab.  
**Verify:** Direct link lands on Reports.

---

## GAP-014 — Blank HTML page titles on some parent child sub-routes

- [ ] Fixed  
**Severity:** P2 / LOW  
**Area:** FE metadata  
**URLs:** `/parent/children/{id}`, `/alerts`, `/controls`, etc.  
**Observed:** `<title>` empty on client-routed child sub-pages.  
**Expected:** Meaningful titles (child name + section).  
**Verify:** Browser tab titles update per section.

---

# Process flow status (context for colleague)

| ID | Flow | Status | Notes |
|----|------|--------|-------|
| PF-01 | Parent signup → child → trial | WORKING | Stripe charge not exercised |
| PF-02 | Answer → GCSE marking | WORKING* | *Exact-match false-negative = GAP-002 |
| PF-03 | A-Level review queue | WORKING | Queue empty in demo |
| PF-04 | Dispute | WORKING | UI present; needs queued item for full path |
| PF-05 | Tutor text | WORKING* | *Tone = GAP-010 |
| PF-06 | Voice | PARTIAL | GAP-007 |
| PF-07 | Nightly bank generation | PARTIAL | Manual “Start generation” on QC; no job history UI |
| PF-08 | Past-paper ingestion | WORKING | 3 papers pending licence |
| PF-09 | Safeguarding | PARTIAL | Needs DSL seed (GAP-011) |
| PF-10 | School onboarding | PARTIAL | Needs schooladmin seed (GAP-011) |
| PF-11 | Billing lifecycle UI | WORKING | No active plan on demo parent |
| PF-12 | Weekly report | WORKING | Empty state OK |
| PF-13 | Prompt / model promotion | NOT TESTABLE | Needs AI engineer role seed |
| PF-14 | Deletion & export | WORKING | Buttons not clicked (destructive) |
| PF-15 | Age assurance | WORKING | `/age-check` OK |
| PF-16 | Adaptive selection | WORKING | Mastery-driven picks OK |

---

# Suggested fix order for colleague

```
1. GAP-001  Diagnostic question content
2. GAP-002  Marking exact-match / confidence
3. GAP-003  Dead student routes
4. GAP-004  Legal copy (or placeholder policy pack)
5. GAP-005 + GAP-006  Staff/school RBAC consistency
6. GAP-007  Voice entry
7. GAP-008 + GAP-011  Demo data / role seeds
8. GAP-009 … GAP-014  Content + polish
```

---

# Retest checklist (after fixes)

- [ ] Alex: child login → home → practice → mark (exact answer scores correctly)  
- [ ] Alex: diagnostic shows real question  
- [ ] Alex: tutor reply; revise notes or intentional empty  
- [ ] Alex: `/settings/voice`, `/student/results`, flashcards no marketing 404  
- [ ] Parent: unique children; billing/checkout; privacy pages  
- [ ] Legal privacy has real body  
- [ ] Reviewer: Exceptions nav/page consistent  
- [ ] Content admin: authoring + QC still OK  
- [ ] Optional: seed ops/dsl/schooladmin and smoke those consoles  

---

# What is already good (do not regress)

- Child picture-PIN login  
- Student home shell, practice session UX, mock exam create/sit/results  
- Live AI tutor (gateway stub off)  
- Parent dashboard + child control tabs  
- Content admin past papers + QC queues with seeded data  
- Adaptive “picked for you” practice messaging  
- Age-check, privacy cooling-off copy, empty states generally polished  

---

**Owner handoff:** Please resolve gaps above on the shared `online_tutor_build_pack` / fix branch and reply with which GAP-IDs are done + how to retest.  
**QA contact:** Local stack remains project name `studyloop` via `infra/docker-compose.yml`.
