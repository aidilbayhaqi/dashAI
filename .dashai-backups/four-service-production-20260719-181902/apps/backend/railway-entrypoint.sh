#!/bin/sh
set -eu

upload_dir="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$upload_dir/public" "$upload_dir/private"
chown -R app:app "$upload_dir"

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[backend] running Alembic migrations..."
  gosu app alembic upgrade head
fi

echo "[backend] starting as app user: $*"
exec gosu app "$@"
