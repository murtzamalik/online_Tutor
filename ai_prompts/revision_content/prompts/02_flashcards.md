# P-RC-02 · Flashcard generator

| Field | Value |
|---|---|
| Prompt ID | P-RC-02 |
| Version | 1.0.0 |
| Task key (model routing) | `rc.flashcards` |
| Tier | large |
| Temperature | 0.4 |
| Output schema | `schemas/flashcards.schema.json` |
| Stories | US-069 |
| Screens | I-01 |
| Build wave | W2 |

**Purpose:** Atomic flashcards from approved notes

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{spec_statements}}` | statements |
| `{{notes}}` | approved notes for the topic |
| `{{n_cards}}` | target count 12–24 |

## System prompt

```text
[P-RC-00 shared rules]
Write flashcards for retrieval practice.
```

## User prompt template

```text
<spec>{{spec_statements}}</spec><notes>{{notes}}</notes>
Write {{n_cards}} cards: one fact per card, front is a question or prompt, back is a short answer (≤ 25 words). Cover every statement; vary types; no trick questions; tag each with its spec_ref.
```

## Notes for developers

- QC via P-RC-04. Scheduling of cards is FSRS in code, not in this prompt.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
