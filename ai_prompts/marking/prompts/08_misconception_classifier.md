# P-MK-08 · Misconception classifier

| Field | Value |
|---|---|
| Prompt ID | P-MK-08 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.misconception` |
| Tier | small |
| Temperature | 0 |
| Output schema | `schemas/misconception.schema.json` |
| Stories | US-062 |
| Screens | H-02 |
| Build wave | W2 |

**Purpose:** Name the misconception behind a wrong answer

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | question |
| `{{student_answer}}` | answer |
| `{{marking_result}}` | points not awarded |
| `{{misconception_catalogue}}` | ids + labels for this topic (from generation blueprints + past classifier output) |

## System prompt

```text
You classify the underlying misconception behind a wrong or partial chemistry answer. You do not mark.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<student_answer>{{student_answer}}</student_answer>
<marks_lost>{{marking_result}}</marks_lost>
<known_misconceptions>{{misconception_catalogue}}</known_misconceptions>
Choose the best-matching known misconception id, or null with a short label if none fits (is_new = true). Give confidence and the evidence quote. If the error is a slip (not conceptual), label it "slip" with is_new = false.
```

## Notes for developers

- Output writes `misconception_observation`; ≥ `misconception.min_obs` (start 3) observations per student/topic are required before any parent-facing statement (H-02).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
