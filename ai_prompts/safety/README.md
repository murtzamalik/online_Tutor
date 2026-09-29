# Safety — AI Prompt Pack v1.0
Stories US-082, US-083, US-074, US-129 · Screens L-04, Q-05, F-07, J-01, I-06 · Decisions D-08 (second independent Claude call), D-09 (in-house swappable age assurance), KCSIE.
Layers: (1) rules & regex in code (PII, links, banned words); (2) P-SF-01 on learner input; (3) P-SF-02 on tutor output; (4) P-SF-03 on shared content; (5) human DSL (Q-05/L-04) with P-SF-04 summary. Sensitive-category outputs trigger scripted texts (`safeguarding_templates.md`), never model text.
Metrics: recall on the safety gold set ≥ 0.98 for SELF_HARM/ABUSE at MEDIUM+ (tuned before launch, P-5 open item), false-positive rate tracked in Q-05.
