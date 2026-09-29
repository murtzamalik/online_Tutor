# P-MK-05 · Chemistry structured-answer assist (method/ECF/equations)

| Field | Value |
|---|---|
| Prompt ID | P-MK-05 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.chem_assist` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/chem_assist_result.schema.json` |
| Stories | US-110 |
| Screens | D-12,F-01 |
| Build wave | W1 |

**Purpose:** Partial-credit and ECF decisions code cannot make

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | question |
| `{{mark_scheme}}` | scheme |
| `{{structured_answer}}` | JSON of the chemistry structured input: equation fields, working lines, value+unit, sig figs |
| `{{calc_facts}}` | optional code values |

## System prompt

```text
[P-MK-00 shared marking rules]
You analyse structured chemistry answers (equations, working, units, significant figures) and report findings for the marker. You do not award marks.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<mark_scheme>{{mark_scheme}}</mark_scheme>
<structured_answer>{{structured_answer}}</structured_answer>
<code_computed_values>{{calc_facts}}</code_computed_values>
Report: for every equation whether it is balanced (element and charge counts) and whether state symbols are present where required; which method steps from the scheme are present with the value and unit written; the ECF chain (where a later step is consistent with an earlier wrong value); significant-figure requirement vs what was given. Do not judge correctness of the final number — code does.
```

## Notes for developers

- Deterministic checks (balancing, unit parse, sig figs) are done in code first (`10_code_side_checks.md` §3); this prompt only handles what code cannot parse. Its findings are inputs to P-MK-01/03, not marks.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
