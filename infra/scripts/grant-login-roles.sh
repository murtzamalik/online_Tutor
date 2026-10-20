#!/usr/bin/env bash
# After V011, grant LOGIN roles membership + schema defaults. Idempotent.
set -euo pipefail
: "${DATABASE_URL:?}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app_login') THEN
    GRANT tutor_app TO tutor_app_login;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_gateway')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_gateway_login') THEN
    GRANT tutor_gateway TO tutor_gateway_login;
  END IF;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tutor_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tutor_app;
SQL
