#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

docker compose \
  -f docker-compose.yml \
  -f docker-compose.hardened.yml \
  config --quiet

docker compose exec -T api \
  python -m compileall src migrations

docker compose exec -T api \
  pytest -m "static or unit" -q

docker compose exec -T api \
  pytest -m integration -q

docker compose exec -T frontend \
  pnpm exec tsc --noEmit

docker build \
  -f apps/backend/Dockerfile \
  -t dashai-api:problem7 \
  apps/backend

docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
  -f apps/frontend/Dockerfile \
  -t dashai-frontend:problem7 \
  apps/frontend

echo "Problem 7 test suite selesai."
