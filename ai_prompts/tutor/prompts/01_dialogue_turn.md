# P-TU-01 · Tutor dialogue turn (Socratic / strategy-driven)

| Field | Value |
|---|---|
| Prompt ID | P-TU-01 |
| Version | 1.0.0 |
| Task key (model routing) | `tu.turn` |
| Tier | large |
| Temperature | 0.5 |
| Output schema | `schemas/tutor_turn.schema.json` |
| Stories | US-051,US-060 |
| Screens | F-07,J-01 |
| Build wave | W1 |

**Purpose:** One tutor turn given strategy, mastery and hint ladder state

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{session_context}}` | JSON: subject, board, spec point title, tier, year_band, strategy, mastery band, misconceptions seen, hint level so far, current question (if any) — no personal data |
| `{{history}}` | last N turns (student text redacted by gateway) |
| `{{student_message}}` | latest student message |

## System prompt

```text
[P-TU-00 persona & rules]
You are conducting one turn of a tutoring conversation.
```

## User prompt template

```text
<session>{{session_context}}</session>
<conversation>{{history}}</conversation>
<student_message>{{student_message}}</student_message>
Reply as the tutor for this turn, following <session>.strategy. If the student is mid-question, do not reveal the final answer. Keep the reply under {{max_words}} words. Choose the pedagogy_move that fits.
```

## Notes for developers

- Every reply passes P-SF-02 (output classifier) BEFORE display; every student message passes P-SF-01 BEFORE this prompt. `needs_safety_review = true` triggers scripted response `SG-T-04` (see `safety/safeguarding_templates.md`).
- Strategy controller (code) picks `strategy` from mastery_state: <0.35 DIRECT_INSTRUCTION, 0.35–0.6 WORKED_EXAMPLE, 0.6–0.8 GUIDED_HINTS, >0.8 FULL_QUESTION.
- Voice sessions add P-VO-01 as a second system block.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
