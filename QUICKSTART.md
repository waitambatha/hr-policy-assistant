# Quick Start Guide

## One Command Setup

```bash
python manage.py runserver
```

That's it! The system automatically:
- ✅ Runs database migrations
- ✅ Creates default tenant
- ✅ Creates admin user (username: `admin`, password: `admin123`)
- ✅ Starts the server on http://localhost:8000

## What Happens Automatically

### 1. Multi-Tenancy
- Default tenant is created automatically
- All users are assigned to default tenant
- You can create more tenants later

### 2. User Profiles
- Admin user is auto-created with admin role
- New users get profiles automatically
- Roles: `admin` (can upload docs) or `employee` (can only query)

### 3. Document Processing
- Runs synchronously by default (no Celery needed)
- Set `CELERY_ALWAYS_EAGER=False` in .env for async processing

### 4. Rate Limiting
- Works with in-memory cache if Redis not available
- 20 requests per 60 seconds per user

### 5. API Keys
- Encrypted per-user API keys
- Support for 10+ LLM providers
- Fallback to system-wide keys if user has none

## Login

Visit http://localhost:8000 and login with:
- **Username**: `admin`
- **Password**: `admin123`

## Upload Documents

1. Login as admin
2. Click upload area in right panel
3. Select PDF or DOCX file
4. Wait for processing (shows in console)
5. Ask questions!

## Create More Users

```bash
python manage.py createsuperuser
```

Or use Django admin: http://localhost:8000/admin

## Multi-Tenant Setup (Optional)

If you want multiple organizations:

```bash
python manage.py shell
```

```python
from assistant.models import Tenant, UserProfile
from django.contrib.auth.models import User

# Create new tenant
acme = Tenant.objects.create(name="Acme Corp", slug="acme")

# Assign user to tenant
user = User.objects.get(username='someuser')
user.profile.tenant = acme
user.profile.save()
```

## Enable Async Processing (Optional)

1. Install Redis:
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
```

2. Update .env:
```bash
CELERY_ALWAYS_EAGER=False
```

3. Start Celery worker (separate terminal):
```bash
celery -A hr_policy_rag worker --loglevel=info
```

## Troubleshooting

**Port already in use:**
```bash
python manage.py runserver 8001
```

**Database errors:**
```bash
python manage.py migrate --run-syncdb
```

**Reset everything:**
```bash
rm db.sqlite3
python manage.py runserver
```

## Features

- ✅ Multi-tenant isolation
- ✅ Role-based access control (Admin/Employee)
- ✅ Encrypted API keys per user
- ✅ JWT authentication for API
- ✅ Rate limiting
- ✅ Document processing (sync/async)
- ✅ Vector search with pgvector
- ✅ 10+ LLM provider support
- ✅ Redis caching (optional)
- ✅ Celery workers (optional)

## Next Steps

1. Upload your HR policy documents
2. Configure your preferred LLM provider in settings
3. Add your API keys in user settings
4. Create more users and assign roles
5. Set up multiple tenants if needed

Enjoy! 🚀
