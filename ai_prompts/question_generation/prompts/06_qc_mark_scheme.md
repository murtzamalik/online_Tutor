# P-QG-06 · QC 3 — Mark-scheme consistency

| Field | Value |
|---|---|
| Prompt ID | P-QG-06 |
| Version | 1.0.0 |
| Model tier | `qg.qc.markscheme` (large) · temperature 0 |
| Output schema | `schemas/qc_result.schema.json` |
| Pass rule (code) | code checks pass (marks sum, schema) **and** `verdict = PASS` and no BLOCKER |

Code has already confirmed the marks add up and the structure is valid. This prompt checks whether
the scheme is **fair and markable** — the thing the marking engine depends on for ≥95% accuracy.

## Inputs

| Variable | Notes |
|---|---|
| `{{style_profile}}` | includes the board's mark-scheme format notes and command-word/marks conventions |
| `{{item}}` | full item (for calc: template + 2 rendered instances with code-computed values and the misconception-path wrong answers) |

## User prompt

```text
<style_profile>{{style_profile}}</style_profile>
<item>{{item}}</item>

You are the principal examiner reviewing this mark scheme before it is used by an automated marker.
Report problems; do not rewrite the scheme.

Check:
A. COMMAND WORD ↔ MARKS — the demand of the command word matches the marks and the scheme
   (e.g. "State/Give" = recall points; "Explain" needs linked reasoning; "Evaluate" needs a judgement). (MAJOR)
B. ONE IDEA PER POINT — each marking point is a single observable idea that a marker can find or
   not find in an answer. No point requires the marker to guess intent.       (BLOCKER)
C. COMPLETE — every valid answer a top student could give is credited somewhere (check accept lists).
   List specific valid answers the scheme would wrongly reject.               (BLOCKER)
D. NOT OVER-GENEROUS — no point can be earned by a vague or partly wrong answer; reject lists cover
   the obvious near-misses.                                                   (MAJOR)
E. MODEL ANSWER — scores full marks against the scheme, and no more than the marks available.  (BLOCKER)
F. COMMON ERRORS — the marks given for each common error are what the scheme would really award. (MAJOR)
G. NUMERIC (calc only) — rounding rule, units, significant figures and ECF are stated and match the
   question wording; the misconception-path answers would really score less than full marks. (BLOCKER)
H. LEVELS (extended only) — level descriptors are distinct, match the board's format, and the
   indicative content supports every level.                                   (MAJOR)
I. MCQ (only if multiple choice) — exactly one defensible correct option; every distractor is wrong
   for a stateable reason.                                                    (BLOCKER)

Return verdict FAIL for any BLOCKER or more than one MAJOR.
```
