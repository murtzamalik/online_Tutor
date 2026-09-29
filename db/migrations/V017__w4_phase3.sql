-- =============================================================================
-- V017 — W4 Phase 3 & flag-offs: enable pilot flags, config, share moderation
-- Forward-only; does not edit V001–V016.
-- K-01 gamification_phase2 and tutor_marketplace remain FALSE.
-- =============================================================================

-- Demo/local: turn on Phase 3 flags for W4 gate. Prod can flip via config.
UPDATE feature_flag SET enabled = TRUE,
  description = 'C-06 single-subject micro-sub (W4 demo ON; prod client-controlled)'
WHERE flag_key = 'micro_subscriptions';

UPDATE feature_flag SET enabled = TRUE,
  description = 'C-07 referral programme (W4 demo ON; prod client-controlled)'
WHERE flag_key = 'referrals';

UPDATE feature_flag SET enabled = TRUE,
  description = 'D-04 11+ adaptive entrance test (W4 demo ON)'
WHERE flag_key = 'entrance_test_11plus';

UPDATE feature_flag SET enabled = TRUE,
  description = 'H-07 cohort benchmark (UI still gates on n>=50 + opt-in)'
WHERE flag_key = 'cohort_benchmark';

-- Explicitly keep deferred features off
UPDATE feature_flag SET enabled = FALSE
WHERE flag_key IN ('gamification_phase2', 'tutor_marketplace');

INSERT INTO app_config (config_key, value_json, description) VALUES
 ('billing.micro_sub.amount_pence', '999', 'C-06 micro-subscription monthly amount (pence)'),
 ('billing.micro_sub.duration_days', '30', 'C-06 micro-sub expiry window (days)'),
 ('billing.referral.reward_pence', '500', 'C-07 referrer credit after referee first paid invoice (pence)'),
 ('billing.referral.code_prefix', '"SL"', 'C-07 referral code prefix'),
 ('entrance.quota_items', '20', 'D-04 entrance test item quota'),
 ('practice.keep_going.consistency_window', '5', 'D-10 consecutive correct needed to stop'),
 ('practice.keep_going.consistency_min_pct', '80', 'D-10 rolling accuracy % threshold'),
 ('cohort.min_sample_size', '50', 'H-07 k-anonymity gate (must match V010)'),
 ('w4.wave', '"W4_BUILT"', 'Traceability marker for web pilot pack close')
ON CONFLICT (config_key) DO UPDATE SET value_json = EXCLUDED.value_json;

-- Moderated share visibility (I-06)
ALTER TABLE deck_share
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- Micro-subscription ledger (no PAN; Stripe/fake provider ids only)
CREATE TABLE IF NOT EXISTS micro_subscription (
    micro_sub_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        UUID NOT NULL REFERENCES account(account_id),
    student_id        UUID NOT NULL REFERENCES student_profile(student_id),
    subject_id        BIGINT NOT NULL REFERENCES subject(subject_id),
    board_track       TEXT,
    amount_pence      INTEGER NOT NULL CHECK (amount_pence > 0),
    currency          TEXT NOT NULL DEFAULT 'GBP',
    status            TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
    provider_ref      TEXT,
    starts_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_micro_sub_account ON micro_subscription(account_id, status);

-- Extra free library seeds for A-10
INSERT INTO marketing_resource (title, kind, email_gated, body_md, published)
SELECT * FROM (VALUES
 ('Chemistry glossary (pilot)', 'GLOSSARY', FALSE,
  '# Glossary\n\nKey GCSE Chemistry terms for free browsing.', TRUE),
 ('Past-paper index — Chemistry', 'PAST_PAPER_INDEX', FALSE,
  '# Past papers\n\nBoard-linked index (links only; no copyrighted papers hosted).', TRUE),
 ('Exam technique guide', 'GUIDE', TRUE,
  '# Technique\n\nEmail-gated guide — use A-05 lead capture.', TRUE)
) AS v(title, kind, email_gated, body_md, published)
WHERE NOT EXISTS (
  SELECT 1 FROM marketing_resource WHERE title = v.title
);
