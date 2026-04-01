#!/bin/bash

echo "🚀 Setting up Multi-Tenant RAG System..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install celery PyJWT

# Run migrations
echo "🗄️  Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Create sample tenants
echo "🏢 Creating sample tenants..."
python manage.py shell << EOF
from assistant.models import Tenant
from django.contrib.auth.models import User

# Create tenants
acme, _ = Tenant.objects.get_or_create(name="Acme Corp", slug="acme")
beta, _ = Tenant.objects.get_or_create(name="Beta Ltd", slug="beta")

print(f"✅ Created tenants: {acme.name}, {beta.name}")

# Create admin user if doesn't exist
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("✅ Created admin user (username: admin, password: admin123)")
else:
    admin = User.objects.get(username='admin')
    print("✅ Admin user already exists")

# Assign admin to Acme
from assistant.models import UserProfile
profile, created = UserProfile.objects.get_or_create(user=admin)
profile.tenant = acme
profile.role = 'admin'
profile.save()
print(f"✅ Assigned admin to {acme.name} as admin")

EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start Django: python manage.py runserver"
echo "2. Start Celery: celery -A hr_policy_rag worker --loglevel=info"
echo "3. Login with: username=admin, password=admin123"
echo ""
echo "📖 See MULTI_TENANT_GUIDE.md for full documentation"
