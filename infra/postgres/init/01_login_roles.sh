#!/bin/bash
set -euo pipefail
# Docker entrypoint expands env before exec; use psql -c with expanded password.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c \
  "DO \$\$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app_login') THEN
       EXECUTE format('CREATE ROLE tutor_app_login LOGIN PASSWORD %L', '${TUTOR_APP_PASSWORD}');
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_gateway_login') THEN
       EXECUTE format('CREATE ROLE tutor_gateway_login LOGIN PASSWORD %L', '${TUTOR_GATEWAY_PASSWORD}');
     END IF;
   END \$\$;"
