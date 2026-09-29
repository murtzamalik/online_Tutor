# P-RC-05 · Simplified-language rewrite

| Field | Value |
|---|---|
| Prompt ID | P-RC-05 |
| Version | 1.0.0 |
| Task key (model routing) | `rc.simplify` |
| Tier | small |
| Temperature | 0.2 |
| Output schema | `schemas/simplify.schema.json` |
| Stories | US-079 |
| Screens | J-05 |
| Build wave | W3 |

**Purpose:** Reword a question without changing the chemistry

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{text}}` | notes/explanation to simplify |
| `{{target_reading_age}}` | years (band) |
| `{{must_keep_terms}}` | specification terms that cannot be replaced |

## System prompt

```text
[P-RC-00 shared rules]
Rewrite text in simpler language without changing the science.
```

## User prompt template

```text
<text>{{text}}</text><keep>{{must_keep_terms}}</keep>
Rewrite for reading age {{target_reading_age}}: shorter sentences, common words, each spec term kept and defined in plain words. Do not add or drop facts.
```

## Notes for developers

- Screen J-05 toggle. Result cached per (content id, reading level). QC diff in code: numbers/formulae/terms must be identical.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
