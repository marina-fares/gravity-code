#!/bin/bash
# entrypoint.sh

set -euo pipefail

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

echo "== [4/4] Starting Gunicorn..."
exec gunicorn Config.wsgi:application \
    --bind 0.0.0.0:5000 \
    --workers "${GUNICORN_WORKERS:-4}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --reload \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --log-level "${LOG_LEVEL:-info}" \
    --access-logfile - \
    --error-logfile -