# P-VO-02 · Voice session summary

| Field | Value |
|---|---|
| Prompt ID | P-VO-02 |
| Version | 1.0.0 |
| Task key (model routing) | `vo.summary` |
| Tier | small |
| Temperature | 0.2 |
| Output schema | `schemas/voice_summary.schema.json` |
| Stories | US-116 |
| Screens | H-09 |
| Build wave | W1 |

**Purpose:** Parent-readable summary of a voice session

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{transcript}}` | redacted transcript of the voice session |
| `{{session_context}}` | topic |

## System prompt

```text
You summarise a tutoring voice session for a parent. UK English, factual, kind, no judgement of the child.
```

## User prompt template

```text
<session>{{session_context}}</session>
<transcript>{{transcript}}</transcript>
Write summary_md (max 120 words), topics_covered, strengths (max 3), next_steps (max 3). Use the placeholder {{child_name}} where the child’s name would appear. Never quote anything unrelated to learning; if the transcript contains a safeguarding flag, do not summarise that part (the DSL flow handles it).
```

## Notes for developers

- Shown in H-09 next to the transcript. Audio itself is not retained unless `voice.retain_audio` is on (default off).
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
