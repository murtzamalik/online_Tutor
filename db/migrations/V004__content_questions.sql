-- =============================================================================
-- V004 — Questions, mark schemes, past papers & ingestion, generation pipeline, QC, embeddings,
--        diagrams, revision content, marketing/help content
-- Stories: US-027…US-043, US-037…US-042, US-069…US-073, US-111/112, US-001…US-009, US-098
-- Screens: E-01, E-02, M-01, M-02, D-01, I-01…I-05, A-*, P-01
-- Contract with ai_prompts/question_generation/README.md §5 (data contract) is implemented here.
-- =============================================================================

CREATE TABLE past_paper (
    paper_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id      BIGINT NOT NULL REFERENCES specification(specification_id),
    unit_id               BIGINT REFERENCES spec_unit(unit_id),
    series                TEXT NOT NULL,                  -- 'JUN2023', 'NOV2022'
    exam_year             SMALLINT NOT NULL,
    tier                  TEXT,
    paper_code            TEXT NOT NULL,                  -- '8462/1H', '4CH1/1C', '0620/42'
    title                 TEXT,
    source_url            TEXT NOT NULL,                  -- MUST be the exam board's official site (never PMT — Requirements Baseline §3, tracker "Content sourcing")
    licence_status        TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (licence_status IN
                            ('UNKNOWN','OFFICIAL_TEACHING_USE','BOARD_LICENSED','PENDING_BOARD_CONFIRMATION','RESTRICTED')),
    licence_notes         TEXT,
    licence_evidence_key  TEXT,                            -- object-storage key of the written board confirmation (P-3)
    file_key_paper        TEXT,
    file_key_mark_scheme  TEXT,
    file_key_examiner_report TEXT,
    sha256_paper          TEXT,
    total_marks           SMALLINT,
    ingest_status         TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (ingest_status IN
                            ('NOT_STARTED','QUEUED','SEGMENTING','EXTRACTING_SCHEME','TAGGING','EMBEDDING','NEEDS_REVIEW','READY','FAILED')),
    imported_by           UUID,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (specification_id, series, paper_code)
);
CREATE INDEX ix_paper_spec ON past_paper(specification_id, exam_year);

-- calculation templates (D-26): AI writes the template, code computes numbers
CREATE TABLE calc_template (
    template_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spec_topic_id   BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    objective_id    BIGINT REFERENCES spec_point_objective(objective_id),
    template_json   JSONB NOT NULL,                        -- schemas/calc_template.schema.json
    status          TEXT NOT NULL DEFAULT 'PENDING_QC' CHECK (status IN ('PENDING_QC','APPROVED','QC_FAILED','REJECTED')),
    prompt_version  TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE diagram_asset (
    diagram_id      TEXT PRIMARY KEY,                      -- library id referenced by generators (D-27)
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('APPARATUS','STRUCTURE','GRAPH_TEMPLATE','TABLE_TEMPLATE')),
    board_scope     TEXT[],                                -- NULL = all boards
    svg_key         TEXT NOT NULL,
    alt_text        TEXT NOT NULL,                         -- accessibility: required
    approved        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question (
    question_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id       BIGINT NOT NULL REFERENCES specification(specification_id),
    topic_id               BIGINT NOT NULL REFERENCES spec_topic(topic_id),   -- level-3 once tagging is complete
    objective_id           BIGINT REFERENCES spec_point_objective(objective_id),
    source_type            TEXT NOT NULL CHECK (source_type IN ('REAL_PAST_PAPER','AI_GENERATED','AUTHORED','WEB_SOURCED')),
    source_reference       TEXT,                           -- 'AQA June 2023 Paper 1H Q4.2' | generation batch id
    past_paper_id          BIGINT REFERENCES past_paper(paper_id),
    parent_question_id     BIGINT REFERENCES question(question_id),           -- multi-part questions: 4.1 → 4.2
    part_label             TEXT,
    tier                   TEXT CHECK (tier IN ('FOUNDATION','HIGHER','CORE','EXTENDED','SINGLE_TIER')),
    difficulty_grade_band  TEXT,                           -- '4-5','7-9'
    irt_difficulty         NUMERIC(6,3),                   -- calibrated after >= 150 responses
    irt_discrimination     NUMERIC(6,3),
    marks_available        SMALLINT NOT NULL,
    question_type          TEXT NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE','SHORT_ANSWER','CALCULATION','EXTENDED_WRITTEN','PRACTICAL_BASED')),
    command_word           TEXT,
    context_text           TEXT,
    question_text          TEXT NOT NULL,
    options_json           JSONB,                          -- MCQ: [{key,text,correct,misconception}]
    answer_format          TEXT NOT NULL DEFAULT 'TEXT' CHECK (answer_format IN ('TEXT','NUMBER','EQUATION','MCQ','MULTI_FIELD','TABLE','GRAPH_POINTS')),
    answer_spec_json       JSONB,                          -- structured expectation (units, sig figs, equation species) — powers D-12 input kit + code marking
    accepts_answer_modes   TEXT[] NOT NULL DEFAULT ARRAY['TYPED'],   -- TYPED, SPOKEN, PHOTO
    diagram_id             TEXT REFERENCES diagram_asset(diagram_id),
    diagram_spec_json      JSONB,                          -- code-drawn chart spec
    template_id            BIGINT REFERENCES calc_template(template_id),
    is_paper_authentic_layout BOOLEAN NOT NULL DEFAULT FALSE,
    licence_status         TEXT NOT NULL DEFAULT 'OWN' CHECK (licence_status IN ('OWN','OFFICIAL_TEACHING_USE','BOARD_LICENSED','PENDING_BOARD_CONFIRMATION','RESTRICTED')),
    review_status          TEXT NOT NULL DEFAULT 'PENDING_QC' CHECK (review_status IN ('PENDING_QC','APPROVED','QC_FAILED','REJECTED','RETIRED')),
    reviewed_by            UUID,
    reviewed_at            TIMESTAMPTZ,
    times_served           INTEGER NOT NULL DEFAULT 0,
    retired_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_question_topic ON question(topic_id) WHERE review_status = 'APPROVED';
CREATE INDEX ix_question_spec_tier ON question(specification_id, tier, review_status);
CREATE INDEX ix_question_source ON question(source_type, review_status);
CREATE INDEX ix_question_paper ON question(past_paper_id);
CREATE TRIGGER trg_question_updated BEFORE UPDATE ON question FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE mark_scheme (
    mark_scheme_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id          BIGINT NOT NULL UNIQUE REFERENCES question(question_id),
    scheme_type          TEXT NOT NULL CHECK (scheme_type IN ('POINTS','LEVELS','MCQ_KEY','NUMERIC')),
    total_marks          SMALLINT NOT NULL,
    marking_points_json  JSONB,                            -- [{id,marks,point,accept[],reject[],ignore[]}]
    levels_json          JSONB,                            -- levels-of-response bands + descriptors
    indicative_content_json JSONB,
    model_answer         TEXT,
    common_errors_json   JSONB,
    marking_notes        TEXT,
    origin               TEXT NOT NULL CHECK (origin IN ('OFFICIAL','GENERATED','AUTHORED')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE past_paper_item (
    item_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paper_id         BIGINT NOT NULL REFERENCES past_paper(paper_id) ON DELETE CASCADE,
    question_id      BIGINT REFERENCES question(question_id),
    q_ref            TEXT NOT NULL,                        -- '04.2'
    page_start       SMALLINT,
    page_end         SMALLINT,
    bbox_json        JSONB,                                -- region(s) on the page for authentic layout (US-043)
    raw_text         TEXT,
    proposed_topic_id BIGINT REFERENCES spec_topic(topic_id),
    tag_confidence   NUMERIC(4,3),
    status           TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (status IN ('EXTRACTED','TAGGED','NEEDS_REVIEW','APPROVED','REJECTED')),
    review_note      TEXT,
    reviewed_by      UUID,
    UNIQUE (paper_id, q_ref)
);

CREATE TABLE ingestion_job (
    job_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id          BIGINT NOT NULL REFERENCES past_paper(paper_id),
    stage             TEXT NOT NULL CHECK (stage IN ('SEGMENT','EXTRACT_SCHEME','TAG','EMBED','REVIEW')),
    status            TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
    prompt_versions_json JSONB,
    stats_json        JSONB,
    error             TEXT,
    started_at        TIMESTAMPTZ,
    finished_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ingest_paper ON ingestion_job(paper_id, stage);

CREATE TABLE spec_document (
    doc_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specification_id  BIGINT NOT NULL REFERENCES specification(specification_id),
    file_key          TEXT NOT NULL,
    source_url        TEXT NOT NULL,
    extract_status    TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (extract_status IN ('NOT_STARTED','RUNNING','NEEDS_REVIEW','DONE','FAILED')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE generation_run (
    run_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind             TEXT NOT NULL CHECK (kind IN ('NIGHTLY','TOPUP','MANUAL','EVAL')),
    batch_api_id     TEXT,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at      TIMESTAMPTZ,
    stats_json       JSONB,                                -- blueprints planned/generated/passed/failed/cost
    triggered_by     UUID
);

CREATE TABLE blueprint (
    blueprint_id      TEXT PRIMARY KEY,                    -- 'BP-8462-4.3.1.3-O2-SA-2-45-0007'
    run_id            UUID REFERENCES generation_run(run_id),
    spec_topic_id     BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    objective_id      BIGINT NOT NULL REFERENCES spec_point_objective(objective_id),
    tier              TEXT,
    question_type     TEXT NOT NULL,
    marks             SMALLINT NOT NULL,
    command_word      TEXT NOT NULL,
    target_grade_band TEXT NOT NULL,
    variant_kind      TEXT,
    is_numeric        BOOLEAN NOT NULL DEFAULT FALSE,
    blueprint_json    JSONB NOT NULL,                      -- schemas/blueprint.schema.json
    status            TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','GENERATED','PUBLISHED','FAILED','ERROR')),
    question_id       BIGINT REFERENCES question(question_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_blueprint_status ON blueprint(status);

CREATE TABLE question_generation_log (
    generation_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id            BIGINT NOT NULL UNIQUE REFERENCES question(question_id),
    blueprint_id           TEXT REFERENCES blueprint(blueprint_id),
    model_name             TEXT NOT NULL,
    style_profile_id       BIGINT REFERENCES board_style_profile(style_profile_id),
    grounding_reference_ids BIGINT[],
    target_grade           TEXT,
    variant_kind           TEXT,
    template_id            BIGINT REFERENCES calc_template(template_id),
    repair_attempted       BOOLEAN NOT NULL DEFAULT FALSE,
    prompt_versions_json   JSONB NOT NULL,
    generated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calc_instance (
    instance_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    template_id       BIGINT NOT NULL REFERENCES calc_template(template_id),
    question_id       BIGINT UNIQUE REFERENCES question(question_id),
    seed              BIGINT NOT NULL,
    variables_json    JSONB NOT NULL,
    steps_json        JSONB NOT NULL,                      -- every intermediate value (ECF marking)
    final_answer      NUMERIC,
    final_unit        TEXT,
    misconception_values_json JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qc_check_result (
    result_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id     BIGINT NOT NULL REFERENCES question(question_id) ON DELETE CASCADE,
    check_id        TEXT NOT NULL CHECK (check_id IN ('CODE','QC1_GROUNDING','QC2_TAG','QC3_MARKSCHEME','QC4_DUPLICATE','QC5_ANSWERABILITY')),
    prompt_version  TEXT,
    passed          BOOLEAN NOT NULL,
    score           NUMERIC(5,3),
    issues_json     JSONB,
    run_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_qc_question ON qc_check_result(question_id, run_at DESC);

CREATE TABLE question_embedding (
    question_id      BIGINT PRIMARY KEY REFERENCES question(question_id) ON DELETE CASCADE,
    embedding        vector(768) NOT NULL,                 -- self-hosted bge-base-en-v1.5 (D-24, decision B-07). Change dimension only via new migration + full re-embed.
    embedding_model  TEXT NOT NULL,
    source_kind      TEXT NOT NULL CHECK (source_kind IN ('BANK','PAST_PAPER')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_qembed_hnsw ON question_embedding USING hnsw (embedding vector_cosine_ops);

-- Revision content (all AI-rewritten in our own words from the spec — never copied)
CREATE TABLE revision_note (
    note_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spec_topic_id    BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    version          INTEGER NOT NULL DEFAULT 1,
    body_md          TEXT NOT NULL,
    reading_level    TEXT,
    status           TEXT NOT NULL DEFAULT 'PENDING_QC' CHECK (status IN ('PENDING_QC','APPROVED','QC_FAILED','RETIRED')),
    prompt_version   TEXT,
    grounding_json   JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (spec_topic_id, version)
);

CREATE TABLE flashcard_deck (
    deck_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                TEXT NOT NULL CHECK (kind IN ('SYSTEM','CUSTOM')),
    owner_student_id    UUID REFERENCES student_profile(student_id) ON DELETE CASCADE,
    spec_topic_id       BIGINT REFERENCES spec_topic(topic_id),
    title               TEXT NOT NULL,
    moderation_status   TEXT NOT NULL DEFAULT 'CLEAN' CHECK (moderation_status IN ('CLEAN','PENDING','BLOCKED')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((kind = 'SYSTEM' AND owner_student_id IS NULL) OR (kind = 'CUSTOM' AND owner_student_id IS NOT NULL))
);

CREATE TABLE flashcard (
    card_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id        UUID NOT NULL REFERENCES flashcard_deck(deck_id) ON DELETE CASCADE,
    front          TEXT NOT NULL,
    back           TEXT NOT NULL,
    source_note_id BIGINT REFERENCES revision_note(note_id),
    position       INTEGER NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING_QC','APPROVED','REJECTED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_flashcard_deck ON flashcard(deck_id);

CREATE TABLE deck_share (
    share_code     TEXT PRIMARY KEY,
    deck_id        UUID NOT NULL REFERENCES flashcard_deck(deck_id) ON DELETE CASCADE,
    created_by     UUID NOT NULL REFERENCES student_profile(student_id),
    expires_at     TIMESTAMPTZ NOT NULL,
    revoked_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cheat_sheet (
    sheet_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spec_topic_id  BIGINT NOT NULL REFERENCES spec_topic(topic_id),
    content_json   JSONB NOT NULL,                         -- structured sections: key terms, equations, common mistakes
    status         TEXT NOT NULL DEFAULT 'PENDING_QC' CHECK (status IN ('PENDING_QC','APPROVED','QC_FAILED','RETIRED')),
    prompt_version TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing & help content (A-*, P-01)
CREATE TABLE marketing_resource (
    resource_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title         TEXT NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('LEAD_MAGNET','GLOSSARY','PAST_PAPER_INDEX','GUIDE')),
    email_gated   BOOLEAN NOT NULL DEFAULT FALSE,
    file_key      TEXT,
    body_md       TEXT,
    published     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE lead_capture (
    lead_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             CITEXT NOT NULL,
    resource_id       BIGINT REFERENCES marketing_resource(resource_id),
    source_page       TEXT,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE case_study (
    case_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title           TEXT NOT NULL,
    body_md         TEXT NOT NULL,
    before_after_json JSONB,
    consent_evidence_key TEXT NOT NULL,                    -- testimonial consent is mandatory (US-006)
    approved        BOOLEAN NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ
);

CREATE TABLE faq_item (
    faq_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category    TEXT NOT NULL,
    question    TEXT NOT NULL,
    answer_md   TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    published   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE outcome_stat (
    stat_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label           TEXT NOT NULL,
    value_text      TEXT NOT NULL,
    methodology_md  TEXT NOT NULL,                         -- A-06 requires the method to be shown next to every number
    sample_size     INTEGER,
    as_of           DATE NOT NULL,
    published       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE help_article (
    article_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    body_md      TEXT NOT NULL,
    audience     TEXT NOT NULL DEFAULT 'ALL' CHECK (audience IN ('ALL','PARENT','STUDENT','TEACHER')),
    tags         TEXT[],
    published    BOOLEAN NOT NULL DEFAULT TRUE,
    helpful_yes  INTEGER NOT NULL DEFAULT 0,
    helpful_no   INTEGER NOT NULL DEFAULT 0,
    search_tsv   TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_md,''))) STORED
);
CREATE INDEX ix_help_search ON help_article USING gin (search_tsv);
