# Voice — AI Prompt Pack v1.0
Stories US-075, US-076, US-118 · Screens J-01, J-02, J-06, H-09 · Decisions D-05 (Google Cloud Speech), D-20 (separate voice consent; transcripts kept 30 days, parent-visible), D-15.
Voice reuses the tutor prompts (P-TU-01, P-TU-08) with the spoken-style overlay P-VO-01. Speech-to-text and text-to-speech are gateway endpoints (`GW-06`, `GW-07`), and the voice-service (Java/WebSocket) orchestrates the loop. No voice without a `voice_consent` row; audio not stored by default; redaction applies to transcripts before any model sees them.
