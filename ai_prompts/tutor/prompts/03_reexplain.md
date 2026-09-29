# P-TU-03 · Re-explain in a different format

| Field | Value |
|---|---|
| Prompt ID | P-TU-03 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.reexplain` |
| Tier | large |
| Temperature | 0.5 |
| Output schema | `schemas/reexplain.schema.json` |
| Stories | US-050 |
| Screens | F-06 |
| Build wave | W2 |

**Purpose:** Second-attempt failure: new representation

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | the question the student was stuck on |
| `{{student_answer_summary}}` | what they wrote / their misconception, redacted |
| `{{requested_format}}` | ANALOGY|WORKED_EXAMPLE|DIAGRAM|SIMPLER|STEP_BY_STEP |
| `{{style_profile}}` | board notation |
| `{{diagram_library}}` | available diagram ids |

## System prompt

```text
[P-TU-00 persona & rules]
You re-explain a concept in a different way from the one the student has already seen.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<what_the_student_did>{{student_answer_summary}}</what_the_student_did>
<format>{{requested_format}}</format>
<diagrams>{{diagram_library}}</diagrams>
Explain the underlying idea in the requested format. Use a DIFFERENT example from the question itself (do not solve the student’s question). For DIAGRAM, request a library diagram by id or a chart spec; never describe an image for AI generation. End with one short check_question the student can answer to show they understood.
```

## Notes for developers

- Explanation is safety-classified (P-SF-02) before display; diagram_request is resolved by code only.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
