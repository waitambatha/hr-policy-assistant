#!/bin/bash

echo "🚀 Starting HR Policy RAG System..."

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run migrations automatically
echo "📦 Running migrations..."
python manage.py makemigrations assistant --noinput 2>/dev/null
python manage.py migrate --noinput

# Create default tenant and superuser if needed
python manage.py shell << 'EOF' 2>/dev/null
from assistant.models import Tenant
from django.contrib.auth.models import User

# Create default tenant
Tenant.objects.get_or_create(name="Default Tenant", slug="default")

# Create superuser if doesn't exist
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("✅ Created admin user (username: admin, password: admin123)")
EOF

echo "✅ Setup complete!"
echo ""
echo "🌐 Starting server on http://localhost:8000"
echo "👤 Login: username=admin, password=admin123"
echo ""

# Start Django server
python manage.py runserver
