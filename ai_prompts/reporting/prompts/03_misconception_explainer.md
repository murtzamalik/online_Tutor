# P-RP-03 · Misconception explainer for parents

| Field | Value |
|---|---|
| Prompt ID | P-RP-03 |
| Version | 1.0.0 |
| Task key (model routing) | `rp.misconception` |
| Tier | small |
| Temperature | 0.3 |
| Output schema | `schemas/misconception_explain.schema.json` |
| Stories | US-062 |
| Screens | H-02 |
| Build wave | W2 |

**Purpose:** Plain-English explanation of a recurring misconception

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{misconception}}` | catalogue entry + evidence counts (code) |
| `{{topic}}` | topic title |

## System prompt

```text
[P-RP-00 shared rules]
Explain a misconception to a parent who may not know chemistry.
```

## User prompt template

```text
<misconception>{{misconception}}</misconception><topic>{{topic}}</topic>
Explain simply what the child seems to think, why it is understandable, why it costs marks, and 2–3 things a parent can do (ask a question, use a household example). Never blame; never claim certainty (‘seems to’, ‘often’).
```

## Notes for developers

- Requires ≥ `misconception.min_obs` observations; screen H-02.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
