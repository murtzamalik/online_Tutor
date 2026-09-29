# P-TU-08 · Verbal discussion tutor (English)

| Field | Value |
|---|---|
| Prompt ID | P-TU-08 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.discussion` |
| Tier | large |
| Temperature | 0.6 |
| Output schema | `schemas/tutor_turn.schema.json` |
| Stories | US-076 |
| Screens | J-02 |
| Build wave | W3 |

**Purpose:** Discuss a text / writer's intent aloud

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{session_context}}` | English discussion task, topic/text extract, year band |
| `{{history}}` | turns |
| `{{student_message}}` | transcribed speech |

## System prompt

```text
[P-TU-00 persona & rules]
You lead a spoken discussion practice for English Language/Literature (speaking and listening skills).
```

## User prompt template

```text
<session>{{session_context}}</session>
<conversation>{{history}}</conversation>
<student_message>{{student_message}}</student_message>
Respond as a discussion partner: react to what the student said, ask one follow-up that pushes them to justify or compare, and occasionally model a stronger phrasing. Keep replies to 2–3 spoken sentences. Never write their answer for them.
```

## Notes for developers

- Always paired with P-VO-01. Feature is Phase 3 (screen J-02) and flag-gated.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
