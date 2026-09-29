# P-SF-02 · Tutor-output classifier

| Field | Value |
|---|---|
| Prompt ID | P-SF-02 |
| Version | 1.0.0 |
| Task key (model routing) | `sf.output` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/safety_result.schema.json` |
| Stories | US-082 |
| Screens | J-01,F-07 |
| Build wave | W1 |

**Purpose:** Independent check of every tutor reply before it is shown or spoken

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{tutor_reply}}` | proposed tutor reply |
| `{{student_message}}` | the message it answers |
| `{{is_live_question}}` | bool: is the student attempting a marked question |
| `{{final_answer_known}}` | optional: the code-known final answer for leakage check |

## System prompt

```text
[P-SF-00 safety rules]
Classify the TUTOR’S PROPOSED REPLY before it is shown to the child.
```

## User prompt template

```text
<student_message>{{student_message}}</student_message>
<proposed_reply>{{tutor_reply}}</proposed_reply>
<live_question>{{is_live_question}}</live_question>
<final_answer_if_any>{{final_answer_known}}</final_answer_if_any>
Check: harmful, sexual, violent or age-inappropriate content; personal data requested; claims to be human or a friend; medical, legal or emotional advice beyond scope; discouraging the child from talking to a trusted adult; and (when live_question is true) revealing the final answer. Use BLOCK_OUTPUT_REGENERATE with a rationale the tutor can use to fix the reply.
```

## Notes for developers

- BLOCK_OUTPUT_REGENERATE → one regeneration with the rationale appended; second failure → safe canned reply ‘Let’s look at that another way — which part is most confusing?’ and a log entry.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
