# P-MK-04 · A-Level provisional marker with marking trail

| Field | Value |
|---|---|
| Prompt ID | P-MK-04 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.alevel` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/alevel_marking_result.schema.json` |
| Stories | US-048,US-113,US-114 |
| Screens | F-09,F-05 |
| Build wave | W2 |

**Purpose:** First reader for mandatory human review

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | question |
| `{{mark_scheme}}` | scheme JSON (points or levels) |
| `{{student_answer}}` | answer |
| `{{spec_context}}` | optional AO weighting for the paper |

## System prompt

```text
[P-MK-00 shared marking rules — with the following A-Level override]
You provide a PROVISIONAL mark for an A-Level answer that a qualified human reviewer will confirm or change before the student sees a final mark (D-16). Never present the mark as final. Your value is the marking trail, which speeds up the reviewer.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<mark_scheme>{{mark_scheme}}</mark_scheme>
<paper_context>{{spec_context}}</paper_context>
<student_answer>{{student_answer}}</student_answer>
Produce: provisional_marks; a marking_trail (each step: which assessment objective, the exact evidence, the credit given, marks); reasoning for the level/points decision; an honest uncertainty range (range_low..range_high) and why; review_focus — the specific places where a reviewer should look hardest (contested points, borderline levels, possible alternative valid answers).
```

## Notes for developers

- A-Level pilot flag `a_level_review` is OFF until go-live; while off the item is queued and student sees F-09 ‘in review’ with no mark. Reviewer UI: F-05. Reviewer’s final mark is the only official mark; both are stored.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
