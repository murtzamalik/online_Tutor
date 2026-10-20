#!/usr/bin/env bash
# Generate a simple textual ERD listing from information_schema (no GUI deps).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${ROOT}/docs/erd"
mkdir -p "$OUT_DIR"
: "${DATABASE_URL:?Set DATABASE_URL e.g. postgres://studyloop_owner:pass@localhost:5432/studyloop}"
psql "$DATABASE_URL" -Atc "
SELECT table_name || E'\n' || string_agg('  - ' || column_name || ' ' || data_type, E'\n' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
" > "${OUT_DIR}/schema_tables.txt"
echo "Wrote ${OUT_DIR}/schema_tables.txt"
