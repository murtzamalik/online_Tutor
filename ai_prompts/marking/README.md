# Marking Engine — AI Prompt Pack v1.0

Stories US-044…US-050, US-113, US-114, US-115 · Screens D-01, D-06, D-12, F-01, F-02, F-05, F-09, F-10, H-02 · Decisions D-17 (GCSE/iGCSE exception-based), D-16 (A-Level mandatory human review), D-19 (accuracy vs gold set), D-15, D-26.

## Flow (GCSE / iGCSE)
```
answer ─► (photo? P-MK-06 transcribe ─► student confirms) ─► code pre-checks (numeric vs calc_facts, equation balance, units)
       ─► [chem structured? P-MK-05 assist]
       ─► P-MK-01 Pass A   ─┐
       ─► P-MK-02 Pass B   ─┴─► code compare ─► agree & conf ≥ threshold & no flags ─► P-MK-07 feedback ─► result to student (target p95 < 8 s)
                                             └─► disagree / low conf / flag ─► marking_exception (F-10, P-MK-09 assist); student sees provisional result with 'being double-checked' note
       6-mark items use P-MK-03 twice instead of 01/02.
```
## Flow (A-Level, flag `a_level_review`)
`answer ─► P-MK-04 provisional + trail ─► review queue (F-05) ─► reviewer confirms/adjusts/releases ─► student sees final (F-09 shows ‘in review’ until then)`

## Rules for code (never delegated to the model)
1. Totals, per-point caps and evidence-substring checks are recomputed in code; a result failing validation is discarded and retried once, then queued as an exception.
2. Numeric answers are correct only if they equal `calc_instance` values (D-26).
3. The official mark is written to `marking_result` with prompt_version ids for both passes; changes are audited.
4. Accuracy is measured continuously against the gold set (Q-01); promotion of any marking prompt is blocked below targets in `12_evaluation_and_promotion.md` of the QG pack (same procedure).
## Files
See `prompts/` and `schemas/`. Registry: `ai_prompts/PROMPT_INDEX.md`.
