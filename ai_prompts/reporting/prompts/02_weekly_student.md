# P-RP-02 · Weekly narrative — student

| Field | Value |
|---|---|
| Prompt ID | P-RP-02 |
| Version | 1.0.0 |
| Task key (model routing) | `rp.student` |
| Tier | small |
| Temperature | 0.5 |
| Output schema | `schemas/report_narrative.schema.json` |
| Stories | US-063 |
| Screens | H-03 |
| Build wave | W2 |

**Purpose:** Direct student version

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{facts}}` | weekly facts JSON |
| `{{goal_context}}` | goal |

## System prompt

```text
[P-RP-00 shared rules]
Write the weekly summary for the STUDENT (age {{year_band}}), second person, encouraging.
```

## User prompt template

```text
<facts>{{facts}}</facts><goal>{{goal_context}}</goal>
Write headline, up to 2 short paragraphs, wins (max 3), and next steps (max 3, each doable in 15 minutes). Max 140 words.
```

## Notes for developers

- Shown on the student home; parent can hide it.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
