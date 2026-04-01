#!/usr/bin/env bash
# Render build script

set -o errexit

# Clear any cached packages
pip cache purge || true

pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Ensure schema exists and set search path
python << EOF
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_policy_rag.settings')
import django
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    schema = os.getenv('DB_SCHEMA', 'public')
    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema};")
    cursor.execute(f"SET search_path TO {schema};")
    print(f"✅ Schema {schema} ready")
EOF

# Run migrations
python manage.py migrate

# Initialize system (create default tenant)
python manage.py init_system
