# P-QG-02 · Item generator (non-numeric items)

| Field | Value |
|---|---|
| Prompt ID | P-QG-02 |
| Version | 1.0.0 |
| Model tier | `qg.generate` (large) · temperature 0.9 where supported |
| Runs | Per blueprint where `is_numeric = false`. Numeric blueprints go to P-QG-03. |
| Output schema | `schemas/question_item.schema.json` |
| Next step | Code checks → QC 1–5 |

## Inputs

| Variable | Source | Notes |
|---|---|---|
| `{{style_profile}}` | `board_style_profile` | cache block |
| `{{exemplars}}` | pgvector top-k (k = 3–5) — same spec point **and** question type; fall back to same topic, then same question type in any topic of this board | cache block. Each exemplar includes its mark scheme. Rendered with `<exemplar id="…">` |
| `{{blueprint}}` | Planner (code), `schemas/blueprint.schema.json` | JSON |
| `{{avoid_list}}` | The 10 approved bank items for this objective nearest to the blueprint (stem only) | So the model knows what already exists |
| `{{diagram_library}}` | IDs + one-line descriptions of the approved apparatus diagrams for this board (`11_diagram_policy.md`) | optional; omit when the blueprint forbids diagrams |

## User prompt

```text
<style_profile>
{{style_profile}}
</style_profile>

<exemplars>
{{exemplars}}
</exemplars>

<already_in_bank>
These questions already exist for this objective. Your question must test the objective in a
clearly different way (different context, different angle, or different reasoning step).
{{avoid_list}}
</already_in_bank>

<diagram_library>
{{diagram_library}}
</diagram_library>

<blueprint>
{{blueprint}}
</blueprint>

Task: write ONE original exam question part that meets the blueprint exactly, with its full mark scheme.

Requirements
1. Test only blueprint.objective_text, at blueprint.tier, worth exactly blueprint.marks marks,
   using blueprint.command_word, as blueprint.question_type.
2. Pitch it for blueprint.target_grade_band. Higher bands need more steps of reasoning or less
   familiar contexts — not harder vocabulary.
3. Follow the board's wording and layout conventions shown in the style profile and exemplars.
   Put any shared information the student needs in context_text; put the actual instruction in question_text.
4. MULTIPLE_CHOICE: exactly 4 options, exactly one correct. Each wrong option must come from a named
   misconception in blueprint.misconceptions, and must be wrong for a reason a mark scheme could state.
5. SHORT_ANSWER / PRACTICAL_BASED: one marking point per mark. Each point must be a single,
   observable idea a marker can find in an answer.
6. EXTENDED_WRITTEN (typically 6 marks): use a levels-of-response scheme in the board's format —
   levels with mark bands and descriptors, plus indicative content the student may use. Give at least
   2x as many indicative points as there are marks.
7. For every marking point list: accept (equivalent wordings/answers that must get credit),
   reject (answers that look close but must not get credit), ignore (harmless extra content).
   Be generous in accept — a valid answer the scheme misses is a fault.
8. model_answer must score full marks against your own scheme, written as a top-grade student would.
9. common_errors: 2–4 answers a grade 3–4 student would plausibly give, each with the marks it would earn.
10. If the question needs a diagram, request one from the library by id, or describe a chart for code
    to draw (see diagram_request in the schema). Never describe an image for an AI to generate.
11. grounding: list the exemplar ids that shaped the style, and quote the exact phrase(s) of the
    specification statement the question assesses.
12. Estimate difficulty_grade_band and the time a well-prepared student needs (seconds).
```

## Output (shape — full schema in `schemas/question_item.schema.json`)

```json
{
  "status": "ok",
  "blueprint_id": "BP-8462-4.3.1.3-O2-SA-2-45-0007",
  "question_type": "SHORT_ANSWER",
  "command_word": "Explain",
  "marks": 2,
  "context_text": "…",
  "question_text": "…",
  "options": null,
  "answer_format": "TEXT",
  "mark_scheme": {
    "scheme_type": "POINTS",
    "marking_points": [
      {"id": "M1", "marks": 1, "point": "…", "accept": ["…"], "reject": ["…"], "ignore": ["…"]}
    ],
    "levels": null,
    "indicative_content": null,
    "marking_notes": "…"
  },
  "model_answer": "…",
  "common_errors": [{"answer": "…", "marks_awarded": 0, "why": "…"}, {"answer": "…", "marks_awarded": 1, "why": "…"}],
  "diagram_request": null,
  "grounding": {"exemplar_ids": ["PP-AQA-2022-P1-Q03.2"], "spec_phrases": ["…"]},
  "self_estimate": {"difficulty_grade_band": "4-5", "time_seconds": 60}
}
```
