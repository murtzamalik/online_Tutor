# Student AI Deep QA — Alex Demo

**Date:** 2026-09-30  
**Student:** Alex Demo (`learner-e9ae-7469` · PIN cat→dog→tree)  
**Enrolment:** AQA GCSE Chemistry 8462  
**Environment:** Local Docker · `AI_GATEWAY_STUB=true` (fixture/stub LLM, not live vendor calls)

---

## Verdict

Alex was fully exercised through practice papers, diagnostic, mock, redrill, tutor, voice, and photo-walkthrough.

**AI learning loop works for objective marking + tutor chat + voice session + photo walkthrough.**  
**Written (SHORT_ANSWER) AI marking returns `PROVISIONAL_EXCEPTION` and then `GET /answers/{id}/marking` 500 — so the browser marks page breaks on written answers.** That is the main AI-path blocker for “prepare with real papers.”

| Layer | Score |
|-------|-------|
| API deep suite | **52 / 60 PASS** |
| Browser AI scenarios | **4 PASS · 3 PARTIAL · 2 FAIL** |

---

## What we prepared on Alex

| Activity | Result |
|----------|--------|
| MIXED practice ×10 | Done (6 FINAL objective, 4 SHORT_ANSWER → PROVISIONAL_EXCEPTION) |
| Wrong-answers pool | **9** items |
| Redrill WRONG_ONLY | Session starts + next Q |
| TARGET_GRADE keep-going | Session starts |
| Diagnostic ×4 | θ → **-1.0**, tier **FOUNDATION**, topicsSeeded=1 |
| Weekly plan | 7 items + AI rationale text |
| Mock GENERATED | Create → start → submit → results (~60% stub) |
| Skill map | **10 topics** with updated mastery |

---

## AI feature results

### Marking (core AI)
| Scenario | Result | Notes |
|----------|--------|-------|
| MCQ / CALCULATION auto-mark | **PASS** | FINAL + marks |
| SHORT_ANSWER dual-pass AI | **PARTIAL** | Returns `PROVISIONAL_EXCEPTION`, awarded 0; not clean FINAL |
| Poll result URL | **PASS** | Works |
| GET marking detail | **FAIL (500)** | Breaks result page for written answers |
| Mark scheme | **FAIL (500)** | NPE MarkingQueryService |
| Self-mark + compare | **PASS** | delta computed |
| Dispute | **PASS** (API) | disputeId + exceptionId |
| A-level review-status on GCSE | **PASS** | `NOT_APPLICABLE` (expected) |
| Browser written → result page | **FAIL** | 500 because marking detail dies |

### Hints / engagement
| Scenario | Result | Notes |
|----------|--------|-------|
| Hint levels 1–3 | **PASS** | Static texts (not live P-TU-02) |
| Engagement events POST | **FAIL (500)** | |
| Surprise quiz GET | **PASS** | |
| Surprise complete | **FAIL (500)** | |
| Surprise UI | **PARTIAL** | Metadata only, no questions |

### Tutor (AI chat)
| Scenario | Result | Notes |
|----------|--------|-------|
| Start SOCRATIC | **PASS** | |
| Message “ionic melting points” | **PASS** | Stub Socratic reply |
| Safety (crisis text) | **PASS** | `blocked:true` + SG-T-01 script |
| Explain-back | **PASS** | |
| Re-explain | **PASS** | Canned worked example (not live LLM) |
| Photo walkthrough + mask | **PASS** | Steps shown, `fullAnswerRevealed:false` |
| Photo without mask | **PASS** | 400 MASK_REQUIRED |
| Parent chat kill-switch (PUT) | **PASS** | Tutor start → **403** |
| PATCH ai-controls | **FAIL** | Use **PUT** only |
| Student `/tutor/rescue` | **FAIL (500)** | Should be clean 403 |
| Home entry to tutor chat | **GAP** | No nav CTA |

### Voice
| Scenario | Result | Notes |
|----------|--------|-------|
| Parent voice consent | **PASS** | |
| Connectivity check | **PASS** | micOk + gatewayReachable |
| Start DISCUSSION | **PASS** | voiceSessionId + wsUrl |
| Fallback to text | **PASS** | channel CHAT |
| End session | **PASS** | |
| `/voice/consent` page | **FAIL** | UI cannot load consent |

### Photo marking / OCR score
| Scenario | Result | Notes |
|----------|--------|-------|
| `POST /practice/photos` | **PASS (honest)** | **501 FEATURE_DISABLED** despite flag `photo_marking=true` |
| Mock photo-pages | **PASS (honest)** | 501 FEATURE_DISABLED |

### Mock / revision / progress
| Scenario | Result | Notes |
|----------|--------|-------|
| Mock assemble + sit (browser) | **PASS** | Timed paper |
| Mock answer-one API | **FAIL (500)** | Submit/results still work with stub score |
| Revision notes + cheat-sheet | **PASS** | Approved content |
| Skill map | **PASS** | |
| Mastery tree | **FAIL (500)** | skill-map OK |

---

## Stub-mode honesty (important)

Local stack runs **`AI_GATEWAY_STUB=true`**:
- Tutor replies are fixture/stub Socratic lines — not live model quality
- Written marking often lands in **exception/provisional** rather than rich AI feedback
- Voice STT/TTS is connectivity + session only (no real spoken dialogue QA)
- Photo “OCR marking” is intentionally disabled

So this was a **strong structural / safety / wiring** AI test, not a live-model pedagogy eval.

---

## Top AI bugs to fix (priority)

1. **P0** — `GET /answers/{id}/marking` 500 on provisional/exception — **FIXED 2026-09-30** (null-safe HashMap)
2. **P0** — Mark-scheme NPE — **FIXED**
3. **P1** — SHORT_ANSWER always `PROVISIONAL_EXCEPTION` in stub — **FIXED** (P-MK-02/04 fixtures); retest → `FINAL`
4. **P1** — Engagement events + surprise complete 500 — **FIXED** (jsonb serialize)
5. **P1** — Mock per-question answer — **OK** with `PUT …/answers/{seq}`
6. **P2** — Voice consent page; tutor home CTA; rescue should 403 not 500 — open
7. Mastery tree NPE — **FIXED** (null enrolmentId)

Retest: `docs/QA_STUDENT_AI_FIX_RETEST.json`

---

## How to retest Alex

```
http://localhost:8080/child-login
Handle: learner-e9ae-7469
PIN: cat → dog → tree
Then: Start practice (prefer MCQ for clean marks) · /tutor/photo · /voice/discussion · /mock/new · /student/map
```

Machine log: `docs/QA_STUDENT_AI_DEEP.json`
