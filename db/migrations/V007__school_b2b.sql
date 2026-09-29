-- =============================================================================
-- V007 — Schools (B2B): classes, pupils, assignments, rostering, SSO/MIS, DPA, PO/invoices,
--        KCSIE, safeguarding contact, staff vetting (uCheck)
-- Stories: US-095…097, 119…122   Screens: O-01…O-07
-- Tenancy rule: every query on a table with school_id/class_id MUST be scoped by the caller's school
-- (application filter + Postgres RLS policy defined in V009 as defence in depth).
-- =============================================================================

CREATE TABLE school_class (
    class_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          UUID NOT NULL REFERENCES school(school_id),
    name               TEXT NOT NULL,
    year_group         TEXT,
    subject_id         BIGINT REFERENCES subject(subject_id),
    specification_id   BIGINT REFERENCES specification(specification_id),
    academic_year      TEXT NOT NULL,                        -- '2026/27'
    source             TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL','CSV','MIS')),
    external_ref       TEXT,
    archived_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_class_school ON school_class(school_id) WHERE archived_at IS NULL;

CREATE TABLE class_teacher (
    class_id    UUID NOT NULL REFERENCES school_class(class_id) ON DELETE CASCADE,
    account_id  UUID NOT NULL REFERENCES account(account_id),
    is_owner    BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (class_id, account_id)
);

CREATE TABLE class_pupil (
    class_id     UUID NOT NULL REFERENCES school_class(class_id) ON DELETE CASCADE,
    student_id   UUID NOT NULL REFERENCES student_profile(student_id),
    external_ref TEXT,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at      TIMESTAMPTZ,
    PRIMARY KEY (class_id, student_id)
);
CREATE INDEX ix_class_pupil_student ON class_pupil(student_id);

CREATE TABLE assignment (
    assignment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id        UUID NOT NULL REFERENCES school_class(class_id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES account(account_id),
    title           TEXT NOT NULL,
    kind            TEXT NOT NULL CHECK (kind IN ('ADAPTIVE_PRACTICE','TOPIC_SET','MOCK')),
    topic_ids       BIGINT[] NOT NULL,
    question_count  SMALLINT NOT NULL DEFAULT 10,
    is_adaptive     BOOLEAN NOT NULL DEFAULT TRUE,
    settings_json   JSONB,                                    -- {"target_grade":"6","timed":false,"allow_hints":true}
    status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','CLOSED')),
    assigned_at     TIMESTAMPTZ,
    due_at          TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_assignment_class ON assignment(class_id, due_at);
ALTER TABLE practice_session ADD CONSTRAINT fk_session_assignment FOREIGN KEY (assignment_id) REFERENCES assignment(assignment_id);

CREATE TABLE assignment_target (
    assignment_id  UUID NOT NULL REFERENCES assignment(assignment_id) ON DELETE CASCADE,
    student_id     UUID NOT NULL REFERENCES student_profile(student_id),
    status         TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','LATE')),
    session_id     UUID REFERENCES practice_session(session_id),
    score_pct      NUMERIC(5,2),
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE roster_import (
    import_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id     UUID NOT NULL REFERENCES school(school_id),
    source        TEXT NOT NULL CHECK (source IN ('CSV','MIS')),
    file_key      TEXT,
    status        TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','VALIDATED','COMMITTED','FAILED','CANCELLED')),
    stats_json    JSONB,                                      -- rows, valid, warnings, errors, new pupils, moved pupils
    created_by    UUID NOT NULL REFERENCES account(account_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    committed_at  TIMESTAMPTZ
);

CREATE TABLE roster_import_row (
    row_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id   UUID NOT NULL REFERENCES roster_import(import_id) ON DELETE CASCADE,
    row_no      INTEGER NOT NULL,
    raw_json    JSONB NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('VALID','WARNING','ERROR','SKIPPED')),
    message     TEXT,
    student_id  UUID REFERENCES student_profile(student_id)
);
CREATE INDEX ix_roster_row_import ON roster_import_row(import_id, row_no);

CREATE TABLE mis_connection (
    mis_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id      UUID NOT NULL UNIQUE REFERENCES school(school_id),
    provider       TEXT NOT NULL CHECK (provider IN ('WONDE')),      -- decision B-14: Wonde adapter behind MisProvider interface
    external_school_id TEXT,
    status         TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONNECTED','ERROR','REVOKED')),
    last_sync_at   TIMESTAMPTZ,
    config_enc     BYTEA
);

CREATE TABLE sso_connection (
    sso_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    UUID NOT NULL REFERENCES school(school_id),
    provider     TEXT NOT NULL CHECK (provider IN ('GOOGLE','MICROSOFT')),
    domain       TEXT NOT NULL,
    tenant_id    TEXT,
    enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    audience     TEXT NOT NULL DEFAULT 'BOTH' CHECK (audience IN ('PUPILS','STAFF','BOTH')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, domain)
);

CREATE TABLE school_dpa_status (
    school_id        UUID PRIMARY KEY REFERENCES school(school_id),
    status           TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK (status IN ('NOT_SENT','SENT','SIGNED','REJECTED','SUPERSEDED')),
    template_version TEXT,
    sent_at          TIMESTAMPTZ,
    signed_at        TIMESTAMPTZ
);

CREATE TABLE school_dpa_signature (
    signature_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        UUID NOT NULL REFERENCES school(school_id),
    signer_account_id UUID NOT NULL REFERENCES account(account_id),
    signer_name      TEXT NOT NULL,
    signer_role      TEXT NOT NULL,
    template_version TEXT NOT NULL,
    signed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash          TEXT,
    pdf_key          TEXT NOT NULL                             -- countersigned PDF snapshot
);

CREATE TABLE sub_processor (
    sub_processor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             TEXT NOT NULL,
    purpose          TEXT NOT NULL,
    data_categories  TEXT NOT NULL,
    location         TEXT NOT NULL,
    dpa_url          TEXT,
    receives_personal_data BOOLEAN NOT NULL,                   -- Anthropic: FALSE (D-15); Google Speech: TRUE (audio)
    active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE purchase_order (
    po_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id     UUID NOT NULL REFERENCES school(school_id),
    po_number     TEXT NOT NULL,
    seats         INTEGER NOT NULL,
    amount_pence  BIGINT,
    valid_from    DATE NOT NULL,
    valid_to      DATE NOT NULL,
    file_key      TEXT,
    status        TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','ACCEPTED','REJECTED','EXPIRED')),
    created_by    UUID REFERENCES account(account_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, po_number)
);

CREATE TABLE school_invoice (
    school_invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         UUID NOT NULL REFERENCES school(school_id),
    po_id             UUID REFERENCES purchase_order(po_id),
    stripe_invoice_id TEXT UNIQUE,
    number            TEXT,
    period_start      DATE NOT NULL,
    period_end        DATE NOT NULL,
    pupil_count       INTEGER NOT NULL,
    unit_price_pence  INTEGER NOT NULL,                         -- same per-pupil price as consumer tier (D-22)
    subtotal_pence    BIGINT NOT NULL,
    vat_pence         BIGINT NOT NULL DEFAULT 0,
    total_pence       BIGINT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','PAID','OVERDUE','VOID')),
    due_on            DATE,
    pdf_key           TEXT,
    issued_at         TIMESTAMPTZ,
    paid_at           TIMESTAMPTZ
);

CREATE TABLE kcsie_confirmation (
    confirmation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES school(school_id),
    pack_version    TEXT NOT NULL,
    answers_json    JSONB NOT NULL,                             -- filtering/monitoring alignment questionnaire (O-03)
    confirmed_by    UUID NOT NULL REFERENCES account(account_id),
    confirmed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE safeguarding_contact (
    contact_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    UUID REFERENCES school(school_id),             -- NULL = our own DSL / deputy
    name         TEXT NOT NULL,
    role         TEXT NOT NULL CHECK (role IN ('DSL','DEPUTY_DSL','OUR_DSL','OUR_DEPUTY')),
    email        CITEXT NOT NULL,
    phone        TEXT
);

-- Enhanced DBS + Barred List (D-10 uCheck). Required for anyone who can see learner work or interact 1:1.
CREATE TABLE staff_vetting_record (
    vetting_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES account(account_id),
    provider        TEXT NOT NULL DEFAULT 'UCHECK',
    check_type      TEXT NOT NULL DEFAULT 'ENHANCED_DBS_BARRED_LIST',
    status          TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','APPLICATION_SENT','IN_PROGRESS','CLEAR','BLOCKED','EXPIRED')),
    provider_ref    TEXT,
    issued_on       DATE,
    next_review_on  DATE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_vetting_active ON staff_vetting_record(account_id) WHERE status <> 'EXPIRED';
