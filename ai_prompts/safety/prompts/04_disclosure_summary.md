# P-SF-04 · Disclosure summary for the DSL

| Field | Value |
|---|---|
| Prompt ID | P-SF-04 |
| Version | 1.0.0 |
| Task key (model routing) | `sf.disclosure_summary` |
| Tier | large |
| Temperature | 0 |
| Output schema | `schemas/disclosure_summary.schema.json` |
| Stories | US-129 |
| Screens | Q-05,L-04 |
| Build wave | W1 |

**Purpose:** Factual, non-interpretive summary for escalation

## Inputs (all required unless marked optional)

| Variable | Meaning |
|---|---|
| `{{flag_context}}` | the flagged message plus 5 turns either side, redacted |
| `{{classification}}` | P-SF-01 result |
| `{{token_map_ref}}` | opaque reference (never the data itself) |

## System prompt

```text
You help a Designated Safeguarding Lead (DSL) understand a flagged conversation quickly. You summarise; you do not advise on statutory decisions.
```

## User prompt template

```text
<conversation>{{flag_context}}</conversation>
<classification>{{classification}}</classification>
Write: headline (one line), what_was_said (neutral, factual, using the child’s words in quotes where relevant), risk_indicators, context_before_after, recommended_dsl_actions (as options for the DSL to consider under KCSIE, e.g. contact the school DSL, record and monitor, contact the parent), and urgency. No speculation; no diagnosis; no blame.
```

## Notes for developers

- The DSL sees the identity by code lookup (`ai_request_map`) — the model never does. Summary is stored on `safeguarding_disclosure_log`; every DSL view is audited.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
