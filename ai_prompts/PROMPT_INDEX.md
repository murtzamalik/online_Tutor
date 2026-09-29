# AI Prompt Index (57 registered prompts)

Single index of every prompt. Load each into `prompt_version` (V006) — one row per prompt per version. Model **tier → model** mapping lives in `model_routing` (seeded in V010, editable in Q-03), never in code. All calls go through the AI Gateway (D-15, D-28).

| ID | Title | Folder / file | Task key | Tier | Temp | Schema | Stories | Screens | Wave |
|---|---|---|---|---|---|---|---|---|---|
| P-QG-00 | Shared rules | `question_generation/prompts/00_shared_rules.md` | `qg.shared` | — | — | — | US-037 | E-01 | W1 |
| P-QG-01 | Spec-point decomposition | `question_generation/prompts/01_spec_point_decomposition.md` | `qg.decompose` | large | 0 | `schemas/spec_point_objectives.schema.json` | US-037,US-039 | M-01,E-01 | W1 |
| P-QG-02 | Item generator | `question_generation/prompts/02_item_generator.md` | `qg.generate` | large | 0.9 | `schemas/question_item.schema.json` | US-037,US-038,US-041 | E-01 | W1 |
| P-QG-03 | Calculation template generator | `question_generation/prompts/03_calc_template_generator.md` | `qg.calc_template` | large | 0.7 | `schemas/calc_template.schema.json` | US-031 | D-05,E-01 | W1 |
| P-QG-04 | QC1 grounding & chemistry accuracy | `question_generation/prompts/04_qc_grounding.md` | `qg.qc.grounding` | large | 0 | `schemas/qc_result.schema.json` | US-112 | E-01 | W1 |
| P-QG-05 | QC2 blind spec-point tagging | `question_generation/prompts/05_qc_spec_tag.md` | `qg.qc.tag` | small | 0 | `schemas/spec_tag_result.schema.json` | US-039,US-111 | E-01,E-02 | W1 |
| P-QG-06 | QC3 mark-scheme consistency | `question_generation/prompts/06_qc_mark_scheme.md` | `qg.qc.markscheme` | large | 0 | `schemas/qc_result.schema.json` | US-112 | E-01 | W1 |
| P-QG-07 | QC4 duplicate adjudication | `question_generation/prompts/07_qc_duplicate.md` | `qg.qc.duplicate` | small | 0 | `schemas/duplicate_result.schema.json` | US-112 | E-01 | W1 |
| P-QG-08a | QC5 strong solver | `question_generation/prompts/08_qc_answerability.md` | `qg.qc.solve` | large | 0.3 | `schemas/solver_answer.schema.json` | US-112 | E-01 | W1 |
| P-QG-08b | QC5 weak answer | `question_generation/prompts/08_qc_answerability.md` | `qg.qc.weak` | small | 0.7 | `schemas/solver_answer.schema.json` | US-112 | E-01 | W1 |
| P-QG-08c | QC5 QC marker (replaced by P-MK-01/03 in production) | `question_generation/prompts/08_qc_answerability.md` | `qg.qc.mark` | large | 0 | `schemas/qc_mark_result.schema.json` | US-112 | E-01 | W1 |
| P-QG-09 | Repair | `question_generation/prompts/09_repair.md` | `qg.repair` | large | 0.3 | `schemas/question_item.schema.json` | US-112 | E-01 | W1 |
| P-MK-00 | Shared marking rules | `marking/prompts/00_shared_rules.md` | `mk.shared` | — | — | — | US-044 | F-01 | W1 |
| P-MK-01 | GCSE/iGCSE points marker — Pass A | `marking/prompts/01_points_marker_pass_a.md` | `mk.pass_a` | large | 0 | `schemas/marking_result.schema.json` | US-044,US-045 | D-01,F-01,F-02 | W1 |
| P-MK-02 | GCSE/iGCSE points marker — independent Pass B | `marking/prompts/02_points_marker_pass_b.md` | `mk.pass_b` | large | 0 | `schemas/marking_result.schema.json` | US-115 | F-10 | W1 |
| P-MK-03 | Levels-of-response marker (6-mark extended) | `marking/prompts/03_levels_marker.md` | `mk.levels` | large | 0 | `schemas/marking_result.schema.json` | US-044 | D-01,F-01 | W1 |
| P-MK-04 | A-Level provisional marker with marking trail | `marking/prompts/04_alevel_provisional_marker.md` | `mk.alevel` | large | 0 | `schemas/alevel_marking_result.schema.json` | US-048,US-113,US-114 | F-09,F-05 | W2 |
| P-MK-05 | Chemistry structured-answer assist (method/ECF/equations) | `marking/prompts/05_chem_structured_assist.md` | `mk.chem_assist` | large | 0 | `schemas/chem_assist_result.schema.json` | US-110 | D-12,F-01 | W1 |
| P-MK-06 | Handwriting transcription (vision) | `marking/prompts/06_handwriting_transcription.md` | `mk.transcribe` | vision | 0 | `schemas/transcription.schema.json` | US-032,US-033 | D-06,D-01 | W2 |
| P-MK-07 | Student-facing feedback writer | `marking/prompts/07_feedback_writer.md` | `mk.feedback` | small | 0.3 | `schemas/feedback.schema.json` | US-044,US-050 | F-01,F-02 | W1 |
| P-MK-08 | Misconception classifier | `marking/prompts/08_misconception_classifier.md` | `mk.misconception` | small | 0 | `schemas/misconception.schema.json` | US-062 | H-02 | W2 |
| P-MK-09 | Exception reviewer assist | `marking/prompts/09_exception_assist.md` | `mk.exception_assist` | large | 0 | `schemas/exception_assist.schema.json` | US-115 | F-10 | W1 |
| P-TU-00 | Tutor shared persona & rules | `tutor/prompts/00_shared_rules.md` | `tu.shared` | — | — | — | US-051,US-083 | F-07,J-01 | W1 |
| P-TU-01 | Tutor dialogue turn (Socratic / strategy-driven) | `tutor/prompts/01_dialogue_turn.md` | `tu.turn` | large | 0.5 | `schemas/tutor_turn.schema.json` | US-051,US-060 | F-07,J-01 | W1 |
| P-TU-02 | Hint ladder generator | `tutor/prompts/02_hint_ladder.md` | `tu.hint` | large | 0.3 | `schemas/hint.schema.json` | US-053 | G-03,D-01 | W1 |
| P-TU-03 | Re-explain in a different format | `tutor/prompts/03_reexplain.md` | `tu.reexplain` | large | 0.5 | `schemas/reexplain.schema.json` | US-050 | F-06 | W2 |
| P-TU-04 | Explain-back evaluator | `tutor/prompts/04_explainback_eval.md` | `tu.explainback` | large | 0 | `schemas/explainback_eval.schema.json` | US-051 | F-07 | W2 |
| P-TU-05 | Confusion-rescue turn | `tutor/prompts/05_confusion_rescue.md` | `tu.rescue` | large | 0.5 | `schemas/tutor_turn.schema.json` | US-054 | G-04 | W1 |
| P-TU-06 | Photo-of-stuck-question walkthrough (vision) | `tutor/prompts/06_photo_walkthrough.md` | `tu.walkthrough` | vision | 0.3 | `schemas/walkthrough.schema.json` | US-052 | F-08 | W3 |
| P-TU-07 | Worked-example builder | `tutor/prompts/07_worked_example.md` | `tu.worked_example` | large | 0.3 | `schemas/worked_example.schema.json` | US-060 | F-07,D-01 | W2 |
| P-TU-08 | Verbal discussion tutor (English) | `tutor/prompts/08_verbal_discussion.md` | `tu.discussion` | large | 0.6 | `schemas/tutor_turn.schema.json` | US-076 | J-02 | W3 |
| P-VO-01 | Spoken-style overlay | `voice/prompts/01_spoken_style_overlay.md` | `vo.overlay` | — | — | — | US-075 | J-01 | W1 |
| P-VO-02 | Voice session summary | `voice/prompts/02_session_summary.md` | `vo.summary` | small | 0.2 | `schemas/voice_summary.schema.json` | US-116 | H-09 | W1 |
| P-SF-00 | Safety shared rules | `safety/prompts/00_shared_rules.md` | `sf.shared` | — | — | — | US-082 | Q-05 | W1 |
| P-SF-01 | Learner-input classifier | `safety/prompts/01_classify_learner_input.md` | `sf.input` | large | 0 | `schemas/safety_result.schema.json` | US-082,US-129 | J-01,F-07,Q-05 | W1 |
| P-SF-02 | Tutor-output classifier | `safety/prompts/02_classify_tutor_output.md` | `sf.output` | large | 0 | `schemas/safety_result.schema.json` | US-082 | J-01,F-07 | W1 |
| P-SF-03 | Shared-content moderation | `safety/prompts/03_classify_shared_content.md` | `sf.shared_content` | small | 0 | `schemas/safety_result.schema.json` | US-074 | I-06 | W3 |
| P-SF-04 | Disclosure summary for the DSL | `safety/prompts/04_disclosure_summary.md` | `sf.disclosure_summary` | large | 0 | `schemas/disclosure_summary.schema.json` | US-129 | Q-05,L-04 | W1 |
| P-IN-00 | Ingestion shared rules | `content_ingestion/prompts/00_shared_rules.md` | `in.shared` | — | — | — | US-111 | E-02 | W1 |
| P-IN-01 | Paper page segmentation (vision) | `content_ingestion/prompts/01_segment_question_paper.md` | `in.segment` | vision | 0 | `schemas/ingest_segment.schema.json` | US-111,US-029 | E-02 | W1 |
| P-IN-02 | Mark-scheme extraction (vision) | `content_ingestion/prompts/02_extract_mark_scheme.md` | `in.scheme` | vision | 0 | `schemas/ingest_scheme.schema.json` | US-111,US-045 | E-02 | W1 |
| P-IN-03 | Paper metadata extraction | `content_ingestion/prompts/03_paper_metadata.md` | `in.metadata` | small | 0 | `schemas/ingest_metadata.schema.json` | US-111 | E-02 | W1 |
| P-IN-04 | Specification document extraction | `content_ingestion/prompts/04_spec_extract.md` | `in.spec` | large | 0 | `schemas/spec_extract.schema.json` | US-087,US-091 | M-01,M-04 | W1 |
| P-IN-05 | Board style profile derivation | `content_ingestion/prompts/05_style_profile_derive.md` | `in.style` | large | 0.2 | `schemas/style_profile.schema.json` | US-088,US-038 | M-02 | W1 |
| P-IN-06 | Examiner-report insight extraction | `content_ingestion/prompts/06_examiner_report.md` | `in.examiner_report` | large | 0 | `schemas/examiner_report.schema.json` | US-062,US-037 | E-02,H-02 | W2 |
| P-RC-00 | Revision content shared rules | `revision_content/prompts/00_shared_rules.md` | `rc.shared` | — | — | — | US-071 | I-03 | W2 |
| P-RC-01 | Revision notes writer | `revision_content/prompts/01_revision_notes.md` | `rc.notes` | large | 0.5 | `schemas/revision_notes.schema.json` | US-071 | I-03 | W2 |
| P-RC-02 | Flashcard generator | `revision_content/prompts/02_flashcards.md` | `rc.flashcards` | large | 0.4 | `schemas/flashcards.schema.json` | US-069 | I-01 | W2 |
| P-RC-03 | Cheat-sheet generator | `revision_content/prompts/03_cheat_sheet.md` | `rc.cheatsheet` | large | 0.3 | `schemas/cheatsheet.schema.json` | US-072 | I-04 | W2 |
| P-RC-04 | Revision content QC | `revision_content/prompts/04_revision_qc.md` | `rc.qc` | large | 0 | `schemas/revision_qc.schema.json` | US-071 | I-03 | W2 |
| P-RC-05 | Simplified-language rewrite | `revision_content/prompts/05_simplify_language.md` | `rc.simplify` | small | 0.2 | `schemas/simplify.schema.json` | US-079 | J-05 | W3 |
| P-RP-00 | Reporting shared rules | `reporting/prompts/00_shared_rules.md` | `rp.shared` | — | — | — | US-063 | H-03 | W2 |
| P-RP-01 | Weekly narrative — parent | `reporting/prompts/01_weekly_parent.md` | `rp.parent` | large | 0.4 | `schemas/report_narrative.schema.json` | US-063 | H-03 | W2 |
| P-RP-02 | Weekly narrative — student | `reporting/prompts/02_weekly_student.md` | `rp.student` | small | 0.5 | `schemas/report_narrative.schema.json` | US-063 | H-03 | W2 |
| P-RP-03 | Misconception explainer for parents | `reporting/prompts/03_misconception_explainer.md` | `rp.misconception` | small | 0.3 | `schemas/misconception_explain.schema.json` | US-062 | H-02 | W2 |
| P-RP-04 | Weekly plan rationale | `reporting/prompts/04_plan_rationale.md` | `rp.plan` | small | 0.3 | `schemas/plan_rationale.schema.json` | US-016 | B-07 | W2 |
| P-RP-05 | Class insight summary (teacher) | `reporting/prompts/05_class_insight.md` | `rp.class_insight` | large | 0.3 | `schemas/class_insight.schema.json` | US-120 | O-05 | W1 |

## Packs
- `question_generation/` — bank-first generation & 5-check QC (W1)
- `marking/` — GCSE/iGCSE exception-based marking; A-Level provisional (W1; A-Level W3)
- `tutor/` — Socratic tutor, hints, explain-back (W2)
- `voice/` — spoken overlay & summary (W2)
- `safety/` — independent safety classifiers + scripted safeguarding responses (W2, but P-SF-01/02 gate any tutor go-live)
- `content_ingestion/` — past papers, mark schemes, specs, style profiles (W1)
- `revision_content/` — notes, flashcards, cheat sheets (W3)
- `reporting/` — weekly narratives, plan rationale, class insight (W2/W3)

## Rules that apply to every prompt
1. Only via the AI Gateway; the `tutor_gateway` DB role cannot read learner tables.
2. No personal data in variables; placeholders (`{{child_name}}`) substituted by code after return.
3. Structured output against the schema; validate in code; retry once.
4. Numbers are computed by code (D-26); mark totals are recomputed by code.
5. Promote a new prompt version only via the eval procedure (Q-01/Q-03, `question_generation/12_evaluation_and_promotion.md`).
6. Exact model IDs are configuration: default large/vision `claude-sonnet-5-5`, small `claude-haiku-4-5-20251001`, A-Level marking `claude-opus-5-5`; verify availability at build time.
