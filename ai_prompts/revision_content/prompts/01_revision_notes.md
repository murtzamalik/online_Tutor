# P-RC-01 · Revision notes writer

| Field | Value |
|---|---|
| Prompt ID | P-RC-01 |
| Version | 1.0.0 |
| Task key (model routing) | `rc.notes` |
| Tier | large |
| Temperature | 0.5 |
| Output schema | `schemas/revision_notes.schema.json` |
| Stories | US-071 |
| Screens | I-03 |
| Build wave | W2 |

**Purpose:** Original notes from the spec statement

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{spec_statements}}` | statements for the topic |
| `{{style_profile}}` | notation |
| `{{tier}}` | tier |
| `{{diagram_library}}` | ids |
| `{{year_band}}` | reading level |

## System prompt

```text
[P-RC-00 shared rules]
Write revision notes for one topic.
```

## User prompt template

```text
<spec>{{spec_statements}}</spec><style_profile>{{style_profile}}</style_profile><tier>{{tier}}</tier><diagrams>{{diagram_library}}</diagrams>
Write sections that cover every statement, in the order a student would learn them: explanation, key terms, a diagram request where it helps, common mistakes (from the misconception catalogue) and 3 exam tips in the board’s language. Target reading level: {{year_band}}.
```

## Notes for developers

- Output → P-RC-04 QC → APPROVED `revision_note`. Only approved notes are served (I-03). Batch-generated nightly per topic that lacks notes.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
