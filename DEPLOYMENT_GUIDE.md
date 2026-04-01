# Supabase + Render Deployment Guide

## Step 1: Setup Supabase Database

1. Go to Supabase SQL Editor
2. Run this SQL:

```sql
-- Create hr_rag schema
CREATE SCHEMA IF NOT EXISTS hr_rag;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions
GRANT ALL ON SCHEMA hr_rag TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA hr_rag TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_rag GRANT ALL ON TABLES TO postgres;
```

## Step 2: Test Connection Locally

```bash
# Update .env with your Supabase credentials
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=rgym%25d%24qjmVxHn6T%40MaB%2AaM%25w6Tj1g8
DB_HOST=db.vtljutjljmkipalirdxt.supabase.co
DB_PORT=5432
DB_SCHEMA=hr_rag

# Test connection
python manage.py check
python manage.py migrate
```

## Step 3: Deploy to Render

1. Create account on render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:

**Build Command:**
```bash
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
```

**Start Command:**
```bash
gunicorn hr_policy_rag.wsgi:application
```

**Environment Variables:**
```
PYTHON_VERSION=3.11
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=rgym%d$qjmVxHn6T@MaB*aM%w6Tj1g8
DB_HOST=db.vtljutjljmkipalirdxt.supabase.co
DB_PORT=5432
DB_SCHEMA=hr_rag
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app.onrender.com
LLM_PROVIDER=ollama
REDIS_URL=redis://red-xxx:6379
CELERY_ALWAYS_EAGER=True
ENCRYPTION_KEY=your-encryption-key
```

## Step 4: File Storage (Cloudinary)

Since Render has no persistent storage, use Cloudinary:

1. Sign up at cloudinary.com (free)
2. Add to requirements.txt:
```
django-cloudinary-storage
```

3. Update settings.py:
```python
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET')
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
```

4. Add to Render env vars:
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Architecture:

```
User → Render (Django App)
         ↓
    Supabase (PostgreSQL + pgvector)
         ↓
    Cloudinary (PDF Storage)
```

## Cost: $0/month

- Render: Free tier (512MB RAM)
- Supabase: Free tier (500MB DB)
- Cloudinary: Free tier (25GB storage)

## Notes:

- Render free tier sleeps after 15min inactivity
- First request after sleep takes ~30 seconds
- Upgrade to $7/month for always-on
