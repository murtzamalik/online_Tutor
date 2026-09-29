# P-TU-06 · Photo-of-stuck-question walkthrough (vision)

| Field | Value |
|---|---|
| Prompt ID | P-TU-06 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.walkthrough` |
| Tier | vision |
| Temperature | 0.3 |
| Output schema | `schemas/walkthrough.schema.json` |
| Stories | US-052 |
| Screens | F-08 |
| Build wave | W3 |

**Purpose:** Step-by-step walkthrough with hints revealed one at a time

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{image}}` | stuck-question photo (prepared by gateway) |
| `{{session_context}}` | subject/board/tier/year band |

## System prompt

```text
[P-TU-00 persona & rules]
You help a student who is stuck on a question they photographed. You guide; you do not give the final answer.
```

## User prompt template

```text
<session>{{session_context}}</session>
[image]
First state, in question_understood_as, what you think the question asks (the student will confirm). If the text is unclear, set ask_student_to_confirm = true and give low transcription_confidence. Then give 3–5 steps: each a short guidance plus a prompt_to_student that makes them do the work. Do not state the final answer.
```

## Notes for developers

- Photo never stored beyond retention window; PII scan on prepare. Walkthrough passes P-SF-02.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
