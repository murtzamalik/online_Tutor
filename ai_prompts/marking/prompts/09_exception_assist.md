# P-MK-09 · Exception reviewer assist

| Field | Value |
|---|---|
| Prompt ID | P-MK-09 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.exception_assist` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/exception_assist.schema.json` |
| Stories | US-115 |
| Screens | F-10 |
| Build wave | W1 |

**Purpose:** Neutral summary of where two passes disagree

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | question |
| `{{mark_scheme}}` | scheme |
| `{{student_answer}}` | answer |
| `{{pass_a}}` | Pass A result |
| `{{pass_b}}` | Pass B result |
| `{{dispute_reason}}` | optional student dispute text (redacted) |

## System prompt

```text
You help a human reviewer resolve a marking exception quickly. You recommend; the human decides.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<mark_scheme>{{mark_scheme}}</mark_scheme>
<student_answer>{{student_answer}}</student_answer>
<pass_a>{{pass_a}}</pass_a><pass_b>{{pass_b}}</pass_b>
<dispute>{{dispute_reason}}</dispute>
Summarise in two sentences why the passes differ; for each conflicting point give both decisions, the key evidence and your recommendation; say if the scheme itself may be at fault (possible_scheme_issue); recommend ACCEPT_A, ACCEPT_B, ADJUST or ESCALATE_CONTENT.
```

## Notes for developers

- Shown in F-10 beside the reviewer’s own decision box; never auto-applies. Reviewer resolutions become gold-set candidates (`gold_set_item`).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
