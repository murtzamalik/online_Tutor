# P-QG-09 · Repair

| Field | Value |
|---|---|
| Prompt ID | P-QG-09 |
| Version | 1.0.0 |
| Model tier | `qg.repair` (large) · temperature 0.3 |
| Output schema | same as the item being repaired (`question_item` or `calc_template`) |
| Runs | At most `qc.repair.max_attempts` (default 1) per item. Only for failures in QC 1, 3 or 5 whose issues are specific. Not used for QC 2 (wrong spec point → regenerate from the blueprint) or QC 4 (duplicate/near-copy → regenerate). |
| After repair | Re-run **all** code checks and the QC checks that failed, plus QC 5 (a fix can break answerability). Still failing → `QC_FAILED` → E-01 |

## Inputs

| Variable | Notes |
|---|---|
| `{{style_profile}}` | cache block |
| `{{blueprint}}` | unchanged original blueprint |
| `{{item}}` | the failed item |
| `{{issues}}` | merged issues from `qc_check_result` for this item (check id, severity, text, reason, marker evidence) |

## User prompt

```text
<style_profile>{{style_profile}}</style_profile>
<blueprint>{{blueprint}}</blueprint>
<item>{{item}}</item>
<issues>{{issues}}</issues>

The item failed automated quality checks. Fix ONLY the listed issues and return the complete
corrected item in the same format.

Rules
- Keep the blueprint exactly: same objective, tier, marks, command word and question type.
- Change as little as possible; do not "improve" parts that were not flagged.
- If an issue says a valid answer was not credited, add it to the right accept list (or adjust the point).
- If an issue cannot be fixed without breaking the blueprint, return
  {"status":"cannot_complete","reason":"…"} so the item goes to a person.
- Add a repair_log: one line per issue saying what you changed.
```
