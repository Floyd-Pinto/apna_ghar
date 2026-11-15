#!/bin/sh
# Prepares the database, then runs the container command (the Django server by default).
set -e

if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -q '^postgres'; then
  echo "Waiting for Postgres..."
  python - <<'PY'
import os, time
import psycopg2
for attempt in range(60):
    try:
        psycopg2.connect(os.environ["DATABASE_URL"]).close()
        break
    except psycopg2.OperationalError:
        time.sleep(1)
else:
    raise SystemExit("Postgres did not become ready")
PY
fi

python manage.py migrate --noinput
python manage.py ensure_admin

# First start only: optionally load the CSV export of the old cloud database
if [ "${IMPORT_CLOUD_EXPORT:-false}" = "true" ] && [ ! -f /app/media/.cloud-export-imported ]; then
  python manage.py import_cloud_export --replace
  mkdir -p /app/media && touch /app/media/.cloud-export-imported
fi

exec "$@"
