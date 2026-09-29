# Worked example — AQA GCSE Chemistry (8462), topic 4.3 Quantitative chemistry

Purpose: show developers and testers exactly what flows between the stages for one non-numeric item and
one calculation template. Values are illustrative; spec statements are **paraphrased** here — ingestion
(E-02) loads the official wording from AQA's published specification and that is what the prompts receive.

---

## Part A · Non-numeric item — 4.3.1.3 Mass changes when a reactant or product is a gas

### A1. Objective (from P-QG-01, stored in `spec_point_objective`)

```json
{"objective_id":"O2","objective_text":"Explain an observed change in mass in an open system in terms of a gaseous product escaping.",
 "assessment_objective":"AO2","tier":"BOTH","allowed_question_types":["SHORT_ANSWER","MULTIPLE_CHOICE"],
 "allowed_command_words":["Explain","Give"],"mark_range":[1,3],"is_numeric":false,
 "misconceptions":["Thinks mass is destroyed in the reaction","Thinks the solid evaporates","Does not link the gas to leaving the container"],
 "prerequisites":["Conservation of mass","States of matter"]}
```

### A2. Blueprint (built by the planner — a gap: only 4 approved SHORT_ANSWER items at band 4-5)

```json
{"blueprint_id":"BP-8462-4.3.1.3-O2-SA-2-45-0007","board":"AQA","qualification":"GCSE","spec_code":"8462",
 "spec_point_ref":"4.3.1.3","spec_point_text":"(paraphrased) Some reactions appear to change mass in an unsealed container because a reactant or product is a gas; explain these changes using the particle model.",
 "objective_id":"O2","objective_text":"Explain an observed change in mass in an open system in terms of a gaseous product escaping.",
 "assessment_objective":"AO2","tier":"BOTH","question_type":"SHORT_ANSWER","command_word":"Explain","marks":2,
 "target_grade_band":"4-5","variant_kind":"CONTEXT_TRANSFER","context_hint":null,
 "misconceptions":["Thinks mass is destroyed in the reaction","Thinks the solid evaporates","Does not link the gas to leaving the container"],
 "is_numeric":false,"allow_diagram":false,"exemplar_ids":["PP-AQA-2019-P1H-Q02.3","PP-AQA-2021-P1F-Q05.2","PP-AQA-2022-P1F-Q04.4"]}
```

### A3. Generated item (P-QG-02, first version)

```json
{"status":"ok","blueprint_id":"BP-8462-4.3.1.3-O2-SA-2-45-0007","question_type":"SHORT_ANSWER","command_word":"Explain","marks":2,
 "context_text":"A student heated copper carbonate in an open boiling tube.\nThe equation for the reaction is:\nCuCO3 → CuO + CO2",
 "question_text":"The mass of the solid in the boiling tube decreased.\nExplain why.",
 "options":null,"answer_format":"TEXT",
 "mark_scheme":{"scheme_type":"POINTS","marking_points":[
   {"id":"M1","marks":1,"point":"carbon dioxide (gas) is produced","accept":["CO2 is produced","a gas is produced"],"reject":["oxygen is produced"],"ignore":["copper oxide is produced"]},
   {"id":"M2","marks":1,"point":"the gas escapes into the air","accept":["the gas escapes"],"reject":["the solid evaporates","mass is destroyed"],"ignore":[]}],
   "levels":null,"indicative_content":null,"marking_notes":"M2 must refer to the gas leaving the tube."},
 "model_answer":"Carbon dioxide gas is produced, which escapes from the open boiling tube into the air.",
 "common_errors":[{"answer":"Because the copper carbonate burns away.","marks_awarded":0,"why":"No gas identified; 'burns away' implies mass destroyed."},
                  {"answer":"A gas is made in the reaction.","marks_awarded":1,"why":"M1 only; does not say the gas leaves."}],
 "diagram_request":null,
 "grounding":{"exemplar_ids":["PP-AQA-2021-P1F-Q05.2"],"spec_phrases":["a product is a gas","unsealed container"]},
 "self_estimate":{"difficulty_grade_band":"4-5","time_seconds":60}}
```

### A4. Checks

| Check | Result |
|---|---|
| C1–C10 (code) | PASS — equation balances (Cu 1/1, C 1/1, O 3/3); nearest bank item cosine 0.71, nearest past paper 0.79 (< grey_low) |
| QC 1 grounding (P-QG-04) | PASS — no issues |
| QC 2 blind tag (P-QG-05) | PASS — best 4.3.1.3 (0.91), runner-up 4.3.1.1 (0.22), tier BOTH |
| QC 3 mark scheme (P-QG-06) | PASS with MINOR: "M2 accept list is short" |
| QC 5 answerability | **FAIL** `STRONG_NOT_FULL` — strong run 2 answered *"Carbon dioxide is given off and is lost from the tube, so the mass goes down."* → marker gave M1 only; `scheme_gap = true`, quote "is lost from the tube" |

### A5. Repair (P-QG-09) → re-check

Issues passed in: QC 5 `STRONG_NOT_FULL` + QC 3 MINOR. Repair changes only M2:

```json
{"id":"M2","marks":1,"point":"the gas escapes / leaves the (open) boiling tube",
 "accept":["the gas escapes","CO2 is lost / released / given off into the air","the gas leaves the tube"],
 "reject":["the solid evaporates","mass is destroyed","the copper oxide escapes"],"ignore":["so the mass goes down"]}
```
`repair_log`: ["M2: widened accept list to credit 'lost/released/given off into the air' (QC5 scheme gap)"].

Re-run C1–C10, QC 3, QC 5 → all PASS (strong 2/2 both runs; weak answer for "mass is destroyed" = 0/2,
weak answer for "does not link gas to leaving" = 1/2). → `APPROVED`.

---

## Part B · Calculation template — 4.3.2.2 Amounts of substances in equations (Higher tier only)

### B1. Template (P-QG-03)

```json
{"status":"ok","blueprint_id":"BP-8462-4.3.2.2-O1-CALC-3-67-0003",
 "context_text":"Calcium carbonate decomposes when heated strongly.\nThe equation for the reaction is:\nCaCO3 → CaO + CO2",
 "question_text":"A student heated {{m_caco3}} g of calcium carbonate until it had completely decomposed.\nCalculate the mass of calcium oxide produced.\nGive your answer to 3 significant figures.",
 "ar_line":"Relative atomic masses (Ar): C = 12   O = 16   Ca = 40",
 "equation_text":"CaCO3 → CaO + CO2",
 "variables":[{"name":"m_caco3","min":5,"max":50,"step":0.5,"unit":"g"}],
 "constants":[],
 "method_steps":[
   {"id":"S1","description":"Mr of CaCO3","expression":"Mr(\"CaCO3\")"},
   {"id":"S2","description":"moles of CaCO3","expression":"m_caco3 / S1"},
   {"id":"S3","description":"moles of CaO (1:1 ratio)","expression":"S2"},
   {"id":"S4","description":"mass of CaO","expression":"S3 * Mr(\"CaO\")"}],
 "answer_rule":{"rounding":"SF","places":3,"unit":"g"},
 "marking_points":[
   {"id":"M1","marks":1,"step_ref":"S2","point":"moles of CaCO3 = mass / 100","ecf":false},
   {"id":"M2","marks":1,"step_ref":"S4","point":"moles × 56 (Mr of CaO)","ecf":true},
   {"id":"M3","marks":1,"step_ref":"S4","point":"answer to 3 significant figures","ecf":true}],
 "full_marks_for_correct_answer_alone":true,
 "constraints":[],
 "misconception_paths":[
   {"error":"Assumes mass is conserved in the solid (1:1 by mass)","expression":"m_caco3"},
   {"error":"Uses Mr of CO2 instead of CaO","expression":"m_caco3 / Mr(\"CaCO3\") * Mr(\"CO2\")"}],
 "diagram_request":null,
 "self_estimate":{"difficulty_grade_band":"6-7","time_seconds":120}}
```

### B2. Code solver — instance #1 (seed 48213)

| Item | Value |
|---|---|
| m_caco3 | 25.0 g |
| S1 = Mr(CaCO3) = 40 + 12 + 3×16 | 100 |
| S2 = 25.0 / 100 | 0.25 mol |
| S3 | 0.25 mol |
| S4 = 0.25 × Mr(CaO) = 0.25 × 56 | 14.0 g (3 sf) |
| Misconception values | 25.0 g (1:1 mass) · 11.0 g (used CO2) |
| Accepted | 14.0 g, 14 g, 14.00 g |

### B3. Checks

| Check | Result |
|---|---|
| C5 equation | CaCO3 → CaO + CO2 balances |
| C6 values | Mr 100 and 56 match AQA Ar table |
| Solver sanity | final 14.0 > 0, ≠ input, misconception values ≠ 14.0 |
| QC 1 | PASS (Higher-only content, tier HIGHER, consistent with 4.3.2.2) |
| QC 2 | PASS — best 4.3.2.2 (0.88), runner-up 4.3.2.1 (0.31), tier HIGHER |
| QC 3 | PASS — rounding rule matches "3 significant figures"; ECF stated |
| QC 4 | PASS — template cosine to nearest bank template 0.84 → grey → P-QG-07: DISTINCT ("neighbour asks for mass of CO2 from a given mass of CaO, different direction of calculation") |
| QC 5 | PASS — strong 3/3 both runs, final 14.0 g = code; weak (1:1 mass, 25.0 g) = 0/3; weak (CO2, 11.0 g) = 1/3 (M1) |

Result: template `APPROVED`; code renders 8 instances; 2 sampled instances also passed QC 3 and QC 5.
