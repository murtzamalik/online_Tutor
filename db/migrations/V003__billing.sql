-- =============================================================================
-- V003 — Billing (Stripe): subscriptions, entitlements, invoices, dunning, refunds, referrals
-- Stories: US-019/020/021/022/023/024/025/026/106/107/108   Screens: C-01…C-10
-- Stripe is the source of truth for money; these tables mirror state via webhooks (idempotent).
-- School (B2B) billing tables are in V011.
-- =============================================================================

CREATE TABLE billing_customer (
    account_id          UUID PRIMARY KEY REFERENCES account(account_id),
    stripe_customer_id  TEXT NOT NULL UNIQUE,
    default_pm_brand    TEXT,
    default_pm_last4    TEXT,
    default_pm_exp      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription (
    subscription_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id              UUID NOT NULL REFERENCES account(account_id),
    plan_id                 BIGINT NOT NULL REFERENCES pricing_plan(plan_id),
    stripe_subscription_id  TEXT UNIQUE,
    status                  TEXT NOT NULL CHECK (status IN ('INCOMPLETE','TRIALING','ACTIVE','PAST_DUE','PAUSED','CANCELLED')),
    billing_cycle           TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY','YEARLY')),
    trial_started_at        TIMESTAMPTZ,
    trial_ends_at           TIMESTAMPTZ,
    trial_reminder_sent_at  TIMESTAMPTZ,                       -- DMCC: reminder before trial converts (C-08)
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at            TIMESTAMPTZ,
    cancel_reason           TEXT,
    grace_until             TIMESTAMPTZ,                       -- child keeps access while dunning (C-09)
    family_discount_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,   -- sibling discount (US-022) shown as invoice line item
    promo_code_id           BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_subscription_account ON subscription(account_id);
CREATE INDEX ix_subscription_status ON subscription(status, current_period_end);
CREATE TRIGGER trg_subscription_updated BEFORE UPDATE ON subscription FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Which child gets which subject under a subscription (C-02, incl. Combined Science as its own subject)
CREATE TABLE subscription_item (
    item_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id  UUID NOT NULL REFERENCES subscription(subscription_id) ON DELETE CASCADE,
    student_id       UUID NOT NULL REFERENCES student_profile(student_id),
    subject_id       BIGINT NOT NULL REFERENCES subject(subject_id),
    qualification_id BIGINT NOT NULL REFERENCES qualification(qualification_id),
    removed_at       TIMESTAMPTZ,
    UNIQUE (subscription_id, student_id, subject_id)
);

-- Derived access rights; recomputed from subscriptions/school membership/trial. The API only ever checks this table.
CREATE TABLE entitlement (
    entitlement_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES student_profile(student_id),
    subject_id      BIGINT NOT NULL REFERENCES subject(subject_id),
    qualification_id BIGINT NOT NULL REFERENCES qualification(qualification_id),
    source          TEXT NOT NULL CHECK (source IN ('SUBSCRIPTION','TRIAL','SCHOOL','MICRO','GRACE','COMPLIMENTARY')),
    includes_mock_tests BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until     TIMESTAMPTZ,
    UNIQUE (student_id, subject_id, qualification_id, source)
);
CREATE INDEX ix_entitlement_student ON entitlement(student_id);

CREATE TABLE promo_code (
    promo_code_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    percent_off    NUMERIC(5,2),
    months         SMALLINT,
    max_redemptions INTEGER,
    redeemed_count INTEGER NOT NULL DEFAULT 0,
    valid_until    DATE,
    stripe_coupon_id TEXT
);
ALTER TABLE subscription ADD CONSTRAINT fk_subscription_promo FOREIGN KEY (promo_code_id) REFERENCES promo_code(promo_code_id);

CREATE TABLE invoice (
    invoice_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id         UUID NOT NULL REFERENCES account(account_id),
    subscription_id    UUID REFERENCES subscription(subscription_id),
    stripe_invoice_id  TEXT UNIQUE,
    number             TEXT,
    status             TEXT NOT NULL CHECK (status IN ('DRAFT','OPEN','PAID','VOID','UNCOLLECTIBLE')),
    currency           TEXT NOT NULL DEFAULT 'GBP',
    subtotal_pence     INTEGER NOT NULL,
    discount_pence     INTEGER NOT NULL DEFAULT 0,
    vat_pence          INTEGER NOT NULL DEFAULT 0,
    total_pence        INTEGER NOT NULL,
    lines_json         JSONB NOT NULL,                   -- per child/subject lines + sibling discount line (C-10)
    period_start       TIMESTAMPTZ,
    period_end         TIMESTAMPTZ,
    pdf_key            TEXT,                             -- object-storage key of the invoice PDF
    issued_at          TIMESTAMPTZ,
    paid_at            TIMESTAMPTZ
);
CREATE INDEX ix_invoice_account ON invoice(account_id, issued_at DESC);

CREATE TABLE payment_attempt (
    attempt_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id   UUID NOT NULL REFERENCES subscription(subscription_id),
    invoice_id        UUID REFERENCES invoice(invoice_id),
    stripe_payment_intent_id TEXT,
    status            TEXT NOT NULL CHECK (status IN ('SUCCEEDED','FAILED','REQUIRES_ACTION')),
    failure_code      TEXT,
    dunning_step      SMALLINT NOT NULL DEFAULT 0,       -- 0 first failure … N final notice
    attempted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_retry_at     TIMESTAMPTZ
);
CREATE INDEX ix_payment_attempt_sub ON payment_attempt(subscription_id, attempted_at DESC);

CREATE TABLE refund (
    refund_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id       UUID NOT NULL REFERENCES invoice(invoice_id),
    amount_pence     INTEGER NOT NULL CHECK (amount_pence > 0),
    reason           TEXT NOT NULL,
    issued_by        UUID NOT NULL REFERENCES account(account_id),  -- support agent (P-03)
    stripe_refund_id TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral (
    referral_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_account_id UUID NOT NULL REFERENCES account(account_id),
    code                TEXT NOT NULL UNIQUE,
    referee_account_id  UUID REFERENCES account(account_id),
    status              TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','SIGNED_UP','REWARDED','EXPIRED')),
    reward_json         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stripe_event (
    stripe_event_id TEXT PRIMARY KEY,                     -- idempotency key for webhooks
    type            TEXT NOT NULL,
    payload         JSONB NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ,
    error           TEXT
);
