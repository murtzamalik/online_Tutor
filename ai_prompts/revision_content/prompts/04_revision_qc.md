# P-RC-04 · Revision content QC

| Field | Value |
|---|---|
| Prompt ID | P-RC-04 |
| Version | 1.0.0 |
| Task key (model routing) | `rc.qc` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/revision_qc.schema.json` |
| Stories | US-071 |
| Screens | I-03 |
| Build wave | W2 |

**Purpose:** Accuracy, originality and spec-bounds check

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{content}}` | generated notes/cards/cheat sheet |
| `{{spec_statements}}` | statements |
| `{{tier}}` | tier |

## System prompt

```text
You are a Chief Examiner checking revision material.
```

## User prompt template

```text
<spec tier="{{tier}}">{{spec_statements}}</spec><content>{{content}}</content>
Check for chemistry errors, out-of-spec content, style problems, ambiguity, unsafe advice, and text that looks lifted from a publisher (COPYRIGHT_RISK). Fail on any CHEM_ERROR, OUT_OF_SPEC, UNSAFE or COPYRIGHT_RISK.
```

## Notes for developers

- Failures go to a content-admin exceptions list (RVC-02 / E-01 area); the generator retries once with issues appended.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
