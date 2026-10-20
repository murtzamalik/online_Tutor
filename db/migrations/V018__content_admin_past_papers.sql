-- =============================================================================
-- V018 — Content admin demo account for past-paper E-02 workflows (local/pilot)
-- Login: content@studyloop.local / ReviewerDemo!23  (same argon2id hash as W3 reviewer)
-- Forward-only; does not edit V001–V017.
-- =============================================================================

INSERT INTO account (account_id, email, password_hash, display_name, kind, status, mfa_required, email_verified_at)
VALUES (
  'b3000000-0000-4000-8000-000000000001'::uuid,
  'content@studyloop.local',
  '$argon2id$v=19$m=65536,t=3,p=1$4yyWMxlLn2cnIAfoTEpEAg$odao6/avcWsXS67kDV9vxGybvAHS07rCihqVpH3AvBA',
  'Demo Content Admin',
  'STAFF',
  'ACTIVE',
  FALSE,
  now()
)
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO account_role (account_id, role)
VALUES ('b3000000-0000-4000-8000-000000000001'::uuid, 'CONTENT_ADMIN')
ON CONFLICT DO NOTHING;
