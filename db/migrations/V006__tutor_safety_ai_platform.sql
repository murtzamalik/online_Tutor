-- =============================================================================
-- V006 — AI tutor (chat + voice), hints, safety & safeguarding, AI Gateway logs,
--        prompt registry, model routing, evaluation, cost
-- Stories: US-050/051/052/053/054/075/076/082/083/116/118/125/126/127/128/129
-- Screens: F-06, F-07, F-08, G-03, G-04, J-01, J-02, J-06, H-09, L-04, Q-01…Q-05
-- =============================================================================

-- ---------------------------------------------------------------- prompt registry & routing (Q-03)
CREATE TABLE prompt_version (
    prompt_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id         TEXT NOT NULL,                       -- 'P-QG-02', 'P-MK-01' … (see ai_prompts/README.md)
    version           TEXT NOT NULL,                       -- semver of the prompt file
    task_key          TEXT NOT NULL,                       -- gateway routing key, e.g. 'mark.gcse.pass_a'
    body_text         TEXT NOT NULL,                       -- exact system+user template text loaded from the repo file
    schema_ref        TEXT,                                -- e.g. 'schemas/marking_result.schema.json'
    model_tier        TEXT NOT NULL CHECK (model_tier IN ('large','small','vision','embed')),
    temperature       NUMERIC(3,2),
    source_path       TEXT NOT NULL,                       -- file in ai_prompts/ that produced this row
    sha256            TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','EVALUATING','LIVE','RETIRED','REJECTED')),
    metrics_json      JSONB,
    created_by        UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    promoted_by       UUID,
    promoted_at       TIMESTAMPTZ,
    UNIQUE (prompt_id, version)
);
-- exactly one LIVE version per prompt
CREATE UNIQUE INDEX ux_prompt_live ON prompt_version(prompt_id) WHERE status = 'LIVE';

CREATE TABLE model_routing (
    task_key         TEXT PRIMARY KEY,
    model_tier       TEXT NOT NULL,
    vendor           TEXT NOT NULL DEFAULT 'ANTHROPIC' CHECK (vendor IN ('ANTHROPIC','GOOGLE_SPEECH','SELF_HOSTED')),
    model_id         TEXT NOT NULL,                        -- concrete model lives here, never in code (D-28)
    params_json      JSONB,
    fallback_model_id TEXT,
    updated_by       UUID,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- Gateway audit (Q-02) — no identity fields, ever
CREATE TABLE ai_gateway_log (
    log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_token    TEXT NOT NULL UNIQUE,                 -- random per request (D-15)
    task_key         TEXT NOT NULL,
    prompt_id        TEXT,
    prompt_version   TEXT,
    vendor           TEXT NOT NULL,
    model            TEXT,
    route            TEXT NOT NULL CHECK (route IN ('TEXT','IMAGE','VOICE_STT','VOICE_TTS','BATCH')),
    tokens_in        INTEGER,
    tokens_out       INTEGER,
    cost_micro_gbp   BIGINT,
    latency_ms       INTEGER,
    status           TEXT NOT NULL CHECK (status IN ('OK','ERROR','REFUSED','SCHEMA_FAIL','BLOCKED_BY_BOUNDARY','FALLBACK_USED')),
    redaction_count  SMALLINT NOT NULL DEFAULT 0,
    boundary_ok      BOOLEAN NOT NULL DEFAULT TRUE,        -- result of the outbound identity scan
    payload_hash     TEXT,                                 -- sha256 of the redacted outbound payload
    error_code       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_gwlog_time ON ai_gateway_log(created_at DESC);
CREATE INDEX ix_gwlog_task ON ai_gateway_log(task_key, created_at DESC);

-- Exact outbound payload kept 14 days so the data-protection lead can verify redaction (Q-02); then purged by job.
CREATE TABLE ai_gateway_payload (
    log_id       UUID PRIMARY KEY REFERENCES ai_gateway_log(log_id) ON DELETE CASCADE,
    outbound_json JSONB NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE redaction_event (
    redaction_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id        UUID NOT NULL REFERENCES ai_gateway_log(log_id) ON DELETE CASCADE,
    kind          TEXT NOT NULL CHECK (kind IN ('NAME','SCHOOL','EMAIL','PHONE','DOB','POSTCODE','ADDRESS','CANDIDATE_NUMBER','URL','SOCIAL_HANDLE','IMAGE_HEADER','OTHER')),
    method        TEXT NOT NULL CHECK (method IN ('LIST_MATCH','REGEX','IMAGE_MASK','USER_CROP')),
    span_hash     TEXT,                                    -- hash of the removed span, not the span itself
    placeholder   TEXT NOT NULL,                           -- e.g. [NAME_1]
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_redaction_log ON redaction_event(log_id);

CREATE TABLE boundary_attestation (
    attestation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day            DATE NOT NULL UNIQUE,
    checks_json    JSONB NOT NULL,                         -- e.g. canary identities never found in outbound payloads
    passed         BOOLEAN NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- core-api side only: maps a gateway request token back to our own object. Never visible to the gateway or a vendor.
CREATE TABLE ai_request_map (
    request_token    TEXT PRIMARY KEY,
    correlation_type TEXT NOT NULL,                        -- RESPONSE, TUTOR_MESSAGE, REPORT, INGESTION, GENERATION …
    correlation_id   TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_reqmap_corr ON ai_request_map(correlation_type, correlation_id);

CREATE TABLE ai_usage_cost (
    day            DATE NOT NULL,
    task_key       TEXT NOT NULL,
    vendor         TEXT NOT NULL,
    model          TEXT NOT NULL,
    calls          INTEGER NOT NULL DEFAULT 0,
    tokens_in      BIGINT NOT NULL DEFAULT 0,
    tokens_out     BIGINT NOT NULL DEFAULT 0,
    cost_pence     BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, task_key, vendor, model)
);

CREATE TABLE ai_budget (
    budget_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period         TEXT NOT NULL,                          -- '2026-10'
    task_key       TEXT,                                   -- NULL = overall / per-active-student budget
    metric         TEXT NOT NULL CHECK (metric IN ('TOTAL_PENCE','PENCE_PER_ACTIVE_STUDENT')),
    budget_value   NUMERIC(12,2) NOT NULL,
    alert_at_pct   SMALLINT NOT NULL DEFAULT 80,
    set_by         UUID
);

-- ---------------------------------------------------------------- evaluation (Q-01, Q-03)
CREATE TABLE eval_run (
    eval_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_version_id  UUID NOT NULL REFERENCES prompt_version(prompt_version_id),
    task_key           TEXT NOT NULL,
    model_id           TEXT NOT NULL,
    dataset            TEXT NOT NULL,                      -- 'gold_set', 'qg_fixed_eval_v1'
    n_items            INTEGER NOT NULL,
    point_accuracy     NUMERIC(6,5),                       -- agreement per marking point (headline KPI, D-19)
    exact_total_agreement NUMERIC(6,5),
    over_marking_rate  NUMERIC(6,5),
    under_marking_rate NUMERIC(6,5),
    by_board_json      JSONB,
    by_question_type_json JSONB,
    metrics_json       JSONB,                              -- non-marking metrics (QC catch rate etc.)
    beats_live         BOOLEAN,
    passes_gate        BOOLEAN,                            -- beats live AND >= 0.95 (marking) / promotion rule (generation)
    cost_pence         INTEGER,
    triggered_by       UUID,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at        TIMESTAMPTZ
);
CREATE INDEX ix_eval_task ON eval_run(task_key, started_at DESC);

CREATE TABLE eval_result (
    eval_id         UUID NOT NULL REFERENCES eval_run(eval_id) ON DELETE CASCADE,
    gold_id         UUID NOT NULL REFERENCES gold_set_item(gold_id),
    ai_points_json  JSONB NOT NULL,
    ai_total        NUMERIC(5,1) NOT NULL,
    points_agreed   SMALLINT NOT NULL,
    points_total    SMALLINT NOT NULL,
    exact_total     BOOLEAN NOT NULL,
    over_marked     BOOLEAN NOT NULL,
    PRIMARY KEY (eval_id, gold_id)
);

-- ---------------------------------------------------------------- tutor sessions
CREATE TABLE tutor_session (
    tutor_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    enrolment_id     UUID REFERENCES student_enrolment(enrolment_id),
    topic_id         BIGINT REFERENCES spec_topic(topic_id),
    question_id      BIGINT REFERENCES question(question_id),
    response_id      UUID REFERENCES student_response(response_id),
    channel          TEXT NOT NULL CHECK (channel IN ('CHAT','VOICE')),
    mode             TEXT NOT NULL CHECK (mode IN ('SOCRATIC','EXPLAIN_BACK','REEXPLAIN','WALKTHROUGH','DISCUSSION','RESCUE','FREE_REVISION')),
    strategy         TEXT CHECK (strategy IN ('DIRECT_INSTRUCTION','WORKED_EXAMPLE_FADING','SOCRATIC','SPACED_RETRIEVAL')),
    persona_tier     SMALLINT NOT NULL,                    -- 1 playful, 2 exam-focused, 3 study-partner
    status           TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED','BLOCKED','EXPIRED')),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at         TIMESTAMPTZ,
    turn_count       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_tutor_student ON tutor_session(student_id, started_at DESC);

CREATE TABLE tutor_message (
    message_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_session_id UUID NOT NULL REFERENCES tutor_session(tutor_session_id) ON DELETE CASCADE,
    seq              INTEGER NOT NULL,
    role             TEXT NOT NULL CHECK (role IN ('STUDENT','TUTOR','SYSTEM')),
    channel          TEXT NOT NULL CHECK (channel IN ('CHAT','VOICE')),
    content_text     TEXT NOT NULL,                        -- what was said/typed (may contain personal data; stays in our DB)
    ai_visible_text  TEXT,                                 -- the redacted text the AI actually saw
    blocked          BOOLEAN NOT NULL DEFAULT FALSE,
    stt_confidence   NUMERIC(4,3),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ NOT NULL,                 -- voice 30 days (D-20); chat 90 days (config: retention.tutor_chat_days)
    UNIQUE (tutor_session_id, seq)
);
CREATE INDEX ix_tmsg_expiry ON tutor_message(expires_at);

CREATE TABLE voice_session (
    voice_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_session_id UUID NOT NULL UNIQUE REFERENCES tutor_session(tutor_session_id) ON DELETE CASCADE,
    voice_consent_id UUID NOT NULL REFERENCES voice_consent(voice_consent_id),
    stt_seconds      NUMERIC(8,1) NOT NULL DEFAULT 0,
    tts_characters   INTEGER NOT NULL DEFAULT 0,
    p50_turn_latency_ms INTEGER,
    p95_turn_latency_ms INTEGER,
    end_reason       TEXT CHECK (end_reason IN ('USER_ENDED','TIME_LIMIT','QUIET_HOURS','MIC_ERROR','NETWORK_ERROR','SAFETY_BLOCK','FALLBACK_TO_TEXT','PARENT_DISABLED')),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at         TIMESTAMPTZ
);

-- Baseline name kept: voice_session_transcript = voice turns of tutor_message
CREATE VIEW voice_session_transcript AS
    SELECT m.message_id, v.voice_session_id, m.tutor_session_id, m.seq, m.role, m.content_text,
           m.stt_confidence, m.created_at, m.expires_at
    FROM tutor_message m
    JOIN voice_session v ON v.tutor_session_id = m.tutor_session_id
    WHERE m.channel = 'VOICE';

CREATE TABLE hint_event (
    hint_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    question_id    BIGINT NOT NULL REFERENCES question(question_id),
    session_id     UUID REFERENCES practice_session(session_id),
    level          SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),   -- 1 nudge, 2 pointer, 3 worked step (never the final answer)
    hint_text      TEXT NOT NULL,
    prompt_version TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- safety & safeguarding
CREATE TABLE safety_classification (
    classification_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_message_id   UUID REFERENCES tutor_message(message_id) ON DELETE CASCADE,
    response_id        UUID REFERENCES student_response(response_id) ON DELETE CASCADE,
    deck_id            UUID REFERENCES flashcard_deck(deck_id) ON DELETE CASCADE,
    direction          TEXT NOT NULL CHECK (direction IN ('LEARNER_INPUT','TUTOR_OUTPUT','SHARED_CONTENT')),
    categories_json    JSONB NOT NULL,
    severity           TEXT NOT NULL CHECK (severity IN ('NONE','LOW','MEDIUM','HIGH','CRITICAL')),
    welfare_disclosure BOOLEAN NOT NULL DEFAULT FALSE,
    off_topic          BOOLEAN NOT NULL DEFAULT FALSE,
    homework_shortcut_attempt BOOLEAN NOT NULL DEFAULT FALSE,
    action_taken       TEXT NOT NULL CHECK (action_taken IN ('NONE','REDIRECT','BLOCK','SAFE_RESPONSE','ESCALATE')),
    prompt_version     TEXT NOT NULL,
    latency_ms         INTEGER,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_safety_class_sev ON safety_classification(severity, created_at DESC) WHERE severity <> 'NONE';

CREATE TABLE safety_flag (
    flag_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_ref         TEXT NOT NULL UNIQUE,                  -- pseudonymous reference shown in Q-05 triage
    classification_id UUID NOT NULL REFERENCES safety_classification(classification_id),
    student_id       UUID NOT NULL REFERENCES student_profile(student_id),   -- identity revealed only on ESCALATE (Q-05 → L-04)
    tutor_session_id UUID REFERENCES tutor_session(tutor_session_id),
    category         TEXT NOT NULL,
    severity         TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','TRIAGED','ESCALATED','DISMISSED','CLOSED')),
    excerpt_redacted TEXT,
    triaged_by       UUID REFERENCES account(account_id),
    triaged_at       TIMESTAMPTZ,
    disposition_note TEXT,
    sla_due_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_flag_status ON safety_flag(status, severity, created_at);

CREATE TABLE safeguarding_disclosure_log (
    disclosure_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id          UUID REFERENCES safety_flag(flag_id),
    student_id       UUID NOT NULL REFERENCES student_profile(student_id),
    school_id        UUID REFERENCES school(school_id),
    dsl_account_id   UUID REFERENCES account(account_id),
    category         TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACTIONED','REFERRED','CLOSED')),
    summary          TEXT NOT NULL,
    referral_target  TEXT CHECK (referral_target IN ('PARENT','SCHOOL_DSL','LADO','SOCIAL_CARE','POLICE','NONE')),
    sla_due_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at        TIMESTAMPTZ
);

CREATE TABLE safeguarding_action (
    action_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disclosure_id  UUID NOT NULL REFERENCES safeguarding_disclosure_log(disclosure_id) ON DELETE CASCADE,
    actor_account_id UUID NOT NULL REFERENCES account(account_id),
    action_type    TEXT NOT NULL CHECK (action_type IN ('NOTE','CONTACTED_PARENT','CONTACTED_SCHOOL_DSL','REFERRED_EXTERNAL','CLOSED','REOPENED')),
    note           TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
