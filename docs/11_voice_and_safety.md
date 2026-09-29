# 11 · Voice & Safety

## Voice (D-05, D-20)
- **Consent:** per-child `voice_consent` by parent (J-06); revocable (`CON-04`); parent toggle in H-09; flag `voice_tutor`. No mic access without consent.
- **Transport:** browser mic → WebSocket `VOX-02` (PCM/Opus chunks) → voice-service: VAD/endpointing → STT via gateway (Google Chirp 2, en-GB) → text pipeline identical to chat (P-SF-01 → P-TU-01 + P-VO-01 → P-SF-02) → TTS via gateway (Chirp 3 HD) → audio chunks back. Barge-in cancels current TTS/LLM.
- **Latency budget:** endpoint→STT final ≤ 400 ms; LLM first token ≤ 700 ms; first audio ≤ 1.5 s. Small tier for simple confirmations if eval allows.
- **Data:** audio not retained (`voice.retain_audio` false); transcript 30 d (`retention.tutor_voice_days`), parent-visible (TRN-01/02); summary P-VO-02; Google receives audio (the single personal-data path — disclosed in sub-processor list and consent text).
- **Errors (J-06):** mic denied, no connectivity (`VOX-04` check), STT failure → `VOX-05` fallback to text; UI states for each.
- **Safety in voice:** sentence-buffered output check; scripted safeguarding messages are pre-synthesised audio files.

## Safety layers
1. **Code rules:** PII regex (phone/email/postcode/social handles) on learner input → redact + gentle warning; link/URL blocking; profanity lists; length caps; rate limits.
2. **P-SF-01** on every learner message (fail-closed). 3. **P-SF-02** on every tutor reply. 4. **P-SF-03** on shared decks. 5. **Humans:** DSL console (L-04/Q-05).
- **Scripted responses:** `ai_prompts/safety/safeguarding_templates.md` (never model-generated). Content owned by client's DSL/legal; helpline numbers configurable & re-verified per release.
- **DSL workflow & SLAs:** IMMEDIATE 15 min / SAME_DAY 4 h / ROUTINE 24 h (configurable; confirm with client). Escalation creates `safeguarding_disclosure_log`; DSL actions in `safeguarding_action`; all views audited. Schools: notify school safeguarding contact per DPA/KCSIE pack (O-03).
- **Metrics:** recall/precision on safety gold set, time-to-triage, false-positive rate (Q-05).
- **Staff safeguarding:** DBS via uCheck (D-10) for reviewers/DSL/support with access to child content (`staff_vetting_record`, PLT-05/06); access blocked until vetted.
- **AADC/OSA:** high-privacy defaults (L-03), no profiling for marketing, age assurance (D-09), no dark patterns, child-friendly language.
