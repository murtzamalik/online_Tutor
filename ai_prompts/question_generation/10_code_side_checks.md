# Code-side checks & solver contract

Everything here is deterministic Java (Content & Question-Gen Service). No model calls.
These run **before** QC 1–5 so that model calls are not wasted on items that are structurally broken.

## 1. Order of checks per item

| # | Check | Fail action |
|---|---|---|
| C1 | JSON validates against the schema (refusal shape → `GENERATION_ERROR`) | retry generation once, then drop |
| C2 | Blueprint match: `question_type`, `command_word`, `marks` equal the blueprint | regenerate |
| C3 | Marks: sum of marking points = `marks` (POINTS); level bands cover 1..`marks` with no gaps/overlaps (LEVELS) | repair |
| C4 | MCQ: 4 options, exactly one `correct = true`, no duplicate option text | repair |
| C5 | Equations: every equation in `equation_text`, question, scheme and model answer parses and balances (element counts + charge) | repair |
| C6 | Chemistry values: any Mr/Ar written in scheme or model answer equals the value computed from the board's Ar table | repair |
| C7 | Originality: no 9-word (or longer) sequence shared with any exemplar or any past-paper item in the same spec point (after lower-casing and whitespace normalisation), excluding a whitelist of fixed exam phrases | regenerate |
| C8 | Similarity (embeddings, D-24): nearest neighbours vs approved bank and vs past papers → PASS / FAIL / GREY (→ P-QG-07). Thresholds in README §6 | regenerate |
| C9 | Readability: Flesch–Kincaid grade of `context_text + question_text` ≤ board median + 1 (median measured on ingested past papers per board) | repair |
| C10 | Diagram request: `library_id` exists for this board; CHART specs have axes and a data source | repair |

## 2. Calculation solver contract (D-26)

Input: an approved-format `calc_template`. Output: `N = calc.instances_per_template` rendered instances.

1. **Parse** every `method_steps[].expression` and `misconception_paths[].expression` with a whitelist
   parser (numbers, declared variables/constants, earlier step ids, `+ - * / ^ ( )`, `Mr()`, `Ar()`,
   `round_sf()`, `round_dp()`, `min()`, `max()`). Anything else → template rejected (repair).
2. **Resolve** `Mr("formula")` by parsing the formula (brackets and hydrates supported, e.g. `Ca(OH)2`,
   `CuSO4·5H2O`) and summing Ar values from **the board's own Ar table**. Unknown element → reject.
3. **Sample** variable values on their step grid with a seeded RNG (seed stored per instance, so an
   instance can be re-rendered exactly). Re-sample until all `constraints` hold (max 50 tries → reject).
4. **Evaluate** steps in order with `BigDecimal` (MathContext 12 significant figures). Round only where
   the expression says so, and apply `answer_rule` to the final step.
5. **Sanity rules**: final answer > 0; not equal to any input value; ≤ 4 significant figures before
   rounding is applied (keeps working clean); every misconception-path value ≠ correct value after rounding.
6. **Render** `question_text` with values formatted to the variable's step precision, plus `ar_line`.
7. **Store** per instance: variable values, every step value, final answer, misconception values
   (these become MCQ distractors and weak-answer values). These are the *only* numbers the marking
   engine will treat as correct.
8. **Accepted answers**: final value per `answer_rule`, plus the same value to one more significant
   figure (boards normally accept extra precision), with unit; ECF values for each step recomputed
   from any wrong earlier value at marking time.

## 3. Equation balancer (C5)

Parse each side into species with coefficients; count atoms per element (expand brackets); compare
element totals and total charge (ionic equations). State symbols `(s) (l) (g) (aq)` are optional but,
if present on one species, must be present on all species in that equation for boards whose style
profile says state symbols are required.

## 4. N-gram whitelist (C7)

Maintain per board in `board_style_profile.fixed_phrases_json`, e.g. "Give your answer to 3 significant
figures", "Use the Periodic Table", "Relative atomic masses (Ar):", "Tick (✓) one box". Seed it from the
ingested past papers (phrases that appear in ≥ 5 different papers).

## 5. Calibrating the similarity thresholds (C8)

Run once after ingestion, and again whenever the embedding model changes:
1. Embed all ingested past-paper items.
2. Build 200 labelled pairs per board: 100 "same question in a different paper/year" (DUPLICATE)
   and 100 "same spec point, different question" (DISTINCT), labelled by a content admin in E-02.
3. Choose `qc.dup.bank_fail` = the lowest cosine where precision for DUPLICATE ≥ 0.95,
   and `qc.dup.grey_low` = the cosine where recall for DUPLICATE ≥ 0.95. `qc.dup.pastpaper_fail` is set
   0.03 below `bank_fail` (stricter, because it is a licensing risk).
4. Store the values with the embedding model name in Q-03 config.

## 6. What code does after QC

| Outcome | Action |
|---|---|
| All checks pass | `review_status = APPROVED`; add to bank; embed; initial difficulty = `self_estimate.difficulty_grade_band` |
| Fail, repairable, attempts left | P-QG-09 → rerun per `prompts/09_repair.md` |
| Fail otherwise | `review_status = QC_FAILED`; appears in **E-01** with every `qc_check_result` row and the repair log |
| E-01 reviewer fixes | edited item re-runs C1–C10 and QC 1, 3, 5 before approval (a person's edit is not trusted blindly) |
| After ≥ 150 real responses | IRT calibration replaces the estimate; items with discrimination below the configured floor → `RETIRED` |
