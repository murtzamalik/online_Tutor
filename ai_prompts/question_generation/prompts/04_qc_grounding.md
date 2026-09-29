# P-QG-04 · QC 1 — Grounding & chemistry accuracy

| Field | Value |
|---|---|
| Prompt ID | P-QG-04 |
| Version | 1.0.0 |
| Model tier | `qg.qc.grounding` (large) · temperature 0 |
| Output schema | `schemas/qc_result.schema.json` |
| Pass rule (code) | `verdict = PASS` and no issue with `severity = BLOCKER` |

The checker is a **separate call** from the generator, with no access to the generator's reasoning.
It sees the item, the spec statement and the exemplars that were used.

## Inputs

| Variable | Notes |
|---|---|
| `{{style_profile}}` | cache block |
| `{{spec_point}}` | ref, title, statement text, tier rule |
| `{{objective}}` | the blueprint objective text + tier |
| `{{exemplars_used}}` | only the exemplars listed in the item's grounding.exemplar_ids |
| `{{item}}` | the generated item JSON (for calc templates: the template **and** one rendered instance with code-computed answers) |

## User prompt

```text
<style_profile>{{style_profile}}</style_profile>
<spec_point>{{spec_point}}</spec_point>
<objective>{{objective}}</objective>
<exemplars_used>{{exemplars_used}}</exemplars_used>
<item>{{item}}</item>

You are a senior examiner for this board. Check the item and report problems. Do not rewrite it.

Check each of these and report an issue for every failure:
A. CHEMISTRY — every fact, formula, equation, state symbol, value and unit in the question, options,
   mark scheme and model answer is correct.                                   (failure = BLOCKER)
B. IN SPEC — the item only needs knowledge in this specification point or its stated prerequisites,
   at this tier. Name any out-of-spec or wrong-tier content.                  (failure = BLOCKER)
C. ASSESSES THE OBJECTIVE — answering it correctly actually requires the objective; it cannot be
   answered from general knowledge or from information given in the question alone. (BLOCKER)
D. BOARD STYLE — command word used as this board uses it; layout, notation and units follow the
   style profile.                                                              (MAJOR)
E. GROUNDING — the style is recognisably consistent with the exemplars, and the item is not a
   reworded copy of any single exemplar.                                       (MAJOR if weak style match, BLOCKER if a reworded copy)
F. CLARITY — one reasonable reading only; all information needed is given; nothing gives the answer away. (MAJOR)
G. CONTEXT & SAFETY — neutral, inclusive, safe for a school lab, no real people or brands. (BLOCKER)

For every issue give: check (A–G), severity (BLOCKER / MAJOR / MINOR), the exact text concerned,
and what is wrong in one sentence. Give verdict FAIL if there is any BLOCKER or more than one MAJOR.
Be strict: a wrong fact that slips through here reaches students.
```
