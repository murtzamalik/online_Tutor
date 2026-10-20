#!/usr/bin/env bash
# Auth endpoint smoke test against Caddy (public API on :8080).
#
# Full stack bring-up:
#   cd "$(git rev-parse --show-toplevel)" && docker compose -p studyloop --project-directory . -f infra/docker-compose.yml up -d --build
#
# Usage: ./infra/scripts/auth-smoke.sh EMAIL PASSWORD
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 EMAIL PASSWORD" >&2
  exit 2
fi

EMAIL="$1"
PASSWORD="$2"
BASE_URL="${AUTH_SMOKE_BASE_URL:-http://localhost:8080/api/v1}"

response="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"

http_code="${response##*$'\n'}"
body="${response%$'\n'*}"
http_code="${http_code//$'\n'/}"

if [[ "$http_code" != "200" ]]; then
  echo "Login failed HTTP ${http_code}" >&2
  echo "$body" >&2
  exit 1
fi

if ! echo "$body" | grep -q '"accessToken"'; then
  echo "Login HTTP 200 but response missing accessToken" >&2
  echo "$body" >&2
  exit 1
fi

echo "OK login HTTP 200 with accessToken"
echo "$body"
