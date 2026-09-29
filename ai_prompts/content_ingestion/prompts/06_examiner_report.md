# P-IN-06 · Examiner-report insight extraction

| Field | Value |
|---|---|
| Prompt ID | P-IN-06 |
| Version | 1.0.0 |
| Task key (model routing) | `in.examiner_report` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/examiner_report.schema.json` |
| Stories | US-062,US-037 |
| Screens | E-02,H-02 |
| Build wave | W2 |

**Purpose:** Common errors per question/topic (feeds misconceptions)

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{report_pages}}` | examiner report pages |
| `{{items}}` | segmented items for the paper |

## System prompt

```text
[P-IN-00 shared rules]
Extract examiner-report insights about common errors.
```

## User prompt template

```text
<items>{{items}}</items>
[examiner report pages]
For each question discussed, capture the common errors and the examiner advice in your own concise words (no long quotes), plus a topic hint.
```

## Notes for developers

- Feeds the misconception catalogue and generation blueprints (`misconception` lists), never shown verbatim to students (licence).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
