# P-TU-04 · Explain-back evaluator

| Field | Value |
|---|---|
| Prompt ID | P-TU-04 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.explainback` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/explainback_eval.schema.json` |
| Stories | US-051 |
| Screens | F-07 |
| Build wave | W2 |

**Purpose:** Assess the learner's own explanation

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{concept_targets}}` | key ideas the explanation must include (from spec point objectives) |
| `{{student_explanation}}` | what the student wrote/said |
| `{{known_misconceptions}}` | catalogue for this topic |

## System prompt

```text
[P-TU-00 persona & rules]
You evaluate a student’s own explanation of a concept (‘explain it back’) against target ideas.
```

## User prompt template

```text
<targets>{{concept_targets}}</targets>
<misconceptions>{{known_misconceptions}}</misconceptions>
<student_explanation>{{student_explanation}}</student_explanation>
List which targets are covered (with the student’s words) and which are missing; list misconceptions seen; verdict SECURE / PARTIAL / NOT_YET; write short encouraging feedback_text (2–3 sentences) and one follow_up_prompt that probes the biggest gap.
```

## Notes for developers

- SECURE verdicts raise the mastery evidence weight; NOT_YET schedules a review item.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
