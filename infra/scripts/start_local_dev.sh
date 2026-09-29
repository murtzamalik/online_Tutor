#!/usr/bin/env bash
# Local smoke-test launcher for Study Loop (no mobile).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17)}"
export PATH="$JAVA_HOME/bin:$PATH"
cd "$ROOT"
cp -n .env.example .env 2>/dev/null || true

mkdir -p /tmp/studyloop-logs

echo "Starting infra (redis/minio/mailpit). Postgres expected on :5432"
docker compose --project-directory "$ROOT" -f "$ROOT/infra/docker-compose.yml" up -d redis minio mailpit >/dev/null

echo "Embedding :8100"
(cd embedding-service && EMBEDDING_STUB=true python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8100) \
  >/tmp/studyloop-logs/embed.log 2>&1 &

echo "AI gateway :8090"
(cd backend/ai-gateway && \
  SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/studyloop \
  SPRING_DATASOURCE_USERNAME=tutor_gateway_login \
  SPRING_DATASOURCE_PASSWORD=local_gateway_change_me \
  GATEWAY_SERVICE_TOKEN=local_gateway_service_token_change_me \
  AI_GATEWAY_STUB=true \
  EMBEDDING_SERVICE_URL=http://127.0.0.1:8100 \
  STUDYLOOP_GATEWAY_PROMPTS_PATH="$ROOT/ai_prompts" \
  java -jar target/ai-gateway-0.1.0-SNAPSHOT.jar) \
  >/tmp/studyloop-logs/gateway.log 2>&1 &

echo "Core API :8081"
(cd backend/core-api && \
  SERVER_PORT=8081 \
  SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/studyloop \
  SPRING_DATASOURCE_USERNAME=tutor_app_login \
  SPRING_DATASOURCE_PASSWORD=local_app_change_me \
  FLYWAY_USER=studyloop_owner \
  FLYWAY_PASSWORD=local_owner_change_me \
  JWT_SECRET=local_dev_jwt_secret_must_be_at_least_32_chars_long \
  AES_DATA_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  AI_GATEWAY_BASE_URL=http://127.0.0.1:8090 \
  GATEWAY_SERVICE_TOKEN=local_gateway_service_token_change_me \
  MAIL_HOST=localhost \
  MAIL_PORT=1025 \
  STUDYLOOP_MIGRATIONS="$ROOT/db/migrations" \
  java -jar target/core-api-0.1.0-SNAPSHOT.jar) \
  >/tmp/studyloop-logs/core.log 2>&1 &

echo "Web :3000"
(cd web && NEXT_PUBLIC_API_BASE=http://localhost:8081/api/v1 npm run dev -- --port 3000) \
  >/tmp/studyloop-logs/web.log 2>&1 &

echo "Waiting for health..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8081/actuator/health >/dev/null \
    && curl -sf http://127.0.0.1:8090/actuator/health >/dev/null \
    && curl -sf http://127.0.0.1:8100/health >/dev/null \
    && curl -sf http://127.0.0.1:3000/ >/dev/null; then
    echo "READY"
    echo "  Web:     http://localhost:3000"
    echo "  API:     http://localhost:8081/api/v1"
    echo "  Gateway: http://localhost:8090"
    echo "  Mailpit: http://localhost:8025"
    echo "  Logs:    /tmp/studyloop-logs/"
    exit 0
  fi
  sleep 1
done
echo "TIMEOUT — see /tmp/studyloop-logs/"
exit 1
