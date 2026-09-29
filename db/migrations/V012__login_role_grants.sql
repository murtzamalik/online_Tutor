-- =============================================================================
-- V012 — Grant LOGIN wrapper roles membership of V011 application roles.
-- Passwords for LOGIN roles are set by infrastructure (docker init / secrets), never here.
-- Forward-only; does not alter V001–V011.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app_login') THEN
        CREATE ROLE tutor_app_login NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_gateway_login') THEN
        CREATE ROLE tutor_gateway_login NOLOGIN;
    END IF;
END $$;

GRANT tutor_app TO tutor_app_login;
GRANT tutor_gateway TO tutor_gateway_login;

-- Ensure future tables created by owner still grant DML to tutor_app
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tutor_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tutor_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tutor_gateway;
