# Scripted safeguarding responses (NOT AI-generated)

These texts are displayed by the platform when P-SF-01 returns `SCRIPTED_SUPPORT_AND_ESCALATE`. They are fixed, reviewed by the client’s DSL and legal, stored as `legal_document`-style versioned content (`app_config.safeguarding_templates`), and never produced by a model. **Placeholders marked ⟦ ⟧ must be confirmed by the client before launch (open item).**

| ID | When | Text shown to the child |
|---|---|---|
| SG-T-01 | Self-harm / hopelessness (MEDIUM+) | “Thank you for telling me. I’m an AI tutor, so I’m not the right one to help with this, but it’s important that you talk to someone who can. Please tell a trusted adult today — a parent, carer, teacher or someone at school. If you feel unsafe right now, call 999. You can also talk to Childline for free on 0800 1111, any time.” |
| SG-T-02 | Abuse / neglect / feeling unsafe at home | “I’m really glad you told me. What you’ve said is important, and you deserve to be safe. Please talk to a trusted adult — a teacher or the person in charge of looking after children at your school. You can also call Childline on 0800 1111 for free. If someone is in danger right now, call 999.” |
| SG-T-03 | Grooming risk / contact from an adult online | “Thanks for being honest. If someone is asking you to keep secrets, meet up or share pictures, that’s not okay, and it is never your fault. Tell a trusted adult today, or call Childline on 0800 1111. If you are in danger, call 999.” |
| SG-T-04 | Tutor reply flagged `needs_safety_review` | “Let’s pause the lesson for a moment. If something is worrying you, please talk to a trusted adult. When you’re ready we can carry on with your revision.” |
| SG-T-05 | Eating-disorder signals | “It sounds like things feel hard around food. I can’t help with that, but a doctor, your school nurse or Beat (0808 801 0677) can. Please talk to a trusted adult.” |
| SG-T-06 | Bullying | “I’m sorry that’s happening. It’s not your fault. Please tell a teacher or a trusted adult so they can help. You can also talk to Childline on 0800 1111.” |
| SG-P-01 | Parent notification (MEDIUM+, per policy, when the DSL decides to notify) | Sent by the DSL/ops through the console, not automatic, using template text ⟦client-approved⟧. |

Rules: (1) no model output is appended to these messages; (2) after showing a script the tutor session is paused for 60 s and the session is marked `SAFEGUARD_PAUSED`; (3) helpline numbers are config (`app_config`) and must be re-verified before each release; (4) the DSL SLA clocks start at flag creation (IMMEDIATE: 15 min, SAME_DAY: 4 h, ROUTINE: 24 h — configurable, confirm with client).
