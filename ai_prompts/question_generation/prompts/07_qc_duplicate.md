# P-QG-07 · QC 4 — Duplicate / near-copy adjudication

| Field | Value |
|---|---|
| Prompt ID | P-QG-07 |
| Version | 1.0.0 |
| Model tier | `qg.qc.duplicate` (small) · temperature 0 |
| Output schema | `schemas/duplicate_result.schema.json` |
| Runs | Only when code finds a neighbour in the grey zone (`qc.dup.grey_low` ≤ cosine < fail threshold). Above the fail threshold → FAIL without a model call. Below grey_low → PASS without a model call. |
| Pass rule (code) | all neighbours judged `DISTINCT` |

Two different risks, judged separately:
- **Duplicate** of an item already in our bank → wasted bank slot, repetitive practice.
- **Near-copy** of a real past-paper question → licensing risk (P-3) and breaks D-15/originality rule.

## Inputs

| Variable | Notes |
|---|---|
| `{{candidate}}` | context + question + mark scheme points |
| `{{neighbours}}` | up to 3 grey-zone neighbours, each tagged `kind="BANK"` or `kind="PAST_PAPER"` with its similarity score |

## User prompt

```text
<candidate>{{candidate}}</candidate>
<neighbours>{{neighbours}}</neighbours>

For each neighbour, decide:
- DUPLICATE: a student who has done the neighbour would effectively be doing the same question again
  (same reasoning, same kind of answer), even if the context or numbers differ slightly.
- NEAR_COPY: (past-paper neighbours only) the candidate reuses the neighbour's specific scenario,
  data, structure or distinctive wording closely enough that it reads as an adapted version of it.
- DISTINCT: tests the objective through a clearly different context, angle or reasoning step.

Give a one-sentence reason for each verdict.
```

Note: for calculation templates, compare the **template** (question text with placeholders and method
steps), not rendered instances — instances of one template are expected to be similar.
