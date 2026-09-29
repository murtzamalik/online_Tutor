# P-IN-02 · Mark-scheme extraction (vision)

| Field | Value |
|---|---|
| Prompt ID | P-IN-02 |
| Version | 1.0.0 |
| Task key (model routing) | `in.scheme` |
| Tier | vision |
| Temperature | 0 |
| Output schema | `schemas/ingest_scheme.schema.json` |
| Stories | US-111,US-045 |
| Screens | E-02 |
| Build wave | W1 |

**Purpose:** Structured marking points aligned to question refs

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{scheme_pages}}` | mark-scheme pages |
| `{{segmented_items}}` | P-IN-01 items for the same paper |

## System prompt

```text
[P-IN-00 shared rules]
Extract mark schemes and align them to the segmented items.
```

## User prompt template

```text
<items>{{segmented_items}}</items>
[mark scheme pages]
For each item/part return the scheme in our structure: POINTS (id M1…, marks, point, accept, reject, ignore — from ‘allow’, ‘do not accept’, ‘ignore’ columns) or LEVELS (levels with mark bands, descriptors, indicative content). Copy guidance text into notes. If a part has no scheme found, return no entry (do not invent).
```

## Notes for developers

- Code aligns by item_ref and checks marks equality; mismatches flagged to E-02.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
