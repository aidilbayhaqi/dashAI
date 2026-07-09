#!/bin/sh

set -eu


case "${1:-}" in
  alembic|python|pytest|sh|bash)
    exec "$@"
    ;;
esac


AUTO_MIGRATE_NORMALIZED="$(
  printf '%s' "${AUTO_MIGRATE:-true}" \
  | tr '[:upper:]' '[:lower:]'
)"


if [ "$AUTO_MIGRATE_NORMALIZED" = "true" ] \
  || [ "$AUTO_MIGRATE_NORMALIZED" = "1" ]; then

  echo "▶ Checking and applying database migrations..."

  python -m src.scripts.db_startup upgrade

else

  echo "⚠ AUTO_MIGRATE disabled; verifying database revision..."

  python -m src.scripts.db_startup verify

fi


exec "$@"