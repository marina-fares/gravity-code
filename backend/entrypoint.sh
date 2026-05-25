#!/bin/bash
# entrypoint.sh

set -euo pipefail

echo "== [0/4] Starting cron daemon..."
# Must run as root (container default after removing USER appuser from Dockerfile).
# 'service cron start' works on Debian/Ubuntu-based images; falls back to
# running the binary directly if the service wrapper is absent.
service cron start 2>/dev/null || cron
echo "   Cron daemon started."

echo "== [1/4] Waiting for PostgreSQL..."
connected=false
for i in $(seq 1 30); do
    python -c "
import os, sys
try:
    import psycopg2
    psycopg2.connect(
        host=os.environ['PGHOST'],
        port=os.environ['PGPORT'],
        user=os.environ['PGUSER'],
        password=os.environ['PGPASSWORD'],
        dbname=os.environ['PGDATABASE'],
    )
    sys.exit(0)
except Exception:
    sys.exit(1)
" && connected=true && echo "   Postgres is ready." && break
    echo "   Not ready yet (attempt $i/30), retrying in 1s..."
    sleep 1
done

if [ "$connected" = false ]; then
    echo "ERROR: Could not connect to PostgreSQL after 30 attempts. Exiting."
    exit 1
fi

# echo "== [2/4] Running migrations..."
# python manage.py makemigrations Main --noinput
# python manage.py migrate --noinput

echo "== [3/4] Registering cron jobs..."
# crontab add only registers the schedule — the cron daemon
# is started as root in the Dockerfile before USER appuser
python manage.py crontab add || echo "Warning: crontab add failed, continuing..."

echo "== [3b/4] Generating sessions (midnight task on startup)..."
python manage.py run_midnight_task || echo "Warning: midnight task failed on startup, continuing..."

echo "== [4/4] Starting Gunicorn..."
GUNICORN_ARGS=(
    Config.wsgi:application
    --bind 0.0.0.0:5000
    --workers "${GUNICORN_WORKERS:-4}"
    --threads "${GUNICORN_THREADS:-2}"
    --timeout "${GUNICORN_TIMEOUT:-120}"
    --keep-alive 5
    --max-requests 1000
    --max-requests-jitter 100
    --log-level "${LOG_LEVEL:-info}"
    --access-logfile -
    --error-logfile -
)

if [ "${GUNICORN_RELOAD:-false}" = "true" ]; then
    echo "   Auto-reload enabled (GUNICORN_RELOAD=true)"
    GUNICORN_ARGS+=(--reload)
fi

exec gunicorn "${GUNICORN_ARGS[@]}"