# P-VO-01 · Spoken-style overlay

| Field | Value |
|---|---|
| Prompt ID | P-VO-01 |
| Version | 1.0.0 |
| Task key (model routing) | `vo.overlay` |
| Tier | static system block |
| Temperature | — |
| Output schema | — |
| Stories | US-075 |
| Screens | J-01 |
| Build wave | W1 |

**Purpose:** Overlay appended to tutor prompts when channel = VOICE

## System prompt

```text
SPOKEN-STYLE OVERLAY (appended after the tutor system prompt for voice turns)
Your reply will be converted to speech. So:
- Use short spoken sentences; at most three sentences per turn unless explaining a step.
- No markdown, no bullet lists, no tables, no emojis, no URLs.
- Write chemical formulae and maths as they would be spoken in a UK classroom (say “H two S O four”, “moles per decimetre cubed”); also supply the display form in reply_display so captions look right.
- Pause cues: use a full stop or comma rather than parentheses. Ask exactly one question at the end.
- If the student interrupts (barge-in), acknowledge briefly and follow their new lead.
- Numbers: spell out small numbers; say units in words.
```

## Notes for developers

- Output schema is `tutor_turn` extended with `reply_display` (caption/transcript text). Speech synthesis: gateway `/speech/tts` (Google Chirp 3 HD en-GB). STT: `/speech/stt` (Chirp 2) with utterance boundaries from the voice-service.
- Latency budget: STT final ≤ 400 ms after end-of-speech, first LLM token ≤ 700 ms, first audio ≤ 1.5 s. Use the small tier for simple turns if quality gates allow.
- Call only through the AI Gateway (`gateway.run(promptId, version, variables, schemaRef)`); never directly from application code.
- Variables must already be redacted/tokenised by code. Names appear only as `{{child_name}}`-style placeholders that code substitutes AFTER the model returns (D-15).
- Request structured output against the schema; retry once on schema failure; log `prompt_version` id with every result.
