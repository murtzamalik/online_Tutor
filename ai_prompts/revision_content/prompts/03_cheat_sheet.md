# P-RC-03 · Cheat-sheet generator

| Field | Value |
|---|---|
| Prompt ID | P-RC-03 |
| Version | 1.0.0 |
| Task key (model routing) | `rc.cheatsheet` |
| Tier | large |
| Temperature | 0.3 |
| Output schema | `schemas/cheatsheet.schema.json` |
| Stories | US-072 |
| Screens | I-04 |
| Build wave | W2 |

**Purpose:** One-page structured summary

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{notes}}` | approved notes |
| `{{spec_statements}}` | statements |

## System prompt

```text
[P-RC-00 shared rules]
Condense notes into a one-page cheat sheet.
```

## User prompt template

```text
<notes>{{notes}}</notes><spec>{{spec_statements}}</spec>
Produce blocks with headings and terse bullets, key equations (mhchem), and command-word tips. Must fit one A4 page at 10pt (≈ 350 words).
```

## Notes for developers

- Rendered to PDF by code (print CSS). 
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
