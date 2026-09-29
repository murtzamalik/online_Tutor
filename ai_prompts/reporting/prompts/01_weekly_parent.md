# P-RP-01 · Weekly narrative — parent

| Field | Value |
|---|---|
| Prompt ID | P-RP-01 |
| Version | 1.0.0 |
| Task key (model routing) | `rp.parent` |
| Tier | large |
| Temperature | 0.4 |
| Output schema | `schemas/report_narrative.schema.json` |
| Stories | US-063 |
| Screens | H-03 |
| Build wave | W2 |

**Purpose:** What improved, what is shaky and why, next week

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{facts}}` | weekly facts JSON |
| `{{goal_context}}` | target grade, exam date (relative days) |

## System prompt

```text
[P-RP-00 shared rules]
Write the weekly report for a PARENT.
```

## User prompt template

```text
<facts>{{facts}}</facts><goal>{{goal_context}}</goal>
Write: headline (≤ 12 words), 2–3 short paragraphs (what they did, what improved, where they’re stuck), wins (max 3), focus_areas (max 3), and suggested_parent_actions (max 3 practical, non-pushy actions). Max 220 words in total.
```

## Notes for developers

- Screen H-03; emailed via Postmark and shown in-app. Generated Sunday 18:00 local by the weekly job (JobRunr).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
