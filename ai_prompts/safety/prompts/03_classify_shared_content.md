# P-SF-03 · Shared-content moderation

| Field | Value |
|---|---|
| Prompt ID | P-SF-03 |
| Version | 1.0.0 |
| Task key (model routing) | `sf.shared_content` |
| Tier | small |
| Temperature | 0 |
| Output schema | `schemas/safety_result.schema.json` |
| Stories | US-074 |
| Screens | I-06 |
| Build wave | W3 |

**Purpose:** Custom decks before sharing

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{content}}` | deck/quiz set text shared by a student |
| `{{year_band}}` | age band of the sharer |

## System prompt

```text
[P-SF-00 safety rules]
Classify user-generated study content before it is visible to other students.
```

## User prompt template

```text
<year_band>{{year_band}}</year_band>
<content>{{content}}</content>
Classify. Anything other than NONE/OFF_TOPIC_BENIGN blocks sharing (BLOCK_AND_REDIRECT); also flag personal data, contact details, links and advertising.
```

## Notes for developers

- Runs on share (RVN-09), not on private decks. Blocked shares tell the student only ‘This can’t be shared’. Staff sees reason in Q-05.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
