-- =============================================================================
-- V008 — Reports, alerts, notifications, support (notes/chat), append-only audit log, outbox
-- Stories: US-062…065, 098, 099, 123, 124   Screens: H-02…H-05, Shell-05, P-01…P-04
-- =============================================================================

CREATE TABLE weekly_report (
    report_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    week_start       DATE NOT NULL,
    facts_json       JSONB NOT NULL,                          -- deterministic stats the narrative is built from (no identity)
    parent_text_md   TEXT NOT NULL,                           -- RP-01 (child's name inserted by code from {{child_name}} placeholder)
    student_text_md  TEXT NOT NULL,                           -- RP-02
    prompt_versions_json JSONB,
    status           TEXT NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED','SENT','SUPPRESSED')),
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, week_start)
);

CREATE TABLE alert (
    alert_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES student_profile(student_id) ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('TOPIC_DRIFT','INACTIVITY','CALIBRATION_OVERCONFIDENT','ASSIGNMENT_OVERDUE','TIME_LIMIT_REACHED')),
    topic_id     BIGINT REFERENCES spec_topic(topic_id),
    severity     TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO','WARN')),
    message      TEXT NOT NULL,
    detail_json  JSONB,
    status       TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','ACK')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_alert_student ON alert(student_id, created_at DESC);

CREATE TABLE notification (
    notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_account_id UUID REFERENCES account(account_id) ON DELETE CASCADE,
    recipient_student_id UUID REFERENCES student_profile(student_id) ON DELETE CASCADE,
    kind               TEXT NOT NULL,
    title              TEXT NOT NULL,
    body               TEXT NOT NULL,
    deep_link          TEXT,
    data_json          JSONB,
    read_at            TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (recipient_account_id IS NOT NULL OR recipient_student_id IS NOT NULL)
);
CREATE INDEX ix_notif_recipient ON notification(recipient_account_id, created_at DESC);
CREATE INDEX ix_notif_student ON notification(recipient_student_id, created_at DESC);

CREATE TABLE notification_preference (
    account_id   UUID NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    channel      TEXT NOT NULL CHECK (channel IN ('EMAIL','PUSH','IN_APP')),
    kind         TEXT NOT NULL,                                -- WEEKLY_REPORT, ALERT, BILLING, ASSIGNMENT …
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (account_id, channel, kind)
);

CREATE TABLE device_registration (
    device_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id       UUID REFERENCES account(account_id) ON DELETE CASCADE,
    student_id       UUID REFERENCES student_profile(student_id) ON DELETE CASCADE,
    onesignal_id     TEXT NOT NULL,
    platform         TEXT NOT NULL CHECK (platform IN ('IOS','ANDROID','WEB')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at     TIMESTAMPTZ
);

-- ---------------------------------------------------------------- support (P-03) — no learning content visible
CREATE TABLE support_note (
    note_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL REFERENCES account(account_id),
    author_id    UUID NOT NULL REFERENCES account(account_id),
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- In-house live chat (decision B-15: no third-party chat vendor, to avoid another sub-processor)
CREATE TABLE support_chat_session (
    chat_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL REFERENCES account(account_id),
    status       TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','WAITING_AGENT','WAITING_USER','RESOLVED')),
    assigned_to  UUID REFERENCES account(account_id),
    topic        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE support_chat_message (
    message_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id      UUID NOT NULL REFERENCES support_chat_session(chat_id) ON DELETE CASCADE,
    sender       TEXT NOT NULL CHECK (sender IN ('USER','AGENT','SYSTEM')),
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- audit (P-04): append-only, hash-chained, 7-year retention
CREATE TABLE audit_log (
    audit_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_account_id UUID,
    actor_role      TEXT,
    action          TEXT NOT NULL,                             -- e.g. SUPPORT_REFUND, REVIEW_ADJUST_MARK, PROMPT_PROMOTE, PII_VIEW
    target_type     TEXT,
    target_id       TEXT,
    school_id       UUID,
    student_id      UUID,
    ip_hash         TEXT,
    metadata_json   JSONB,
    prev_hash       TEXT,
    row_hash        TEXT NOT NULL                              -- sha256(prev_hash || canonical row); verified by AUD-03
);
CREATE INDEX ix_audit_time ON audit_log(occurred_at DESC);
CREATE INDEX ix_audit_actor ON audit_log(actor_account_id, occurred_at DESC);
CREATE INDEX ix_audit_target ON audit_log(target_type, target_id);

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();

-- ---------------------------------------------------------------- transactional outbox → Redis Streams (D-13)
CREATE TABLE outbox_event (
    outbox_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stream        TEXT NOT NULL,                               -- e.g. 'answers', 'engagement', 'billing'
    event_type    TEXT NOT NULL,
    aggregate_id  TEXT NOT NULL,
    payload_json  JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at  TIMESTAMPTZ
);
CREATE INDEX ix_outbox_unpublished ON outbox_event(outbox_id) WHERE published_at IS NULL;
