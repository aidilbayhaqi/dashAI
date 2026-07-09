#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[backend] running Alembic migrations..."
  alembic upgrade head
fi

echo "[backend] starting: $*"
exec "$@"
