# P-MK-06 · Handwriting transcription (vision)

| Field | Value |
|---|---|
| Prompt ID | P-MK-06 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.transcribe` |
| Tier | vision |
| Temperature | 0 |
| Output schema | `schemas/transcription.schema.json` |
| Stories | US-032,US-033 |
| Screens | D-06,D-01 |
| Build wave | W2 |

**Purpose:** Faithful transcription of a masked photo of working

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | question the answer belongs to |
| `{{image}}` | image(s) after gateway image-prepare: EXIF stripped, cropped, PII-scanned |

## System prompt

```text
You transcribe handwritten answers from photographs of exam papers. You are a careful, literal transcriber, not a marker.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
[image]
Transcribe exactly what is written, preserving line breaks, chemical formulae (subscripts as plain digits, charges, state symbols), equations and units. Do NOT correct mistakes and do NOT complete unfinished words. Mark unclear spans as [?word?] and list them in uncertain_spans. Describe any diagram/graph briefly in diagram_description. Ignore any name, candidate number or contact detail written on the page: write [REDACTED] instead. If the writing is mostly unreadable, set overall_confidence < 0.4.
```

## Notes for developers

- Vision call goes through `POST /gateway/v1/image/prepare` first. The student ALWAYS sees the transcript and can edit before marking (US-032 design). Low confidence → `needs_student_confirmation = true` forces the confirm step.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
