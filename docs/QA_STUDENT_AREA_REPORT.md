# Student Area E2E QA Report

**Date:** 2026-09-30  
**Environment:** Local Docker (`http://localhost:8080`)  
**Student under test:** Alex Demo · handle `learner-e9ae-7469` · PIN cat→dog→tree  
**Parent:** `demo.family@studyloop.local` / `DemoFamily!234`  
**Scope:** Student learning loop (login → home → diagnostic → practice → revise/mock/progress/voice)

---

## Verdict

**Core loop is partially working.** Child can log in, see home, start practice/diagnostic/mock/tutor sessions via API. **Answering a practice question in the browser fails** due to a frontend Zod schema mismatch on the mark result. Several student pages still render empty shells or leak raw IDs / debug fields.

| Layer | Result |
|-------|--------|
| API (student JWT) | **27 PASS / 9 FAIL** (several fails were wrong paths; corrected retests below) |
| Browser routes | **8 PASS / 5 PARTIAL / 4 FAIL** |

---

## Happy path (desired vs actual)

| Step | Desired | Actual |
|------|---------|--------|
| 1. Child picture-PIN login | JWT + redirect `/home` | **PASS** |
| 2. Student home | Enrolled CTA, Start practice | **PASS** |
| 3. Start practice | Question UI | **PASS** |
| 4. Submit answer → feedback | Marks + next/result | **FAIL** — UI “Submit failed” |
| 5. Diagnostic | Adaptive Q → result | **PASS** (API); UI loads Q |
| 6. Weekly plan | Readable plan | **FAIL** UI empty; API OK after generate |
| 7. Redrill / keep-going / mock / revise / progress / voice | Usable flows | **Mixed** (see tables) |

---

## Browser results

| Route | Result | Notes |
|-------|--------|-------|
| `/child-login` | PASS | PIN pad works |
| `/home` | PASS | Enrolled + Start practice; AppNav student links OK |
| `/practice/{sessionId}` start | PASS | Question renders |
| Submit answer | **FAIL** | “Submit failed.” Root cause: `pollResult` Zod expects `reveal: boolean`, API returns `{ schemeAvailable: true }` → SchemaParseError |
| `/practice/custom` | PARTIAL | Topics load; raw student UUID shown |
| `/revise/decks/new` | PARTIAL | “FORM: Yes” debug leak via ReadableData boolean |
| `/student/map` | PASS | Knowledge map with mastery |
| `/voice/discussion` | PASS | Start discussion CTA |
| `/settings/accessibility` | PASS | Prefs form loads |
| `/onboarding/diagnostic` | PASS | Question + submit UI |
| `/onboarding/plan` | **FAIL** | Title only / empty body (API has plan data) |
| `/practice/redrill` | **FAIL** | Empty after load (API has wrong-answers) |
| `/practice/keep-going` | PASS | Start drill CTA (page shell) |
| `/mock/new` | PARTIAL | Assemble CTA; raw enrolment UUID shown |
| `/student/benchmark` | PARTIAL | Good empty copy + debug “Opted in: false” |
| `/surprise` | **FAIL** | Blank quiz body |
| `/tutor/photo` | PASS | Upload CTA |

---

## API results (student JWT) — confirmed

### Working
- AUTH-15 picture-PIN login / wrong PIN 401 / `/me.studentId`
- STU-12 home + activeEnrolmentId; STU-13 daily goal
- Enrolments list; practice MIXED/WRONG_ONLY start; next question; answer accept
- **Correct** result path `GET /practice/answers/{id}/result` → marks FINAL
- Diagnostic start → next → answer → result (theta / topicsSeeded)
- Weekly plan GET (when plan exists); generate POST (when no conflict)
- Mock create + start; revision decks list/create; tutor session start
- Skill-map; surprise-quiz (correct path `/students/{id}/surprise-quiz`); accessibility GET/PUT
- Parent correctly **403** on practice/diagnostic start

### Broken / risky
| Issue | Severity | Evidence |
|-------|----------|----------|
| **BUG-RESULT-ZOD-001** — `pollResult` schema `reveal: boolean` vs API object | **P0** | Zod PARSE_FAIL; browser “Submit failed” despite API 200 |
| **BUG-SCHEME-NPE-001** — `GET /questions/{id}/mark-scheme` 500 | **P1** | NPE `MarkingQueryService.markScheme:103` |
| **BUG-MASTERY-NPE-001** — `GET /students/{id}/mastery` 500 | **P1** | NPE `MasteryService.masteryTree:139` (skill-map works) |
| **BUG-MODE-KEEP-001** — mode `KEEP_GOING` invalid | **P1** | DB check allows `TARGET_GRADE` not `KEEP_GOING`; UI correctly uses TARGET_GRADE via w4 |
| **BUG-PLAN-UI-001** — `/onboarding/plan` empty | **P1** | API returns items; page uses ReadableData but browser saw empty — likely generate/get race or silent catch |
| **BUG-REDRILL-UI-001** — `/practice/redrill` empty | **P1** | API wrong-answers 200 with items; UI empty |
| **BUG-SURPRISE-UI-001** — `/surprise` blank questions | **P1** | API serves quiz; UI doesn’t render items |
| **BUG-RAW-ID-001** — UUID / debug leaks on student pages | **P2** | custom/mock/benchmark/decks-new |
| Enrolment targetGrade patch path unclear / 500 on guessed routes | **P2** | Need catalogue STU-08 exact path |
| Weekly plan regenerate can 500 when plan already ACTIVE | **P2** | GET works after first generate |

---

## Authz checks
- Parent JWT cannot start practice or diagnostic → **403 PASS**
- Staff must not use learner home for exam prep (use child login)

---

## Recommended fix order
1. **P0:** Fix `pollResult` Zod (`reveal` object / `.nullish()`) so answer → result page works.
2. **P1:** Fix mark-scheme + mastery NPEs; fix plan/redrill/surprise page rendering (empty states + CTA to start redrill session).
3. **P2:** Strip raw UUIDs/debug from student-facing ReadableData surfaces; harden weekly-plan regenerate.

---

## How to retest quickly
```
Child: http://localhost:8080/child-login
Handle: learner-e9ae-7469
PIN: cat → dog → tree
Then: Start practice → answer → expect result page (blocked until P0 fix)
```

Raw machine log: `docs/QA_STUDENT_AREA_REPORT.json`
