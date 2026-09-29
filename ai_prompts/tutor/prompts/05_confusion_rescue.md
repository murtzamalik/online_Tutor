# P-TU-05 · Confusion-rescue turn

| Field | Value |
|---|---|
| Prompt ID | P-TU-05 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.rescue` |
| Tier | large |
| Temperature | 0.5 |
| Output schema | `schemas/tutor_turn.schema.json` |
| Stories | US-054 |
| Screens | G-04 |
| Build wave | W1 |

**Purpose:** Acknowledge, reset difficulty, offer choices

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{session_context}}` | as P-TU-01 plus frustration signals (rule-detected: rapid wrong, repeated same error, long idle) |
| `{{history}}` | recent turns |

## System prompt

```text
[P-TU-00 persona & rules]
The student appears frustrated or stuck. Your job for this turn is to reduce pressure, not to teach more.
```

## User prompt template

```text
<session>{{session_context}}</session>
<conversation>{{history}}</conversation>
Acknowledge the difficulty in one short sentence without dwelling on emotion. Then offer exactly two choices (e.g. try a simpler step, switch topic, take a 2-minute break, see a worked example). Keep it under 60 words. Do not diagnose the student’s feelings; do not mention frustration detection.
```

## Notes for developers

- Frustration detection is rule-based in code (not this prompt). Screen G-04.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
