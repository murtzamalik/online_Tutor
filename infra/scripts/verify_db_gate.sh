#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
cp -n .env.example .env 2>/dev/null || true
docker compose -f infra/docker-compose.yml up -d postgres
echo "Waiting for postgres..."
for i in $(seq 1 60); do
  if docker compose -f infra/docker-compose.yml exec -T postgres pg_isready -U studyloop_owner -d studyloop >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
# Run flyway via docker
docker run --rm --network "$(docker compose -f infra/docker-compose.yml ps -q postgres | xargs docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')" \
  -v "$ROOT/db/migrations:/flyway/sql" \
  flyway/flyway:10-alpine \
  -url=jdbc:postgresql://postgres:5432/studyloop \
  -user=studyloop_owner \
  -password="${POSTGRES_PASSWORD:-local_owner_change_me}" \
  migrate

# Boundary + RLS checks
docker compose -f infra/docker-compose.yml exec -T postgres \
  env PGPASSWORD="${POSTGRES_PASSWORD:-local_owner_change_me}" \
  psql -U studyloop_owner -d studyloop -v ON_ERROR_STOP=1 <<'SQL'
-- ensure login roles after V012
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='tutor_app_login') THEN
    CREATE ROLE tutor_app_login LOGIN PASSWORD 'local_app_change_me';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='tutor_gateway_login') THEN
    CREATE ROLE tutor_gateway_login LOGIN PASSWORD 'local_gateway_change_me';
  END IF;
END $$;
GRANT tutor_app TO tutor_app_login;
GRANT tutor_gateway TO tutor_gateway_login;

-- Boundary: gateway cannot read learner tables
SET ROLE tutor_gateway;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM student_profile LIMIT 1;
    RAISE EXCEPTION 'BOUNDARY FAIL: tutor_gateway could read student_profile';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'BOUNDARY OK: student_profile denied';
  END;
END $$;
RESET ROLE;

-- RLS isolation seed
INSERT INTO school (school_id, name, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'A', 'ACTIVE'),
       ('22222222-2222-2222-2222-222222222222', 'B', 'ACTIVE')
ON CONFLICT DO NOTHING;
INSERT INTO school_class (class_id, school_id, name, academic_year)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '11A', '2026/27')
ON CONFLICT DO NOTHING;

SET ROLE tutor_app;
BEGIN;
SELECT set_config('app.school_id', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('app.rls_bypass', 'off', true);
SELECT CASE WHEN COUNT(*) = 1 THEN 'RLS OK school A' ELSE 'RLS FAIL school A' END FROM school_class;
SELECT set_config('app.school_id', '22222222-2222-2222-2222-222222222222', true);
SELECT CASE WHEN COUNT(*) = 0 THEN 'RLS OK school B empty' ELSE 'RLS FAIL school B' END FROM school_class;
ROLLBACK;
RESET ROLE;
SQL
echo "DB gate checks completed"
