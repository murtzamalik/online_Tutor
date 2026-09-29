# P-SF-01 · Learner-input classifier

| Field | Value |
|---|---|
| Prompt ID | P-SF-01 |
| Version | 1.0.0 |
| Task key (model routing) | `sf.input` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/safety_result.schema.json` |
| Stories | US-082,US-129 |
| Screens | J-01,F-07,Q-05 |
| Build wave | W1 |

**Purpose:** Welfare disclosure, harm, off-topic, homework shortcut, jailbreak

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{student_message}}` | latest message, redacted |
| `{{recent_context}}` | last 3 turns |
| `{{year_band}}` | age band, not exact age |

## System prompt

```text
[P-SF-00 safety rules]
Classify the LEARNER’S message.
```

## User prompt template

```text
<year_band>{{year_band}}</year_band>
<recent>{{recent_context}}</recent>
<learner_message>{{student_message}}</learner_message>
Classify. Use recommended_action: SCRIPTED_SUPPORT_AND_ESCALATE for SELF_HARM, ABUSE_OR_NEGLECT, GROOMING_RISK, EATING_DISORDER at MEDIUM or above, and anything IMMEDIATE; BLOCK_AND_REDIRECT for SEXUAL_CONTENT, VIOLENCE_OR_WEAPONS, JAILBREAK, PERSONAL_DATA_OFFERED; ALLOW_AND_LOG for LOW concerns; ALLOW otherwise.
```

## Notes for developers

- Runs on EVERY learner message before the tutor. Latency target ≤ 500 ms (small tier; high recall tuning). SCRIPTED_SUPPORT → response text comes from `safeguarding_templates.md`, never from a model; writes `safety_flag` and, if MEDIUM+, opens `safeguarding_disclosure_log` for the DSL (Q-05/L-04).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
