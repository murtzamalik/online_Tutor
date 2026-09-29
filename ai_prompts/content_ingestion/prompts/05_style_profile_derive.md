# P-IN-05 · Board style profile derivation

| Field | Value |
|---|---|
| Prompt ID | P-IN-05 |
| Version | 1.0.0 |
| Task key (model routing) | `in.style` |
| Tier | large |
| Temperature | 0.2 |
| Output schema | `schemas/style_profile.schema.json` |
| Stories | US-088,US-038 |
| Screens | M-02 |
| Build wave | W1 |

**Purpose:** Command words, wording and scheme conventions from ingested papers

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{sample_items}}` | 20–40 ingested past-paper items for a board incl. schemes |
| `{{spec_notation}}` | notation observed by code (units, symbols) |

## System prompt

```text
[P-IN-00 shared rules]
Derive a board style profile from real papers.
```

## User prompt template

```text
<items>{{sample_items}}</items>
<code_observed_notation>{{spec_notation}}</code_observed_notation>
Describe how this board writes questions: paper structure, command-word usage with typical marks and phrasing, notation (units, decimal style, state symbols, spelling), typical context types, six-mark scheme format and fixed phrases (exact repeated phrases). List the evidence paper ids. Only assert what the items show.
```

## Notes for developers

- Output stored on `board_style_profile` as a draft; M-02 approval required before generation may use it (D-25 grounding).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
