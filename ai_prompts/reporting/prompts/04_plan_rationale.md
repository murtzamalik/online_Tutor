# P-RP-04 · Weekly plan rationale

| Field | Value |
|---|---|
| Prompt ID | P-RP-04 |
| Version | 1.0.0 |
| Task key (model routing) | `rp.plan` |
| Tier | small |
| Temperature | 0.3 |
| Output schema | `schemas/plan_rationale.schema.json` |
| Stories | US-016 |
| Screens | B-07 |
| Build wave | W2 |

**Purpose:** Explain why the code-built plan looks like this

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{plan_json}}` | code-built weekly plan with items and reasons codes |
| `{{goal_context}}` | goal |

## System prompt

```text
[P-RP-00 shared rules]
Write the rationale for a study plan that CODE has already built.
```

## User prompt template

```text
<plan>{{plan_json}}</plan><goal>{{goal_context}}</goal>
Write a 2-sentence summary for the student and one short ‘why’ per item, based only on the reason codes (e.g. WEAK_TOPIC, REVIEW_DUE, EXAM_SOON). Do not add or remove items.
```

## Notes for developers

- Screens B-07 and the weekly plan widget. The plan itself is never AI-generated (code: mastery, exam dates, time budget).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
