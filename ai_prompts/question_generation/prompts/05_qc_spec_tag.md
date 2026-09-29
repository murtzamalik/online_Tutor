# P-QG-05 · QC 2 — Blind spec-point tagging

| Field | Value |
|---|---|
| Prompt ID | P-QG-05 |
| Version | 1.0.0 |
| Model tier | `qg.qc.tag` (small) · temperature 0 |
| Output schema | `schemas/spec_tag_result.schema.json` |
| Pass rule (code) | `best.spec_point_ref == blueprint.spec_point_ref` **and** `best.confidence ≥ qc.tag.min_confidence` **and** `tier` compatible with the blueprint tier |

The checker is **not told** which spec point the item was written for. Candidates are every level-3
spec point in the same topic, plus the two neighbouring topics, so a mis-targeted item is caught.

## Inputs

| Variable | Notes |
|---|---|
| `{{candidates}}` | list of `{ref, title, statement, tier_rule}` — shuffled order (code shuffles) |
| `{{item_text}}` | context_text + question_text + options + mark scheme points (no blueprint, no grounding block) |

## User prompt

```text
<candidate_spec_points>
{{candidates}}
</candidate_spec_points>

<item>
{{item_text}}
</item>

Decide which ONE candidate specification point this item mainly assesses — the point a student
must know to earn the marks, not points it merely mentions.

Return:
- best: {spec_point_ref, confidence 0–1, reason in one sentence}
- runner_up: {spec_point_ref, confidence 0–1} or null
- tier: FOUNDATION, HIGHER or BOTH — the lowest tier at which every mark is accessible
- secondary_refs: other candidates the item also needs (may be empty)
```
