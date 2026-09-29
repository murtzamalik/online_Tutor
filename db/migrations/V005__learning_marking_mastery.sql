-- =============================================================================
-- V005 — Enrolment, practice sessions, responses, mock papers, diagnostics, plans,
--        marking (results / exceptions / A-Level review / gold set / eval),
--        mastery (BKT / IRT / FSRS / predicted grade), engagement (events / nudges / surprise quiz)
-- Stories: US-013…017, 027…036, 044…060, 109/110/113/114/115, 125, 127
-- Screens: B-04…B-08, D-01…D-12, F-01…F-10, G-01…G-04, H-01…H-07
-- Privacy: the AI never receives student_id. ai_request_map (V008) links a random request token
--          to a response_id inside our own DB only.
-- =============================================================================

CREATE TABLE student_enrolment (
    enrolment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    specification_id   BIGINT NOT NULL REFERENCES specification(specification_id),
    tier               TEXT CHECK (tier IN ('FOUNDATION','HIGHER','CORE','EXTENDED','SINGLE_TIER')),
    goal_type          TEXT NOT NULL DEFAULT 'EXAM_PREP' CHECK (goal_type IN ('EXAM_PREP','GENERAL_STUDY','TARGET_SCORE','WEAK_AREA')),
    goal_detail_json   JSONB,                                -- {"weak_topic_ids":[...]}
    target_grade       TEXT,                                 -- parent-set (B-08)
    exam_date          DATE,
    baseline_completed_at TIMESTAMPTZ,
    status             TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','ENDED')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, specification_id)
);
CREATE TRIGGER trg_enrolment_updated BEFORE UPDATE ON student_enrolment FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------- sessions
CREATE TABLE practice_session (
    session_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    enrolment_id    UUID NOT NULL REFERENCES student_enrolment(enrolment_id),
    mode            TEXT NOT NULL CHECK (mode IN ('TOPIC','MIXED','WRONG_ONLY','TARGET_GRADE','QUICK_CHECK','SURPRISE','DIAGNOSTIC','ENTRANCE_TEST','ASSIGNMENT','REVIEW_DUE','MULTI_VERSION','MOCK')),
    topic_ids       BIGINT[],
    planned_count   SMALLINT,
    target_grade    TEXT,
    assignment_id   UUID,                                    -- FK added in V011
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','ABANDONED')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    client_platform TEXT                                     -- WEB, IOS, ANDROID
);
CREATE INDEX ix_session_student ON practice_session(student_id, started_at DESC);

CREATE TABLE session_question (
    session_question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES practice_session(session_id) ON DELETE CASCADE,
    seq             SMALLINT NOT NULL,
    question_id     BIGINT NOT NULL REFERENCES question(question_id),
    selection_reason_json JSONB,                             -- why this item: mastery, FSRS due, wrong-again, stretch…
    served_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, seq)
);

CREATE TABLE answer_photo (
    photo_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    storage_key     TEXT NOT NULL,                           -- MASKED image only; the original is never stored server-side
    mask_report_json JSONB NOT NULL,                         -- {"header_masked":true,"regions":[…],"user_confirmed_crop":true}
    purpose         TEXT NOT NULL CHECK (purpose IN ('ANSWER','PRINTED_PAPER_PAGE','STUCK_QUESTION')),
    retention_until TIMESTAMPTZ NOT NULL,                    -- 30 days (disputes), then deleted by job
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- mock papers (D-02, D-03, D-11)
CREATE TABLE mock_paper (
    mock_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    enrolment_id      UUID NOT NULL REFERENCES student_enrolment(enrolment_id),
    source_kind       TEXT NOT NULL CHECK (source_kind IN ('GENERATED','REAL_PAPER')),
    past_paper_id     BIGINT REFERENCES past_paper(paper_id),
    spec_unit_id      BIGINT REFERENCES spec_unit(unit_id),
    tier              TEXT,
    duration_minutes  SMALLINT NOT NULL,
    extended_time_pct SMALLINT NOT NULL DEFAULT 0,           -- J-04
    structure_json    JSONB NOT NULL,
    status            TEXT NOT NULL DEFAULT 'SETUP' CHECK (status IN ('SETUP','IN_PROGRESS','SUBMITTED','MARKING','MARKED','EXPIRED')),
    started_at        TIMESTAMPTZ,
    deadline_at       TIMESTAMPTZ,
    submitted_at      TIMESTAMPTZ,
    total_marks       SMALLINT,
    score             NUMERIC(6,1),
    result_json       JSONB,                                 -- topic breakdown for D-11
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mock_paper_item (
    mock_id      UUID NOT NULL REFERENCES mock_paper(mock_id) ON DELETE CASCADE,
    seq          SMALLINT NOT NULL,
    section      TEXT,
    question_id  BIGINT NOT NULL REFERENCES question(question_id),
    marks        SMALLINT NOT NULL,
    PRIMARY KEY (mock_id, seq)
);

CREATE TABLE diagnostic_run (
    diagnostic_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID NOT NULL UNIQUE REFERENCES practice_session(session_id),
    enrolment_id   UUID NOT NULL REFERENCES student_enrolment(enrolment_id),
    status         TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED','ABANDONED')),
    theta          NUMERIC(6,3),
    theta_se       NUMERIC(6,3),
    result_json    JSONB,                                    -- per-topic starting mastery + recommended start tier (B-06 results, US-015)
    completed_at   TIMESTAMPTZ
);

CREATE TABLE entrance_test_run (
    run_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID NOT NULL UNIQUE REFERENCES practice_session(session_id),
    exam_type      TEXT NOT NULL CHECK (exam_type IN ('GRAMMAR','INDEPENDENT','ISEB','CAT4','OTHER')),
    status         TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED','ABANDONED')),
    ability_estimate NUMERIC(6,3),
    result_json    JSONB,
    completed_at   TIMESTAMPTZ
);

CREATE TABLE daily_goal (
    student_id       UUID PRIMARY KEY REFERENCES student_profile(student_id) ON DELETE CASCADE,
    target_questions SMALLINT NOT NULL DEFAULT 10,
    enabled          BOOLEAN NOT NULL DEFAULT TRUE,           -- goal tile ON; nudges are separate opt-in (parent_ai_controls.daily_goal_nudge)
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_goal_progress (
    student_id  UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    day         DATE NOT NULL,
    answered    SMALLINT NOT NULL DEFAULT 0,
    target      SMALLINT NOT NULL,
    PRIMARY KEY (student_id, day)
);

CREATE TABLE weekly_plan (
    plan_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    enrolment_id   UUID NOT NULL REFERENCES student_enrolment(enrolment_id),
    week_start     DATE NOT NULL,
    rationale_text TEXT,                                     -- written by AI task RP-04 from anonymous stats; plan itself is built by code
    status         TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUPERSEDED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, enrolment_id, week_start)
);

CREATE TABLE weekly_plan_item (
    item_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id       UUID NOT NULL REFERENCES weekly_plan(plan_id) ON DELETE CASCADE,
    day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    topic_id      BIGINT REFERENCES spec_topic(topic_id),
    activity_kind TEXT NOT NULL CHECK (activity_kind IN ('PRACTICE','REVIEW','MOCK','FLASHCARDS','NOTES')),
    minutes       SMALLINT NOT NULL,
    completed_at  TIMESTAMPTZ
);

CREATE TABLE saved_quiz_set (
    set_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    topic_ids    BIGINT[] NOT NULL,
    question_count SMALLINT NOT NULL DEFAULT 10,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- responses
CREATE TABLE student_response (
    response_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id           UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    question_id          BIGINT NOT NULL REFERENCES question(question_id),
    session_id           UUID REFERENCES practice_session(session_id),
    mock_id              UUID REFERENCES mock_paper(mock_id),
    qualification_code   TEXT NOT NULL,                      -- denormalised routing key: GCSE|IGCSE|A_LEVEL|ELEVEN_PLUS
    answer_input_mode    TEXT NOT NULL CHECK (answer_input_mode IN ('TYPED','SPOKEN','PHOTO')),
    answer_text          TEXT,                               -- what the student wrote / transcript (may contain personal data; stays in our DB)
    answer_structured_json JSONB,                            -- D-12 fields: equation tokens, numeric + unit + sig figs, MCQ key
    photo_id             UUID REFERENCES answer_photo(photo_id),
    instance_id          BIGINT REFERENCES calc_instance(instance_id),
    marks_awarded        NUMERIC(5,1),
    marks_available      SMALLINT NOT NULL,
    is_correct           BOOLEAN,
    marking_mode         TEXT CHECK (marking_mode IN ('AUTO_OBJECTIVE','AI_FINAL','AI_PROVISIONAL','REVIEWER_CONFIRMED','EXCEPTION_RESOLVED','SELF_MARKED')),
    marking_status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (marking_status IN
                            ('PENDING','MARKED_FINAL','MARKED_PROVISIONAL','IN_EXCEPTION','IN_REVIEW','CONFIRMED','FAILED')),
    counts_toward_progress BOOLEAN NOT NULL DEFAULT FALSE,   -- FALSE for A-Level until reviewer confirms (F-09)
    student_confidence   TEXT CHECK (student_confidence IN ('LOW','MEDIUM','HIGH')),
    time_on_question_ms  INTEGER,
    answer_change_count  SMALLINT NOT NULL DEFAULT 0,
    hint_level_used      SMALLINT NOT NULL DEFAULT 0,
    disputed             BOOLEAN NOT NULL DEFAULT FALSE,
    responded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    marked_at            TIMESTAMPTZ
);
CREATE INDEX ix_response_student ON student_response(student_id, responded_at DESC);
CREATE INDEX ix_response_student_q ON student_response(student_id, question_id);
CREATE INDEX ix_response_status ON student_response(marking_status) WHERE marking_status IN ('PENDING','IN_EXCEPTION','IN_REVIEW');
CREATE INDEX ix_response_session ON student_response(session_id);

-- ---------------------------------------------------------------- marking
-- One row per marking pass. AI passes store the per-point trail that F-05 / F-10 reviewers read.
CREATE TABLE marking_result (
    result_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id     UUID NOT NULL REFERENCES student_response(response_id) ON DELETE CASCADE,
    kind            TEXT NOT NULL CHECK (kind IN ('OBJECTIVE','AI_PASS_A','AI_PASS_B','AI_A_LEVEL','REVIEWER','EXCEPTION_FINAL','SELF_MARK','QC_MARKER')),
    is_final        BOOLEAN NOT NULL DEFAULT FALSE,          -- the row the student sees
    prompt_version  TEXT,
    model           TEXT,
    marks_total     NUMERIC(5,1) NOT NULL,
    confidence      NUMERIC(4,3),
    points_json     JSONB NOT NULL,                          -- [{id,awarded,evidence,note}] per marking point, or level decision
    trail_json      JSONB,                                   -- reasoning trail (F-05 / F-10 / Khanmigo-style visible reasoning, Design Principle 2)
    feedback_json   JSONB,                                   -- student-facing feedback (mark-scheme language) — MK-07
    misconception_code TEXT,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_mresult_response ON marking_result(response_id, created_at);

CREATE TABLE dispute (
    dispute_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id  UUID NOT NULL UNIQUE REFERENCES student_response(response_id),
    student_id   UUID NOT NULL REFERENCES student_profile(student_id),
    reason_code  TEXT NOT NULL CHECK (reason_code IN ('I_DID_INCLUDE_IT','MARK_SCHEME_ALLOWS_IT','MISREAD_MY_ANSWER','OTHER')),
    reason_text  TEXT,                                       -- free text: redacted before anything is shown to an AI-assisted tool
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marking_exception (
    exception_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id    UUID NOT NULL REFERENCES student_response(response_id),
    trigger        TEXT NOT NULL CHECK (trigger IN ('LOW_CONFIDENCE','PASS_DISAGREEMENT','STUDENT_DISPUTE','SCHEMA_FAILURE')),
    status         TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED')),
    assigned_to    UUID REFERENCES account(account_id),
    original_marks NUMERIC(5,1),
    final_marks    NUMERIC(5,1),
    resolution     TEXT CHECK (resolution IN ('UPHELD','ADJUSTED_UP','ADJUSTED_DOWN','SCHEME_GAP')),
    resolution_note TEXT,
    add_to_gold    BOOLEAN NOT NULL DEFAULT TRUE,
    dispute_id     UUID REFERENCES dispute(dispute_id),
    sla_due_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at    TIMESTAMPTZ
);
CREATE INDEX ix_exception_status ON marking_exception(status, created_at);

-- A-Level mandatory review queue (client Round 1, D-16). anonymous_ref is all a reviewer sees.
CREATE TABLE marking_review_queue (
    review_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id    UUID NOT NULL UNIQUE REFERENCES student_response(response_id),
    anonymous_ref  TEXT NOT NULL UNIQUE,
    specification_id BIGINT NOT NULL REFERENCES specification(specification_id),
    status         TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','CLAIMED','CONFIRMED','ADJUSTED')),
    ai_marks       NUMERIC(5,1) NOT NULL,
    final_marks    NUMERIC(5,1),
    claimed_by     UUID REFERENCES account(account_id),
    claimed_at     TIMESTAMPTZ,
    decided_by     UUID REFERENCES account(account_id),
    decided_at     TIMESTAMPTZ,
    decision_note  TEXT,
    due_at         TIMESTAMPTZ NOT NULL,                     -- created_at + 48h (US-113/114)
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_review_queue ON marking_review_queue(status, due_at);

CREATE TABLE gold_set_item (
    gold_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id       BIGINT NOT NULL REFERENCES question(question_id),
    specification_id  BIGINT NOT NULL REFERENCES specification(specification_id),
    question_type     TEXT NOT NULL,
    answer_text       TEXT NOT NULL,                         -- REDACTED text only (no personal data ever enters the gold set)
    answer_photo_key  TEXT,
    examiner_points_json JSONB NOT NULL,                     -- per marking point awarded by the examiner
    examiner_total    NUMERIC(5,1) NOT NULL,
    examiner_ref      TEXT,                                  -- external examiner identifier, not personal name
    origin            TEXT NOT NULL CHECK (origin IN ('EXAMINER_SUPPLIED','EXCEPTION_RESOLUTION','A_LEVEL_REVIEW','SYNTHETIC')),
    is_holdout        BOOLEAN NOT NULL DEFAULT FALSE,        -- never used to tune prompts
    verified          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_gold_spec ON gold_set_item(specification_id, question_type);

-- prompt_version and the eval tables are created in V006 (AI platform).

-- ---------------------------------------------------------------- mastery
CREATE TABLE bkt_params (
    topic_id   BIGINT PRIMARY KEY REFERENCES spec_topic(topic_id),
    p_init     NUMERIC(5,4) NOT NULL DEFAULT 0.2,
    p_learn    NUMERIC(5,4) NOT NULL DEFAULT 0.15,
    p_slip     NUMERIC(5,4) NOT NULL DEFAULT 0.1,
    p_guess    NUMERIC(5,4) NOT NULL DEFAULT 0.2,
    fitted_at  TIMESTAMPTZ
);

CREATE TABLE mastery_state (
    mastery_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id            UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    topic_id              BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    model_type            TEXT NOT NULL DEFAULT 'BKT' CHECK (model_type IN ('BKT','DKT')),
    mastery_probability   NUMERIC(5,4) NOT NULL CHECK (mastery_probability BETWEEN 0 AND 1),
    mastery_level         SMALLINT NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 3),  -- 0 starting,1 building,2 secure,3 mastered (Design System §4.2)
    irt_theta             NUMERIC(6,3),
    irt_se                NUMERIC(6,3),
    attempts_count        INTEGER NOT NULL DEFAULT 0,
    correct_count         INTEGER NOT NULL DEFAULT 0,
    fsrs_stability        NUMERIC(10,4),
    fsrs_difficulty       NUMERIC(6,4),
    next_review_due_at    TIMESTAMPTZ,
    last_response_at      TIMESTAMPTZ,
    calibration_bias      NUMERIC(5,4),                      -- stated confidence minus accuracy (over/under-confidence, US-056)
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, topic_id, model_type)
);
CREATE INDEX ix_mastery_due ON mastery_state(student_id, next_review_due_at);

CREATE TABLE misconception_observation (
    observation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    response_id      UUID NOT NULL REFERENCES student_response(response_id) ON DELETE CASCADE,
    topic_id         BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    misconception_code TEXT NOT NULL,
    plain_english    TEXT NOT NULL,                          -- H-02 wording, produced by MK-08 / RP-03
    occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_misc_student ON misconception_observation(student_id, occurred_at DESC);

CREATE TABLE predicted_grade_snapshot (
    snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    enrolment_id    UUID NOT NULL REFERENCES student_enrolment(enrolment_id),
    grade_low       TEXT NOT NULL,
    grade_high      TEXT NOT NULL,
    grade_point     TEXT,
    confidence      NUMERIC(4,3),
    method_version  TEXT NOT NULL,
    inputs_json     JSONB NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_pgs_student ON predicted_grade_snapshot(student_id, computed_at DESC);

CREATE TABLE cohort_benchmark_snapshot (
    snapshot_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id  BIGINT NOT NULL REFERENCES specification(specification_id),
    topic_id          BIGINT REFERENCES spec_topic(topic_id),
    period            TEXT NOT NULL,                         -- '2026-10'
    percentile_edges_json JSONB NOT NULL,                    -- only published when n >= 50 (k-anonymity)
    sample_size       INTEGER NOT NULL,
    computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flashcard_state (
    student_id      UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    card_id         UUID NOT NULL REFERENCES flashcard(card_id) ON DELETE CASCADE,
    stability       NUMERIC(10,4) NOT NULL,
    difficulty      NUMERIC(6,4) NOT NULL,
    reps            INTEGER NOT NULL DEFAULT 0,
    lapses          INTEGER NOT NULL DEFAULT 0,
    due_at          TIMESTAMPTZ NOT NULL,
    last_review_at  TIMESTAMPTZ,
    PRIMARY KEY (student_id, card_id)
);

CREATE TABLE flashcard_review (
    review_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    card_id      UUID NOT NULL REFERENCES flashcard(card_id) ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),     -- FSRS: again/hard/good/easy
    reviewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- engagement (no webcam, behavioural only)
CREATE TABLE engagement_event (
    event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    session_id        UUID REFERENCES practice_session(session_id),
    event_type        TEXT NOT NULL CHECK (event_type IN (
        'QUESTION_SHOWN','FIRST_INPUT','ANSWER_CHANGED','IDLE_DETECTED','TAB_HIDDEN','TAB_VISIBLE',
        'HINT_REQUESTED','HINT_OFFERED','FOCUS_SHIFT_OFFERED','FOCUS_SHIFT_ACCEPTED','CONFUSION_RESCUE_TRIGGERED',
        'SURPRISE_QUIZ_SERVED','CONFIDENCE_PROMPT_SHOWN','CONFIDENCE_GIVEN','BREAK_SUGGESTED')),
    related_topic_id  BIGINT REFERENCES spec_topic(topic_id),
    related_question_id BIGINT REFERENCES question(question_id),
    event_metadata_json JSONB,
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_engagement_student_time ON engagement_event(student_id, occurred_at DESC);
-- Retention: rows older than 90 days are aggregated into engagement_daily and deleted (data minimisation, US-085).

CREATE TABLE engagement_daily (
    student_id     UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    day            DATE NOT NULL,
    minutes_active NUMERIC(6,1) NOT NULL DEFAULT 0,
    questions_answered SMALLINT NOT NULL DEFAULT 0,
    idle_events    SMALLINT NOT NULL DEFAULT 0,
    nudges_offered SMALLINT NOT NULL DEFAULT 0,
    nudges_accepted SMALLINT NOT NULL DEFAULT 0,
    engagement_score NUMERIC(5,2),
    PRIMARY KEY (student_id, day)
);

CREATE TABLE nudge (
    nudge_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    session_id    UUID REFERENCES practice_session(session_id),
    kind          TEXT NOT NULL CHECK (kind IN ('HINT','EASIER_WARMUP','TOPIC_SWITCH','BREAK','CONFUSION_RESCUE','CONFIDENCE_CHECK')),
    trigger_json  JSONB NOT NULL,
    status        TEXT NOT NULL DEFAULT 'OFFERED' CHECK (status IN ('OFFERED','ACCEPTED','DISMISSED','EXPIRED')),
    return_token  TEXT,                                      -- "back to where I was" (US-053)
    offered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at  TIMESTAMPTZ
);

CREATE TABLE surprise_quiz (
    quiz_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    session_id     UUID REFERENCES practice_session(session_id),
    topic_ids      BIGINT[] NOT NULL,
    reason         TEXT NOT NULL CHECK (reason IN ('NOT_RECENTLY_TOUCHED','MARKED_SECURE_CHECK','AVOIDED_TOPIC')),
    status         TEXT NOT NULL DEFAULT 'SERVED' CHECK (status IN ('SERVED','COMPLETED','SKIPPED','EXPIRED')),
    result_json    JSONB,                                    -- belief delta per topic
    served_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);
