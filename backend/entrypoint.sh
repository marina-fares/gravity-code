#!/bin/bash
set -e

echo '== Run Migrations'
python manage.py migrate --noinput

echo '== Collect Static'
python manage.py collectstatic --noinput

echo '== Starting Gunicorn'
exec gunicorn Config.wsgi:application \
  --bind 0.0.0.0:5000 \
  --workers 4 \
  --threads 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -