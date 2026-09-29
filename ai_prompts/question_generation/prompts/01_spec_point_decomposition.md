# P-QG-01 · Spec-point decomposition

| Field | Value |
|---|---|
| Prompt ID | P-QG-01 |
| Version | 1.0.0 |
| Model tier | `qg.decompose` (large) · temperature 0 |
| Runs | Once per spec point, and again only when the spec text or style profile changes |
| Output schema | `schemas/spec_point_objectives.schema.json` |
| Stored in | `spec_point_objective` |

**Why:** the planner (code) needs a fixed list of *what can be assessed* for each spec point, so that
generation fills real coverage gaps instead of producing 50 versions of the same question.
A content admin can view and edit the result in M-01.

## Inputs

| Variable | Source | Example |
|---|---|---|
| `{{board}}` | `exam_board.name` | AQA |
| `{{qualification}}` | `qualification.code` | GCSE |
| `{{spec_code}}` | `specification.code` | 8462 |
| `{{spec_point_ref}}` | `spec_topic.ref` | 4.3.2.2 |
| `{{spec_point_title}}` | `spec_topic.name` | Amounts of substances in equations |
| `{{spec_point_text}}` | `spec_topic.statement_text` (verbatim from the official spec) | … |
| `{{tier_rule}}` | `spec_topic.tier_rule` | HIGHER_ONLY |
| `{{parent_topic_context}}` | parent and sibling spec point titles | … |
| `{{style_profile}}` | `board_style_profile` rendered as text | … |

## User prompt

```text
<style_profile board="{{board}}">
{{style_profile}}
</style_profile>

<spec_point board="{{board}}" qualification="{{qualification}}" spec="{{spec_code}}" ref="{{spec_point_ref}}" tier_rule="{{tier_rule}}">
<title>{{spec_point_title}}</title>
<statement>{{spec_point_text}}</statement>
<surrounding_topics>{{parent_topic_context}}</surrounding_topics>
</spec_point>

Task: list every distinct thing a student could be examined on for this specification point,
as separate assessable objectives.

For each objective give:
- objective_text: one sentence starting with a verb a student performs
  ("Calculate the mass of a product from…", "Explain why…").
- assessment_objective: AO1 (knowledge), AO2 (apply) or AO3 (analyse/evaluate/interpret).
- tier: FOUNDATION, HIGHER or BOTH — never wider than {{tier_rule}} allows.
- allowed_question_types: from MULTIPLE_CHOICE, SHORT_ANSWER, CALCULATION, EXTENDED_WRITTEN, PRACTICAL_BASED.
- allowed_command_words: only command words this board actually uses for this kind of objective.
- mark_range: the realistic minimum and maximum marks for one question part on this objective.
- is_numeric: true if questions on this objective need a calculated answer.
- misconceptions: up to 5 specific, common student errors for this objective
  (used later for MCQ distractors and weak-answer simulation).
- prerequisites: spec content the student must already know (by title, not by reference number).

Rules:
- Cover the whole statement; do not invent objectives the statement does not support.
- Split objectives that need different skills; merge objectives that are the same skill in different words.
- Between 2 and 12 objectives.
```

## Output (shape)

```json
{
  "status": "ok",
  "spec_point_ref": "4.3.2.2",
  "objectives": [
    {
      "objective_id": "O1",
      "objective_text": "Calculate the mass of a product formed from a given mass of reactant using a balanced equation.",
      "assessment_objective": "AO2",
      "tier": "HIGHER",
      "allowed_question_types": ["CALCULATION"],
      "allowed_command_words": ["Calculate"],
      "mark_range": [2, 4],
      "is_numeric": true,
      "misconceptions": ["Uses mass ratio from the equation instead of mole ratio", "Forgets to multiply Mr by the coefficient"],
      "prerequisites": ["Relative formula mass", "The mole"]
    }
  ]
}
```
