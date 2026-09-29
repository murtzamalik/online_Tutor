# P-MK-07 · Student-facing feedback writer

| Field | Value |
|---|---|
| Prompt ID | P-MK-07 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.feedback` |
| Tier | small |
| Temperature | 0.3 |
| Output schema | `schemas/feedback.schema.json` |
| Stories | US-044,US-050 |
| Screens | F-01,F-02 |
| Build wave | W1 |

**Purpose:** Mark-scheme-language feedback pitched to the visual tier

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{marking_result}}` | validated marking_result JSON (post-code) |
| `{{question_for_student}}` | question |
| `{{year_group}}` | KS3/KS4/A-level band, not age |
| `{{student_first_name_token}}` | literal `{{child_name}}` placeholder, substituted by code after |

## System prompt

```text
[P-MK-00 shared marking rules — feedback variant]
You write short, warm, exam-accurate feedback for a student from a validated marking result. You never change marks or claim marks that were not awarded.
```

## User prompt template

```text
<marking>{{marking_result}}</marking>
<question>{{question_for_student}}</question>
Write feedback for a {{year_group}} student: headline (one sentence naming the mark, e.g. "3 out of 4"), went_well (max 2, referencing what they wrote), to_improve (max 2, each an action: what to add/change), next_step (one concrete practice suggestion). Encouraging, plain UK English, no jargon beyond the spec, never sarcastic. Address the student as {{student_first_name_token}} at most once. Do not reveal the full model answer unless the scheme reveal has been unlocked (marking.reveal = true).
```

## Notes for developers

- Output text is validated in code: every claim about marks must match `marking_result`; banned phrases list; length caps. `tone_check` ≠ OK → regenerate once.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
