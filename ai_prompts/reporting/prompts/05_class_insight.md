# P-RP-05 · Class insight summary (teacher)

| Field | Value |
|---|---|
| Prompt ID | P-RP-05 |
| Version | 1.0.0 |
| Task key (model routing) | `rp.class_insight` |
| Tier | large |
| Temperature | 0.3 |
| Output schema | `schemas/class_insight.schema.json` |
| Stories | US-120 |
| Screens | O-05 |
| Build wave | W1 |

**Purpose:** Summarise a class heatmap for the teacher

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{class_facts}}` | aggregate facts: topic mastery distribution, misconception counts, engagement, pupils below threshold as opaque tokens |
| `{{assignment_context}}` | optional |

## System prompt

```text
[P-RP-00 shared rules]
Summarise class performance for a TEACHER.
```

## User prompt template

```text
<facts>{{class_facts}}</facts><assignment>{{assignment_context}}</assignment>
Give a headline, up to 3 patterns each with a suggested teaching move, and up to 5 pupils to check in with (use only the pupil_token given; the teacher UI resolves tokens). Focus on actionable next lessons.
```

## Notes for developers

- Uses aggregates only; no free-text pupil content. Screen O-05.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
