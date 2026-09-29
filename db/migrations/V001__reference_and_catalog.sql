-- =============================================================================
-- V001 — Reference data, specification tree, board style profiles, catalogue
-- Target: PostgreSQL 16+ with pgvector.  Flyway migration.  Ported from the Oracle
-- content_model_schema.sql (D-03).  Conventions (apply to every migration):
--   * Reference / content tables: BIGINT identity PKs.
--   * User- and tenant-generated tables: UUID PKs (gen_random_uuid()).
--   * Enumerations are TEXT + CHECK (easy to extend in a later migration).
--   * Every table has created_at; mutable tables also have updated_at (trigger below).
--   * No personal data in reference/content tables.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. Lookups
-- -----------------------------------------------------------------------------
CREATE TABLE qualification (
    qualification_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE CHECK (code IN ('ELEVEN_PLUS','GCSE','IGCSE','A_LEVEL')),
    display_name      TEXT NOT NULL,
    typical_age_min   SMALLINT,
    typical_age_max   SMALLINT,
    visual_tier       SMALLINT NOT NULL CHECK (visual_tier BETWEEN 1 AND 3), -- 1 Foundation, 2 Core, 3 Advanced (Design System §3). Tier 4 = professional UI, not a qualification.
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_board (
    board_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,            -- AQA, EDEXCEL, OCR, EDUQAS, WJEC, EDEXCEL_INTL, CAIE
    display_name      TEXT NOT NULL,
    country_scope     TEXT,
    official_site_url TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subject (
    subject_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                TEXT NOT NULL UNIQUE,          -- CHEMISTRY, PHYSICS, BIOLOGY, COMBINED_SCIENCE, MATHS, ENGLISH_LANGUAGE, ENGLISH_LITERATURE
    display_name        TEXT NOT NULL,
    is_combined_science BOOLEAN NOT NULL DEFAULT FALSE,
    subject_profile     TEXT NOT NULL DEFAULT 'GENERIC',  -- selects the SubjectProfile plug-in (answer kit, marking rules): CHEMISTRY, MATHS, ENGLISH, PHYSICS, BIOLOGY, GENERIC
    is_pilot            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Specification (one board's version of one subject at one qualification)
-- -----------------------------------------------------------------------------
CREATE TABLE specification (
    specification_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    qualification_id     BIGINT NOT NULL REFERENCES qualification(qualification_id),
    board_id             BIGINT NOT NULL REFERENCES exam_board(board_id),
    subject_id           BIGINT NOT NULL REFERENCES subject(subject_id),
    spec_code            TEXT NOT NULL,
    title                TEXT NOT NULL,
    tier_scheme          TEXT NOT NULL CHECK (tier_scheme IN ('FOUNDATION_HIGHER','CORE_EXTENDED','SINGLE_TIER')),
    first_teaching_year  SMALLINT,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    ar_table_json        JSONB,                        -- the board's relative atomic mass table (chemistry) used by the code solver (QG code checks C6)
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (qualification_id, board_id, subject_id, spec_code)
);
CREATE TRIGGER trg_specification_updated BEFORE UPDATE ON specification FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE spec_unit (
    unit_id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id       BIGINT NOT NULL REFERENCES specification(specification_id),
    unit_code              TEXT NOT NULL,              -- 'Paper 1','Unit 2','Component 1'
    unit_name              TEXT,
    sequence_order         SMALLINT,
    assessment_weight_pct  NUMERIC(5,2),
    duration_minutes       SMALLINT,
    total_marks            SMALLINT,
    is_practical_component BOOLEAN NOT NULL DEFAULT FALSE,
    paper_structure_json   JSONB,                      -- sections, marks per section, question-type mix (drives mock paper assembly, D-02)
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (specification_id, unit_code)
);

CREATE TABLE spec_topic (
    topic_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id       BIGINT NOT NULL REFERENCES specification(specification_id),
    unit_id                BIGINT REFERENCES spec_unit(unit_id),
    parent_topic_id        BIGINT REFERENCES spec_topic(topic_id),
    topic_level            SMALLINT NOT NULL CHECK (topic_level IN (1,2,3)),  -- 1 topic, 2 subtopic, 3 spec point
    topic_number           TEXT,                       -- '4.6.1'
    topic_name             TEXT NOT NULL,
    spec_statement         TEXT,                       -- exact spec wording for level-3 points (grounding, P-QG-04)
    full_spec_reference    TEXT,                       -- 'AQA GCSE Chemistry 4.6.1 Rate of reaction'
    separate_science_only  BOOLEAN NOT NULL DEFAULT FALSE,
    higher_tier_only       BOOLEAN NOT NULL DEFAULT FALSE,
    display_order          SMALLINT,
    tagging_status         TEXT NOT NULL DEFAULT 'TODO' CHECK (tagging_status IN ('TODO','IN_PROGRESS','DONE')), -- M-04
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_spec_topic_spec ON spec_topic(specification_id);
CREATE INDEX ix_spec_topic_parent ON spec_topic(parent_topic_id);
CREATE TRIGGER trg_spec_topic_updated BEFORE UPDATE ON spec_topic FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE board_style_profile (
    style_profile_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id              BIGINT NOT NULL UNIQUE REFERENCES specification(specification_id),
    question_wording_notes        TEXT,
    mark_scheme_format_notes      TEXT,
    command_words_json            JSONB,
    typical_paper_structure_notes TEXT,
    fixed_phrases_json            JSONB,               -- n-gram whitelist (code check C7)
    units_and_notation_json       JSONB,               -- dm3 vs cm3, mol/dm3, spelling (sulfur)
    state_symbols_required        BOOLEAN NOT NULL DEFAULT TRUE,
    derived_by_prompt_version     TEXT,                -- STYLE-01 output provenance
    updated_by                    TEXT,
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Output of P-QG-01 (assessable objectives per spec point)
CREATE TABLE spec_point_objective (
    objective_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spec_topic_id           BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    objective_text          TEXT NOT NULL,
    allowed_question_types  TEXT[] NOT NULL,
    allowed_command_words   TEXT[] NOT NULL,
    mark_min                SMALLINT NOT NULL DEFAULT 1,
    mark_max                SMALLINT NOT NULL DEFAULT 6,
    tier                    TEXT,
    misconceptions_json     JSONB,
    prompt_version          TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_objective_topic ON spec_point_objective(spec_topic_id);

CREATE TABLE grade_boundary (
    boundary_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id   BIGINT NOT NULL REFERENCES specification(specification_id),
    tier               TEXT NOT NULL,
    series             TEXT NOT NULL,                  -- 'JUN2024'
    grade              TEXT NOT NULL,                  -- '9','8',..,'1' or A*-G
    min_percent        NUMERIC(5,2) NOT NULL,          -- normalised across papers (input to predicted-grade model, H-04)
    source_url         TEXT,
    UNIQUE (specification_id, tier, series, grade)
);

CREATE TABLE exam_date (
    exam_date_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    qualification_id BIGINT NOT NULL REFERENCES qualification(qualification_id),
    region           TEXT NOT NULL,                    -- England, Wales, Scotland, NI, International
    exam_name        TEXT NOT NULL,
    exam_on          DATE NOT NULL,
    notes            TEXT
);

-- -----------------------------------------------------------------------------
-- 3. Pricing catalogue (config, not code — brief v3 §6). Amounts are DATA.
-- -----------------------------------------------------------------------------
CREATE TABLE pricing_plan (
    plan_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                TEXT NOT NULL UNIQUE,          -- ENGLISH_MATHS_SCIENCE, EXAM_PREP, EXAM_PREP_PLUS
    display_name        TEXT NOT NULL,
    tab                 TEXT NOT NULL CHECK (tab IN ('AGES_7_11','GCSE_IGCSE','A_LEVEL','MICRO')),
    features_json       JSONB NOT NULL,                -- checklist for C-01 / C-04, incl. includes_mock_tests
    includes_mock_tests BOOLEAN NOT NULL DEFAULT FALSE,
    max_subjects        SMALLINT,                      -- NULL = all
    sort_order          SMALLINT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pricing_price (
    price_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_id            BIGINT NOT NULL REFERENCES pricing_plan(plan_id),
    qualification_id   BIGINT REFERENCES qualification(qualification_id),  -- NULL = applies to all in the plan's tab
    year_group         TEXT,                           -- 'Y3'..'Y13' or NULL
    billing_cycle      TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY','YEARLY')),
    amount_pence       INTEGER NOT NULL CHECK (amount_pence >= 0),
    currency           TEXT NOT NULL DEFAULT 'GBP',
    stripe_price_id    TEXT,
    school_per_pupil_pence INTEGER,                    -- D-22: same tier price for schools (invoice)
    valid_from         DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to           DATE
);
CREATE INDEX ix_price_plan ON pricing_price(plan_id, billing_cycle);

CREATE TABLE feature_flag (
    flag_key      TEXT PRIMARY KEY,
    enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    audience_json JSONB,                               -- {"roles":["PARENT"],"percent":100,"school_ids":[...]}
    description   TEXT,
    updated_by    UUID,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_config (
    config_key   TEXT PRIMARY KEY,
    value_json   JSONB NOT NULL,
    description  TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
