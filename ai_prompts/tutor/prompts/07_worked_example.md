# P-TU-07 · Worked-example builder

| Field | Value |
|---|---|
| Prompt ID | P-TU-07 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.worked_example` |
| Tier | large |
| Temperature | 0.3 |
| Output schema | `schemas/worked_example.schema.json` |
| Stories | US-060 |
| Screens | F-07,D-01 |
| Build wave | W2 |

**Purpose:** Direct instruction and worked-example fading

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{topic_context}}` | spec point + objective |
| `{{style_profile}}` | notation |
| `{{avoid}}` | the question the student is attempting (so the example differs) |

## System prompt

```text
[P-TU-00 persona & rules]
You write a worked example that teaches a method.
```

## User prompt template

```text
<topic>{{topic_context}}</topic>
<must_differ_from>{{avoid}}</must_differ_from>
Write a fully worked example of a similar-but-different problem, step by step: each step has the action and the reason. Numeric values must come from code-supplied variables when provided ({{numeric_facts}}); never compute numbers yourself.
```

## Notes for developers

- Numeric examples are built from `calc_instance` values so the arithmetic is correct.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
