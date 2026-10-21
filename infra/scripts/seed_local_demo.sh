#!/usr/bin/env bash
# LOCAL DEMO ONLY. Adds one demo account per role (teacher, school admin, ops, DSL, support,
# compliance, AI engineer, owner) once core-api has run the Flyway migrations. Re-runnable.
# Usage: infra/scripts/seed_local_demo.sh [postgres-container]   (default: studyloop-postgres-1)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG="${1:-studyloop-postgres-1}"

echo "Waiting for migrations (account table)..."
for i in $(seq 1 90); do
  if docker exec "$PG" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select 1 from flyway_schema_history limit 1"' >/dev/null 2>&1; then
    docker exec -i "$PG" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$ROOT/infra/scripts/seed_local_demo_roles.sql"
    echo "Demo role accounts ready (password ReviewerDemo!23) — see docs/LOCAL_DEMO_ACCOUNTS.md"
    exit 0
  fi
  sleep 2
done
echo "Migrations did not finish in time; is core-api running?" >&2
exit 1
