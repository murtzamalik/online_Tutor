# P-MK-02 · GCSE/iGCSE points marker — independent Pass B

| Field | Value |
|---|---|
| Prompt ID | P-MK-02 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.pass_b` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/marking_result.schema.json` |
| Stories | US-115 |
| Screens | F-10 |
| Build wave | W1 |

**Purpose:** Independent second pass (different method, blind to A)

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | as P-MK-01 |
| `{{mark_scheme}}` | as P-MK-01 |
| `{{student_answer}}` | as P-MK-01 |
| `{{calc_facts}}` | optional |

## System prompt

```text
[P-MK-00 shared marking rules]
You are Pass B: an independent examiner. You have not seen any other marker’s decision. Work only from the material given.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<mark_scheme>{{mark_scheme}}</mark_scheme>
<code_computed_values>{{calc_facts}}</code_computed_values>
<student_answer>{{student_answer}}</student_answer>
Mark independently. Same output shape as Pass A.
```

## Notes for developers

- MUST be a separate gateway call from Pass A (no shared context). Use a different temperature seed; where a second model family is configured for `mk.pass_b`, prefer it (model-diversity reduces correlated errors). Code compares per-point awarded values.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
