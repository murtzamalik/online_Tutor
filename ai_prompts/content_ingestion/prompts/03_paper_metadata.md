# P-IN-03 · Paper metadata extraction

| Field | Value |
|---|---|
| Prompt ID | P-IN-03 |
| Version | 1.0.0 |
| Task key (model routing) | `in.metadata` |
| Tier | small |
| Temperature | 0 |
| Output schema | `schemas/ingest_metadata.schema.json` |
| Stories | US-111 |
| Screens | E-02 |
| Build wave | W1 |

**Purpose:** Series, code, tier, marks, duration from the cover page

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{cover_pages}}` | first 2 pages (text/images) |

## System prompt

```text
[P-IN-00 shared rules]
Extract paper metadata from the front cover.
```

## User prompt template

```text
[cover pages]
Return board, qualification, subject, spec_code, paper_code, tier, series, year, duration, total marks, calculator allowed — ONLY when printed. Put anything inferred or absent into needs_human_verification.
```

## Notes for developers

- Human confirms metadata in E-02 before ingestion continues (paper codes are never trusted from a model alone).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
