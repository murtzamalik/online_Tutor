# P-MK-03 · Levels-of-response marker (6-mark extended)

| Field | Value |
|---|---|
| Prompt ID | P-MK-03 |
| Version | 1.0.0 |
| Task key (model routing) | `mk.levels` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/marking_result.schema.json` |
| Stories | US-044 |
| Screens | D-01,F-01 |
| Build wave | W1 |

**Purpose:** Best-fit level then mark within level

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{question_for_student}}` | extended-response question |
| `{{levels_scheme}}` | levels with mark bands, descriptors and indicative content |
| `{{student_answer}}` | answer text |
| `{{board_conventions}}` | how this board applies best-fit and top/mid/bottom of band |

## System prompt

```text
[P-MK-00 shared marking rules]
You mark six-mark (levels-of-response) answers exactly as the board instructs examiners.
```

## User prompt template

```text
<question>{{question_for_student}}</question>
<levels_scheme>{{levels_scheme}}</levels_scheme>
<board_conventions>{{board_conventions}}</board_conventions>
<student_answer>{{student_answer}}</student_answer>
Method: (1) list which indicative points the answer makes with quotes; (2) decide the level by best fit to the descriptors (quality of reasoning, not just count of points); (3) choose position within the level (LOW/MID/HIGH) using the board convention; (4) give total_marks. Put the decision in level_decision with a justification that cites descriptors. One `points` entry per level criterion considered.
```

## Notes for developers

- Levels marking has lower agreement than points marking: start `mk.conf_min.levels` at 0.8 and always run P-MK-02-style second pass (call P-MK-03 twice, independent contexts).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
