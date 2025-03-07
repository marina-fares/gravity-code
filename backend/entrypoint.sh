#!/bin/bash

set -e

echo '== Installing dependencies'
pipenv install
pipenv install --system

echo '== Build Assets'
python manage.py collectstatic --noinput

echo '== Run Migrations'
python manage.py migrate

echo '== Run Server'
python manage.py runserver 44.201.113.49:5000
