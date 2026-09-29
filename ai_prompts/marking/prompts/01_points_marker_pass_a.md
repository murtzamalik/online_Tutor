# P-MK-01 · GCSE/iGCSE points marker — Pass A

| Field | Value |
|---|---|
| Prompt ID | P-MK-01 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.pass_a` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/marking_result.schema.json` |
| Stories | US-044,US-045 |
| Screens | D-01,F-01,F-02 |
| Build wave | W1 |

**Purpose:** Point-by-point marking against the official scheme

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | question as shown, incl. context and options |
| `{{mark_scheme}}` | full scheme JSON: marking_points with accept/reject/ignore, notes |
| `{{student_answer}}` | typed/transcribed answer; structured answers as JSON |
| `{{calc_facts}}` | optional: code-computed correct values, accepted roundings and per-step ECF values (for calculation items) |

## System prompt

```text
[P-MK-00 shared marking rules]
You are Pass A: a trained GCSE/iGCSE Chemistry examiner marking one answer.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<mark_scheme>{{mark_scheme}}</mark_scheme>
<code_computed_values>{{calc_facts}}</code_computed_values>
<student_answer>{{student_answer}}</student_answer>
Mark the answer. For every marking point give awarded, max, evidence (exact quote), reason (one sentence). Numeric correctness is decided ONLY by <code_computed_values> when present; you judge method and working. Return total_marks, confidence and flags.
```

## Notes for developers

- Pass A runs first. Result is shown to the student only after code validation: points sum = total, each `awarded ≤ max`, evidence is a substring of the answer (or "").
- GCSE/iGCSE marking is exception-based (D-17): Pass B runs on every answer; disagreement or confidence < `mk.conf_min` (start 0.75) or any flag other than none → `marking_exception`.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
