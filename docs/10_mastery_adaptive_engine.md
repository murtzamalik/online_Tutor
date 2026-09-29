# 10 · Mastery & Adaptive Engine (code, not LLM)

Consumes `student_response` events via Redis Streams (outbox). Tables: `mastery_state`, `bkt_params`, `misconception_observation`, `predicted_grade_snapshot`, `cohort_benchmark_snapshot`, `flashcard_state`, `flashcard_review`, `daily_goal_progress`, `engagement_*`.

## 1. Knowledge tracing — BKT per (student, topic)
Parameters per topic (`bkt_params`: p_init, p_learn, p_guess, p_slip; defaults p_init 0.3, learn 0.15, guess 0.2, slip 0.1; tune by EM/grid on pilot data). Update on each scored response with evidence weight *w* (hint-level reduces *w*: L1 0.75, L2 0.5, L3 0.25; confidence calibration adjusts nothing in mastery, only recorded). Multi-point answers update using fraction correct thresholded at 0.5 or per-objective when tagged. DKT considered at scale (US-057 says graduate later) — keep the interface `MasteryModel` swappable.
Mastery bands: <0.35 LOW, 0.35–0.6 DEVELOPING, 0.6–0.8 SECURE, >0.8 MASTERED.

## 2. Item difficulty — IRT (2PL) with cold-start
Initial difficulty from `self_estimate` (grade band) and past-paper stats; after ≥ 150 real responses fit 2PL (a, b) nightly; items with discrimination below the configured floor → RETIRED (E-01 informs). Student ability θ per subject from responses; used for target-grade drills and predicted grades.

## 3. Spaced repetition — FSRS
Per flashcard *and* per topic-review item (`flashcard_state`: stability, difficulty, due). Ratings again/hard/good/easy for cards; for question reviews rating derived from result (score ≥ 0.9 good, 0.6–0.9 hard, < 0.6 again; hint use downgrades). `MAS-07 review-due` returns due items; Shell-01 shows counts.

## 4. Strategy controller (US-060) — pedagogical policy in code
Inputs: mastery band, recent error streak, hints used, time-on-task, misconceptions, target-grade gap, exam proximity. Output `strategy ∈ {DIRECT_INSTRUCTION, WORKED_EXAMPLE, GUIDED_HINTS, FULL_QUESTION}` and question selection constraints. Default mapping: LOW→DIRECT_INSTRUCTION, DEVELOPING→WORKED_EXAMPLE, SECURE→GUIDED_HINTS, MASTERED→FULL_QUESTION with harder items; overrides: 3 consecutive wrongs → step down; fatigue (session > `session.fatigue_minutes`, accuracy dropping) → suggest break (AADC-friendly, no pressure).

## 5. Question selection (`PRA-03`)
Filter approved, tier/board-appropriate, not seen within window; score = w1·(target difficulty match) + w2·(topic priority: weak/exam-weight/review-due) + w3·(misconception coverage) + w4·(variety in question type) with ε-exploration; bank-first, top-up if cell thin.

## 6. Predicted grade (H-04)
Per spec: weighted topic mastery × topic weight (paper weighting from `spec_topic`/style profile) → expected marks → grade via `grade_boundary` (latest year, tier) with **uncertainty band** from item counts and calibration; label "estimate". Show "what would move it" = top 3 topics by marginal gain. Snapshot weekly (`predicted_grade_snapshot`).

## 7. Calibration & alerts
Confidence (1–5) vs correctness → calibration curve (`MAS-06`); overconfident streak → alert. Alerts: TOPIC_DRIFT (mastery dropping > x over 14 d), INACTIVITY (> n days vs goal), ASSIGNMENT_OVERDUE, TIME_LIMIT_REACHED; ≤ 1 per kind per 7 days (H-05).

## 8. Engagement (AADC-safe)
Max `engagement.max_nudges_per_session` (3); no streak-loss/urgency mechanics (gamification off, D-21); nudges are supportive (hint / switch topic / break). Surprise quizzes (G-01) capped per day, parent-disableable.

## 9. Cohort benchmark (H-07)
Anonymised percentile within cohort (board/tier/topic); hidden unless n ≥ `cohort.min_sample_size` (50); flag `cohort_benchmark` off until then.
