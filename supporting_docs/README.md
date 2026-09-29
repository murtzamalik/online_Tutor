# Supporting documents (original client & planning material)
These are the source documents the build pack was derived from. **Where they conflict with the pack, the pack wins** (it reflects later locked decisions) — except the client's stated requirements, which are never removed (D-14).

| File | Use | Notes |
|---|---|---|
| Requirements_Baseline_v1.0_LOCKED.docx | Scope authority | LOCKED 21 Sep 2026 |
| Requirements_Lock_v1.0_Delta.xlsx | What changed in v1.0 (31 stories, 28 new + 6 revised screens, decisions, pending) | |
| User_Story_Catalogue.xlsx | 130 stories | Traced in `docs/traceability/` |
| Screen_Inventory.xlsx | 121 screens | Wired in `docs/screens/` |
| Technical_Architecture_and_Build_Prerequisites.docx | Original architecture doc | Superseded where `docs/02` differs |
| AI_Tutor_Intelligence_Layer_Brainstorm.docx | Pedagogy/AI ideas (BKT, FSRS, strategy) | Basis for `docs/10` |
| AI Learning_Website_Analysis_and_Dev_Brief_v3.docx | Original client brief | Pricing tiers, IA |
| Design_System_Visual_Language.docx, Figma_Handoff_Brief.docx | Visual language | Basis for tokens |
| GCSE_iGCSE_Chemistry_Pilot_Scaffold.xlsx | Board topic map, style profile skeleton, content-sourcing log | Seeded in V009 |
| Project_Open_Items_Tracker.xlsx | Open items + decision log | `docs/20`, `docs/02` |
| Schools_Consumer_Parallel_Launch_Safeguarding_Note.docx | B2B + safeguarding parallel launch | `docs/13`, `docs/11` |
| content_model_schema.sql | **Legacy Oracle-dialect schema — SUPERSEDED** by `db/migrations` (PostgreSQL) | Reference only |
| emial_from_client.rtf | Client email (original ask) | |
| ai_prompts/question_generation | The original QG pack (now completed and included under `/ai_prompts`) | |
| Study_Loop_UI_UX_Prototype.html, PDF design reference | Visual reference (P-10) | **Not present in the build environment — copy from your project folder** (see `copy_supporting_docs.sh`) |
