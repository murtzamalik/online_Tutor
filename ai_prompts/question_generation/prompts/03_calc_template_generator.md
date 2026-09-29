# P-QG-03 · Calculation template generator (D-26)

| Field | Value |
|---|---|
| Prompt ID | P-QG-03 |
| Version | 1.0.0 |
| Model tier | `qg.calc_template` (large) · temperature 0.7 where supported |
| Runs | Per blueprint where `is_numeric = true` |
| Output schema | `schemas/calc_template.schema.json` |
| Next step | Code solver (`10_code_side_checks.md` §2) renders `calc.instances_per_template` instances → each instance goes through QC 1–5 as a normal item; QC 3 and QC 5 run on the template **and** on 2 sampled instances |

**Principle:** the model designs the question and the method; **code** picks the numbers, looks up
relative atomic masses, computes every intermediate and final value, and rounds. The model never
states a numeric answer.

## Inputs

| Variable | Source | Notes |
|---|---|---|
| `{{style_profile}}` | `board_style_profile` | cache block |
| `{{exemplars}}` | pgvector top-k, CALCULATION type | cache block |
| `{{blueprint}}` | Planner | JSON |
| `{{ar_table}}` | The board's own relative atomic mass values (from its data sheet / periodic table) | e.g. `{"H":1,"C":12,"O":16,"Cl":35.5,"Ca":40}` |
| `{{dsl_reference}}` | The expression-language reference below | cache block |
| `{{avoid_list}}` | Nearest 10 approved templates for this objective | optional |

## Expression language (pass verbatim as `{{dsl_reference}}`)

```text
Expressions may use only:
  numbers, variable names you declared, + - * / ^ ( )
  Mr("CaCO3")            relative formula mass computed by code from the board's Ar table
  Ar("Ca")               relative atomic mass from the board's Ar table
  round_sf(x, n)         round to n significant figures
  round_dp(x, n)         round to n decimal places
  min(a,b) max(a,b)
Nothing else: no functions, no loops, no units inside expressions.
Constants such as Avogadro (6.02e23) or molar gas volume (24) must be declared as constants with
the board's value.
```

## User prompt

```text
<style_profile>
{{style_profile}}
</style_profile>

<exemplars>
{{exemplars}}
</exemplars>

<ar_table>{{ar_table}}</ar_table>

<expression_language>
{{dsl_reference}}
</expression_language>

<already_in_bank>
{{avoid_list}}
</already_in_bank>

<blueprint>
{{blueprint}}
</blueprint>

Task: write a parametric calculation question TEMPLATE for this blueprint. Code will choose the
numbers and compute every answer, so you must NOT state any numeric answer.

Requirements
1. question_text uses {{variable}} placeholders for every number that changes between instances.
   Chemical formulae and equations are fixed text, not variables.
2. Declare each variable with min, max, step and unit. Choose ranges that give realistic laboratory or
   industrial quantities and "clean" working at this grade band (no answers that need more than
   4 significant figures, no negative or zero quantities).
3. Declare constants (with the board's values) and any balanced equation as fixed text in
   equation_text. The equation must be balanced; code will verify it.
4. method_steps: the exact steps an examiner expects, each with an expression in the expression
   language that code will evaluate. The last step is the final answer.
5. answer_rule: how the final answer must be rounded (significant figures or decimal places) and its unit,
   following the question wording. If the question says "Give your answer to 3 significant figures",
   the rule must match.
6. marking_points: tie each mark to a method step (step_ref). Say whether error carried forward (ECF)
   applies — for this board, a later step normally earns credit if it correctly uses a wrong earlier value.
   State that a correct final answer with no working earns full marks, unless the board's convention
   for this question style says otherwise.
7. constraints: any extra conditions on the variables (e.g. "mass_reactant > 1") that keep the chemistry sensible.
8. If the board's data sheet supplies Ar values in the question, include an ar_line to print them.
9. misconception_paths: for up to 3 common errors, write the wrong expression the student would use.
   Code evaluates these to produce realistic wrong answers (used for MCQ distractors and the weak-answer check).
```

## Output (shape — full schema in `schemas/calc_template.schema.json`)

```json
{
  "status": "ok",
  "blueprint_id": "…",
  "question_text": "A student heats {{m_caco3}} g of calcium carbonate … Calculate the mass of calcium oxide produced.",
  "ar_line": "Relative atomic masses (Ar): C = 12  O = 16  Ca = 40",
  "equation_text": "CaCO3 → CaO + CO2",
  "variables": [{"name": "m_caco3", "min": 5, "max": 50, "step": 0.5, "unit": "g"}],
  "constants": [],
  "method_steps": [
    {"id": "S1", "description": "Mr of CaCO3", "expression": "Mr(\"CaCO3\")"},
    {"id": "S2", "description": "moles of CaCO3", "expression": "m_caco3 / S1"},
    {"id": "S3", "description": "mass of CaO", "expression": "S2 * Mr(\"CaO\")"}
  ],
  "answer_rule": {"rounding": "SF", "places": 3, "unit": "g"},
  "marking_points": [
    {"id": "M1", "marks": 1, "step_ref": "S1", "point": "Mr of CaCO3 correct", "ecf": false},
    {"id": "M2", "marks": 1, "step_ref": "S2", "point": "moles of CaCO3", "ecf": true},
    {"id": "M3", "marks": 1, "step_ref": "S3", "point": "mass of CaO to 3 sf with unit", "ecf": true}
  ],
  "full_marks_for_correct_answer_alone": true,
  "constraints": [],
  "misconception_paths": [
    {"error": "Uses mass ratio 1:1", "expression": "m_caco3"}
  ],
  "self_estimate": {"difficulty_grade_band": "6-7", "time_seconds": 120}
}
```
