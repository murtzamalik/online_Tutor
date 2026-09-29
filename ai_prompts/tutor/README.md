# Tutor — AI Prompt Pack v1.0
Stories US-050…US-054, US-060, US-076, US-083 · Screens F-06, F-07, F-08, G-03, G-04, J-01, J-02 · Decisions D-15, D-08 (independent safety call).

## Turn pipeline
`student message → P-SF-01 (input safety) → [flagged? scripted safeguarding response + tutor_message flag, STOP] → context builder (code: strategy, mastery, misconceptions, hint level; NO personal data) → P-TU-01 → P-SF-02 (output safety) → display / TTS`

## Rules for code
- Strategy is chosen by code (mastery-based) and passed as data; the model never decides pedagogy policy.
- Final-answer leakage guard: `reveals_final_answer = true` on a live question → discard and regenerate with a stricter instruction; second failure returns the next hint level from P-TU-02 instead.
- Parents see full transcripts (H-09); students are told this in onboarding.
- Token budget per session and daily AI time limit (parent control, PCT-02) enforced server-side.
