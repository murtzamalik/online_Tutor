# Evaluation & prompt promotion (question generation)

The ≥95% gold-set gate (D-19, Q-03) is for **marking** prompts. Generation prompts use the gate below,
recorded in the same `prompt_version` / `eval_run` tables and shown in Q-03.

## Fixed evaluation set

- 30 blueprints per board-track (7 tracks → 210), fixed and versioned, covering every question type,
  both tiers, and grade bands 3–9. Built once from the pilot spec points; never used for training examples.
- 20 known-bad items per board (seeded faults: wrong fact, out-of-tier content, marks mismatch,
  over-generous scheme, near-copy of a past paper) — the **check** prompts must catch them.

## Metrics per run

| Metric | Applies to | Starting target |
|---|---|---|
| First-pass QC pass rate | P-QG-02, 03 | ≥ 70% |
| Publish rate after one repair | P-QG-02, 03, 09 | ≥ 85% |
| Seeded-fault catch rate | P-QG-04, 05, 06, 07, 08 | ≥ 95% overall, 100% on chemistry-fact faults |
| False-fail rate (good items failed) | P-QG-04 … 08 | ≤ 10% (sample of 50 approved items re-reviewed by a person) |
| E-01 human reject rate on published items (live) | whole pipeline | ≤ 3% of a weekly random sample of 20 published items |
| Student dispute rate on generated vs real past-paper items (live) | whole pipeline | generated ≤ 1.5 × real |
| Cost per published item | whole pipeline | tracked in Q-04, no target in pilot |

## Promotion rule

A new version of any prompt in this pack can go live only if, on the fixed evaluation set:
1. its primary metric (table above) improves or holds, **and**
2. no other metric gets worse by more than 2 percentage points, **and**
3. seeded chemistry-fact faults are still caught 100%.

The same rule applies when the Gateway routes a task to a different model (D-28).
