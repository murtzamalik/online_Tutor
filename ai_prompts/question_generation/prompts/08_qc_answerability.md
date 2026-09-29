# P-QG-08 · QC 5 — Answerability (three prompts + a code rule)

| Sub-prompt | Purpose | Model tier | Temp. | Schema |
|---|---|---|---|---|
| P-QG-08a | **Strong solver** — answers without seeing the mark scheme | `qg.qc.solve` (large) | 0.3 | `schemas/solver_answer.schema.json` |
| P-QG-08b | **Weak answer** — writes a plausible grade 3–4 answer using a named misconception | `qg.qc.weak` (small) | 0.7 | `schemas/solver_answer.schema.json` |
| P-QG-08c | **QC marker** — marks any answer against the scheme, point by point | `qg.qc.mark` (large) | 0 | `schemas/qc_mark_result.schema.json` |

Version 1.0.0 for all three. P-QG-08c is a stand-in until the Marking Engine prompt pack exists; when it
does, QC 5 must call the **production marking prompt** instead, so that questions are only published if
the real marker can mark them.

## Pass rule (code)

1. Run 08a `qc.solve.runs` times (default 2), each in a fresh call.
2. Mark each strong answer with 08c. **Every** run must receive full marks.
   - Calc items: additionally, the strong answer's final value must equal the code-computed answer after
     applying `answer_rule` (exact match after rounding).
3. Run 08b once per misconception (max 2) and mark with 08c. **Every** weak answer must score
   **less than** full marks, and at least one must score ≤ 50% of the marks (the question must separate
   strong from weak students).
4. Failure reasons written to `qc_check_result.issues_json`:
   - `STRONG_NOT_FULL` + marker's evidence → often a mark scheme that misses a valid answer (feeds repair)
   - `CALC_MISMATCH` → strong solver's value ≠ code value
   - `WEAK_FULL_MARKS` → scheme is too generous or the question gives the answer away
   - `NO_DISCRIMINATION` → no weak answer ≤ 50%

---

## P-QG-08a · Strong solver

**Inputs:** `{{question_for_student}}` — exactly what a student sees (context, question, options, Ar line,
diagram description), rendered instance for calc items. **No mark scheme, no model answer.**

```text
<question>{{question_for_student}}</question>

You are a well-prepared student aiming for the top grade in this exam. Answer the question exactly as
you would write it in the exam: show working for calculations, use the units and precision the question
asks for, and write only what is needed for full marks. If the question is ambiguous or cannot be
answered from what is given, say so in the "problems" field instead of guessing.
```

## P-QG-08b · Weak answer

**Inputs:** `{{question_for_student}}`, `{{misconception}}` (one of the blueprint misconceptions),
`{{target_grade}}` (default "3–4").

```text
<question>{{question_for_student}}</question>
<misconception>{{misconception}}</misconception>

Write the answer a typical grade {{target_grade}} student would give to this question if they held
the misconception above. It should be realistic — partly right where such a student would be right,
wrong where the misconception leads them wrong. Do not exaggerate or make it deliberately silly.
```

## P-QG-08c · QC marker

**Inputs:** `{{item_with_scheme}}` (question + full mark scheme), `{{answer}}`.

```text
<item>{{item_with_scheme}}</item>
<student_answer>{{answer}}</student_answer>

Mark the student answer strictly against the mark scheme, as a trained examiner would.
For each marking point (or, for levels-of-response, for the level decision):
- awarded: marks given
- evidence: the exact words from the student answer that earn it, or "" if none
- note: one sentence if the decision needed judgement (accept/reject/ignore lists, ECF)
Then give total_marks. Apply error carried forward only where the scheme allows it.
If the answer is correct chemistry that the scheme does not credit, set scheme_gap = true and quote it.
```
