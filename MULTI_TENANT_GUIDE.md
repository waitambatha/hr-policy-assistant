# Multi-Tenant Architecture Implementation

## What Was Added

### 1. Multi-Tenancy
- `Tenant` model for organization isolation
- Tenant-scoped documents and vectors
- `TenantMiddleware` for automatic tenant context

### 2. RBAC (Role-Based Access Control)
- User roles: `admin` (manage docs) and `employee` (query only)
- Decorators: `@admin_required`, `@role_required`, `@tenant_required`
- Permission checks on upload/delete operations

### 3. API Gateway
- JWT authentication (`/api/login/`)
- `@jwt_required` decorator for API endpoints
- Token-based access with 24h expiry

### 4. Rate Limiting
- `@rate_limit` decorator (20 requests/60 seconds default)
- Per-user and per-IP tracking
- Redis-backed rate limiting

### 5. Async Workers (Celery)
- `process_document_async` - Background document indexing
- `check_api_key_expiry` - Alert on unused keys (90 days)
- `cleanup_old_cache` - Remove stale cache entries (30 days)

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Update .env
```bash
# Add to .env
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
```

### 3. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Tenants
```python
python manage.py shell

from assistant.models import Tenant, UserProfile
from django.contrib.auth.models import User

# Create tenants
acme = Tenant.objects.create(name="Acme Corp", slug="acme")
beta = Tenant.objects.create(name="Beta Ltd", slug="beta")

# Assign users to tenants
user = User.objects.get(username='admin')
profile = user.profile
profile.tenant = acme
profile.role = 'admin'
profile.save()
```

### 5. Start Celery Worker
```bash
celery -A hr_policy_rag worker --loglevel=info
```

### 6. Start Celery Beat (for periodic tasks)
```bash
celery -A hr_policy_rag beat --loglevel=info
```

## API Usage

### Login
```bash
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### Query with JWT
```bash
curl -X POST http://localhost:8000/chat/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the leave policy?"}'
```

## Architecture Comparison

### Before (Single-Tenant)
```
User → Django → PostgreSQL (all docs)
```

### After (Multi-Tenant)
```
User → JWT Auth → Rate Limit → Tenant Middleware → Django
                                      ↓
                    Tenant-Filtered PostgreSQL + Redis Cache
                                      ↓
                              Celery Workers (Async)
```

## What's Still Missing (Optional)

1. **Weaviate Integration** - Replace pgvector with Weaviate for better multi-tenant vector isolation
2. **Object Store per Tenant** - S3 buckets per tenant instead of local filesystem
3. **Separate Microservices** - Split into document-service, query-service, key-management-service
4. **Email Alerts** - Implement actual email sending in Celery tasks
5. **API Gateway (Kong/Nginx)** - External gateway for production

## Testing

```bash
# Test tenant isolation
python manage.py shell

from assistant.models import Document, Tenant
acme = Tenant.objects.get(slug='acme')
beta = Tenant.objects.get(slug='beta')

# Acme docs
Document.objects.filter(tenant=acme).count()

# Beta docs (should be 0 if only uploaded to Acme)
Document.objects.filter(tenant=beta).count()
```

## Security Notes

- API keys are encrypted with Fernet (symmetric encryption)
- JWT tokens expire after 24 hours
- Rate limiting prevents abuse
- Tenant isolation prevents cross-tenant data access
- RBAC ensures only admins can upload/delete documents
