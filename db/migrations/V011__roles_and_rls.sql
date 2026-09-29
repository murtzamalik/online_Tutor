-- =============================================================================
-- V011 — Database roles, grants and row-level security (defence in depth)
-- Application connects as tutor_app. The AI Gateway connects as tutor_gateway and can NEVER read learner tables:
-- this makes the AI data boundary (D-15) a database-level guarantee, not just an application rule.
-- Roles are created idempotently; passwords are set by infrastructure (docker secrets), never in migrations.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app')      THEN CREATE ROLE tutor_app NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_gateway')  THEN CREATE ROLE tutor_gateway NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_readonly') THEN CREATE ROLE tutor_readonly NOLOGIN; END IF;
END $$;

-- ---- tutor_app: full DML on everything except the audit log (append-only) ----
GRANT USAGE ON SCHEMA public TO tutor_app, tutor_gateway, tutor_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tutor_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tutor_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM tutor_app;

-- ---- tutor_gateway: only the AI-operations tables. No learner, account, school or billing table is granted. ----
GRANT SELECT ON prompt_version, model_routing TO tutor_gateway;
GRANT SELECT, INSERT, UPDATE ON ai_gateway_log, ai_gateway_payload, redaction_event, boundary_attestation, ai_usage_cost TO tutor_gateway;
GRANT DELETE ON ai_gateway_payload TO tutor_gateway;   -- 14-day purge job
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tutor_gateway;

-- ---- tutor_readonly: analytics/replica user; explicit allow-list only (no identity or content tables) ----
GRANT SELECT ON engagement_daily, daily_goal_progress, ai_usage_cost, eval_run, eval_result TO tutor_readonly;

-- ---- Row-level security for school (B2B) tenancy ----
-- The application sets, per transaction:  SET LOCAL app.school_id = '<uuid>';  (teachers / school admins)
--                                          SET LOCAL app.rls_bypass = 'on';    (consumer/staff paths that are authorised elsewhere)
-- Integration tests MUST prove a teacher of school A gets zero rows for school B on every table below.
CREATE OR REPLACE FUNCTION rls_school_ok(row_school UUID) RETURNS BOOLEAN AS $$
    SELECT current_setting('app.rls_bypass', true) = 'on'
        OR row_school::text = current_setting('app.school_id', true)
$$ LANGUAGE sql STABLE;

ALTER TABLE school_class         ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_import        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mis_connection       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_connection       ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_dpa_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_dpa_signature ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order       ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_invoice       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kcsie_confirmation   ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_school_class   ON school_class         USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_roster_import  ON roster_import        USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_mis            ON mis_connection       USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_sso            ON sso_connection       USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_dpa_status     ON school_dpa_status    USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_dpa_sig        ON school_dpa_signature USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_po             ON purchase_order       USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_school_invoice ON school_invoice       USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));
CREATE POLICY p_kcsie          ON kcsie_confirmation   USING (rls_school_ok(school_id)) WITH CHECK (rls_school_ok(school_id));

-- RLS applies to non-owners. The migration/owner role bypasses it by design; tutor_app is NOT the owner.
