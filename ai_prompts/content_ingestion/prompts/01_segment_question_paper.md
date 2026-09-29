# P-IN-01 · Paper page segmentation (vision)

| Field | Value |
|---|---|
| Prompt ID | P-IN-01 |
| Version | 1.0.0 |
| Task key (model routing) | `in.segment` |
| Tier | vision |
| Temperature | 0 |
| Output schema | `schemas/ingest_segment.schema.json` |
| Stories | US-111,US-029 |
| Screens | E-02 |
| Build wave | W1 |

**Purpose:** Find every question and part, its marks, stimulus and page region

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{paper_pages}}` | page images/text of the question paper (PDF pages → images via gateway) |
| `{{metadata}}` | P-IN-03 result |

## System prompt

```text
[P-IN-00 shared rules]
Segment a question paper into individual questions and parts.
```

## User prompt template

```text
<metadata>{{metadata}}</metadata>
[page images]
Split the paper into items: question number, part refs (a, b(i)…), marks (from the [n marks] label), full text, whether a diagram or table is present, whether it is a calculation, and its command word. One item per numbered question; parts nested inside. Give page ranges. Confidence per item.
```

## Notes for developers

- Vision. Code cross-checks: sum of item marks = paper total; question numbers monotonic; each part has marks. Failures go to E-02 for manual fix.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
