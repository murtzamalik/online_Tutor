-- =============================================================================
-- V002 — Schools (core row), accounts, learners, auth, MFA, age assurance, consent, privacy
-- Stories: US-010/011/012/084/085/086/100–105  Screens: B-01/02/03/10/11, Shell-04/09/10, L-01/02/03/05, J-06
-- Rule: only first names are stored for learners (display_name). No surname is ever required.
-- =============================================================================

CREATE TABLE school (
    school_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    urn              TEXT UNIQUE,                        -- DfE URN (England) or equivalent
    region           TEXT,
    email_domain     TEXT,                               -- used for SSO domain matching (O-06)
    status           TEXT NOT NULL DEFAULT 'PROSPECT' CHECK (status IN ('PROSPECT','DPA_PENDING','ACTIVE','SUSPENDED','CLOSED')),
    seats_purchased  INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_school_updated BEFORE UPDATE ON school FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE account (
    account_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              CITEXT UNIQUE,                    -- NULL for picture-PIN children (they have no account)
    password_hash      TEXT,                             -- argon2id; NULL for SSO-only accounts
    display_name       TEXT NOT NULL,
    kind               TEXT NOT NULL CHECK (kind IN ('PARENT','STUDENT','TEACHER','SCHOOL_ADMIN','BUSINESS_MANAGER','STAFF')),
    status             TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
                         CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','LOCKED','SUSPENDED','DELETED')),
    email_verified_at  TIMESTAMPTZ,
    mfa_required       BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE for STAFF, reviewers, SCHOOL_ADMIN (US-103)
    marketing_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,
    school_id          UUID REFERENCES school(school_id),
    failed_login_count SMALLINT NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,
    locale             TEXT NOT NULL DEFAULT 'en-GB',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_account_school ON account(school_id);
CREATE TRIGGER trg_account_updated BEFORE UPDATE ON account FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A person can hold several roles (e.g. a teacher who is also a parent).
CREATE TABLE account_role (
    account_id  UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN (
        'PARENT','STUDENT','TEACHER','SCHOOL_ADMIN','BUSINESS_MANAGER',
        'CONTENT_ADMIN','REVIEWER','OPS_REVIEWER','SUPPORT','COMPLIANCE','AI_ENGINEER',
        'SAFEGUARDING_LEAD','PRODUCT_OWNER','BUSINESS_OWNER','PLATFORM_ADMIN')),
    granted_by  UUID REFERENCES account(account_id),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, role)
);

CREATE TABLE school_member (
    school_id   UUID NOT NULL REFERENCES school(school_id),
    account_id  UUID NOT NULL REFERENCES account(account_id),
    role        TEXT NOT NULL CHECK (role IN ('TEACHER','SCHOOL_ADMIN','BUSINESS_MANAGER')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (school_id, account_id)
);

-- The learner (child or student). display_name = first name only.
CREATE TABLE student_profile (
    student_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name         TEXT NOT NULL,
    login_account_id     UUID UNIQUE REFERENCES account(account_id),   -- set for standalone students / SSO pupils; NULL for parent-managed picture-PIN children
    school_id            UUID REFERENCES school(school_id),            -- set for school pupils
    year_group           TEXT,                                          -- 'Y6','Y11','Y13'
    birth_month          DATE,                                          -- first day of birth month only (data minimisation); drives under-13 rules
    age_band             TEXT NOT NULL DEFAULT 'U13' CHECK (age_band IN ('U13','13_15','16_17','18_PLUS')),
    visual_tier          SMALLINT NOT NULL DEFAULT 2 CHECK (visual_tier BETWEEN 1 AND 3),
    accessibility_json   JSONB NOT NULL DEFAULT '{}'::jsonb,           -- {"dyslexia_font":true,"tts":true,"text_scale":1.25,"reduced_motion":false,"simplified_language":false,"extended_time_pct":25}
    avatar_key           TEXT,
    status               TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','DELETION_PENDING','DELETED')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_student_school ON student_profile(school_id);
CREATE TRIGGER trg_student_updated BEFORE UPDATE ON student_profile FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE parent_student_link (
    parent_account_id UUID NOT NULL REFERENCES account(account_id),
    student_id        UUID NOT NULL REFERENCES student_profile(student_id),
    relationship      TEXT NOT NULL DEFAULT 'PARENT' CHECK (relationship IN ('PARENT','GUARDIAN','OTHER')),
    is_primary        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (parent_account_id, student_id)
);
CREATE INDEX ix_psl_student ON parent_student_link(student_id);

-- Picture PIN (11+ children, B-11).  Sequence of N picture keys, hashed with per-row salt.
CREATE TABLE student_credential (
    credential_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    kind              TEXT NOT NULL CHECK (kind IN ('PICTURE_PIN')),
    secret_hash       TEXT NOT NULL,
    login_handle      TEXT NOT NULL,                    -- short family-scoped handle, e.g. "sam-4821"
    failed_attempts   SMALLINT NOT NULL DEFAULT 0,
    locked_until      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (login_handle)
);

CREATE TABLE auth_session (
    session_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id         UUID REFERENCES account(account_id) ON DELETE CASCADE,
    student_id         UUID REFERENCES student_profile(student_id) ON DELETE CASCADE,   -- picture-PIN sessions
    token_family_id    UUID NOT NULL,                   -- refresh-token rotation family; reuse of a rotated token revokes the family
    refresh_hash       TEXT NOT NULL,
    user_agent         TEXT,
    ip_hash            TEXT,
    mfa_satisfied      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    CHECK (account_id IS NOT NULL OR student_id IS NOT NULL)
);
CREATE INDEX ix_session_account ON auth_session(account_id) WHERE revoked_at IS NULL;

CREATE TABLE mfa_factor (
    factor_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id     UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    type           TEXT NOT NULL DEFAULT 'TOTP' CHECK (type IN ('TOTP')),
    secret_enc     BYTEA NOT NULL,                      -- AES-GCM encrypted with the app key
    confirmed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mfa_recovery_code (
    code_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,
    used_at     TIMESTAMPTZ
);

CREATE TABLE email_verification (
    verification_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id       UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    code_hash        TEXT NOT NULL,                     -- 6-digit code, hashed
    attempts         SMALLINT NOT NULL DEFAULT 0,       -- max 5
    sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ NOT NULL,
    verified_at      TIMESTAMPTZ
);

CREATE TABLE password_reset (
    reset_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ
);

CREATE TABLE oidc_identity (
    account_id  UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    provider    TEXT NOT NULL CHECK (provider IN ('GOOGLE','MICROSOFT')),
    subject     TEXT NOT NULL,
    tenant_id   TEXT,                                   -- Microsoft tenant / Google hosted domain
    email       CITEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, subject)
);

-- -----------------------------------------------------------------------------
-- Age assurance (D-09, L-05): swappable provider; record method + outcome only.
-- -----------------------------------------------------------------------------
CREATE TABLE age_assurance_record (
    record_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID NOT NULL REFERENCES account(account_id),
    method        TEXT NOT NULL,                        -- SELF_DECLARED_PARENTAL (pilot) | VENDOR_<NAME> later
    outcome       TEXT NOT NULL CHECK (outcome IN ('PENDING','PASS','FAIL','EXPIRED')),
    provider_ref  TEXT,
    evidence_json JSONB,                                -- never raw ID documents; provider reference only
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);
CREATE INDEX ix_aar_account ON age_assurance_record(account_id);

-- -----------------------------------------------------------------------------
-- Consent, privacy, deletion
-- -----------------------------------------------------------------------------
CREATE TABLE legal_document (
    document_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug          TEXT NOT NULL,                        -- terms, privacy, ai-data, cookies, safeguarding
    version       TEXT NOT NULL,
    title         TEXT NOT NULL,
    body_md       TEXT NOT NULL,
    is_current    BOOLEAN NOT NULL DEFAULT FALSE,
    published_at  TIMESTAMPTZ,
    UNIQUE (slug, version)
);

CREATE TABLE consent_record (
    consent_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES account(account_id),
    student_id      UUID REFERENCES student_profile(student_id),
    consent_type    TEXT NOT NULL CHECK (consent_type IN ('UNDER13_DATA_PROCESSING','TERMS','PRIVACY','TELEMETRY','MARKETING','TESTIMONIAL')),
    document_version TEXT,
    granted         BOOLEAN NOT NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at    TIMESTAMPTZ,
    ip_hash         TEXT,
    method          TEXT                                -- CHECKBOX, EMAIL_CONFIRM, ...
);
CREATE INDEX ix_consent_student ON consent_record(student_id, consent_type);

-- Voice is separate on purpose (J-06, D-20): audio goes to Google Cloud Speech.
CREATE TABLE voice_consent (
    voice_consent_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES student_profile(student_id),
    parent_account_id UUID NOT NULL REFERENCES account(account_id),
    text_version      TEXT NOT NULL,
    google_processing_acknowledged BOOLEAN NOT NULL,
    granted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at      TIMESTAMPTZ
);
CREATE INDEX ix_voice_consent_student ON voice_consent(student_id) WHERE withdrawn_at IS NULL;

CREATE TABLE cookie_consent (
    cookie_consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id        UUID NOT NULL,
    categories_json   JSONB NOT NULL,                   -- {"essential":true,"analytics":false,"marketing":false}; non-essential default FALSE (PECR)
    policy_version    TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE privacy_settings (
    student_id            UUID PRIMARY KEY REFERENCES student_profile(student_id) ON DELETE CASCADE,
    telemetry_level       TEXT NOT NULL DEFAULT 'ESSENTIAL' CHECK (telemetry_level IN ('ESSENTIAL','ENGAGEMENT')), -- ESSENTIAL = high-privacy default (US-085)
    cohort_benchmark_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    teacher_visibility    BOOLEAN NOT NULL DEFAULT TRUE,   -- only meaningful for school-linked pupils
    updated_by            UUID REFERENCES account(account_id),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parent_ai_controls (
    student_id           UUID PRIMARY KEY REFERENCES student_profile(student_id) ON DELETE CASCADE,
    chat_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    voice_enabled        BOOLEAN NOT NULL DEFAULT FALSE,   -- voice needs separate consent first
    daily_minutes_limit  SMALLINT,                         -- NULL = no limit
    quiet_hours_json     JSONB,                            -- {"start":"21:00","end":"07:00","days":[1,2,3,4,5,6,7],"tz":"Europe/London"}
    daily_goal_nudge     BOOLEAN NOT NULL DEFAULT FALSE,   -- K-02 opt-in, never default on
    updated_by           UUID REFERENCES account(account_id),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deletion_request (
    deletion_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL REFERENCES student_profile(student_id),
    requested_by   UUID NOT NULL REFERENCES account(account_id),
    scope          TEXT NOT NULL DEFAULT 'FULL' CHECK (scope IN ('FULL','LEARNING_DATA_ONLY')),
    status         TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','COOLING_OFF','PROCESSING','COMPLETED','CANCELLED')),
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    scheduled_for  TIMESTAMPTZ,                            -- 14-day cooling-off
    completed_at   TIMESTAMPTZ,
    certificate_ref TEXT
);

CREATE TABLE data_export_request (
    export_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL REFERENCES student_profile(student_id),
    requested_by   UUID NOT NULL REFERENCES account(account_id),
    status         TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','READY','EXPIRED','FAILED')),
    file_key       TEXT,
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ
);
