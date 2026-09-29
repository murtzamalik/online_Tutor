# P-IN-04 · Specification document extraction

| Field | Value |
|---|---|
| Prompt ID | P-IN-04 |
| Version | 1.0.0 |
| Task key (model routing) | `in.spec` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/spec_extract.schema.json` |
| Stories | US-087,US-091 |
| Screens | M-01,M-04 |
| Build wave | W1 |

**Purpose:** Level 2/3 topic tree with exact spec statements

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{spec_pages}}` | specification document pages |
| `{{board_track}}` | expected board / qualification / subject (from spec record) |

## System prompt

```text
[P-IN-00 shared rules]
Extract the specification content hierarchy.
```

## User prompt template

```text
<expected>{{board_track}}</expected>
[specification pages]
Return the unit → topic hierarchy exactly as numbered in the document (level 1 = section, 2 = sub-section, 3 = individual spec statement), the verbatim statement text, tier flags (HIGHER-only items marked), maths skills and required practicals referenced, and the command-words glossary if present.
```

## Notes for developers

- Feeds M-01 (draft tree the content admin approves). Seed data for the pilot already exists in migration V009; this prompt is for corrections and new specs.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
