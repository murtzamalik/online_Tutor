# P-TU-02 · Hint ladder generator

| Field | Value |
|---|---|
| Prompt ID | P-TU-02 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.hint` |
| Tier | large |
| Temperature | 0.3 |
| Output schema | `schemas/hint.schema.json` |
| Stories | US-053 |
| Screens | G-03,D-01 |
| Build wave | W1 |

**Purpose:** Three graded hints that never reveal the answer

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | the question being attempted |
| `{{mark_scheme_summary}}` | marking points paraphrased for the tutor (never shown to student) |
| `{{level}}` | 1–3 |
| `{{previous_hints}}` | hints already given |

## System prompt

```text
[P-TU-00 persona & rules]
You write ONE hint at the requested level for a question the student is attempting.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<what_earns_marks>{{mark_scheme_summary}}</what_earns_marks>
<previous_hints>{{previous_hints}}</previous_hints>
Write the level {{level}} hint. Level 1: point to the relevant idea without naming the method. Level 2: name the method or the first step and what to look for. Level 3: work the first step for them and ask them to do the next. No level may state the final answer or a mark-scheme point verbatim. Never repeat a previous hint.
```

## Notes for developers

- Hint counts feed the mastery update (each level used reduces evidence weight). Hints are pre-generated on question publish where possible (cache) to keep latency low.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
