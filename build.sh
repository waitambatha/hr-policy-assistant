#!/usr/bin/env bash
# Render build script

set -o errexit

pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Initialize system (create default tenant)
python manage.py init_system
