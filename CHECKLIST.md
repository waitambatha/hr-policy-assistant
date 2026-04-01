# 🚀 Deployment Checklist

## Before First Run

### 1. Database Setup
- [ ] PostgreSQL installed and running
- [ ] pgvector extension installed
- [ ] Database created: `hr_policy_rag`
- [ ] User created with proper permissions
- [ ] pgvector extension enabled: `CREATE EXTENSION vector;`

### 2. Environment Configuration
- [ ] `.env` file created (copy from `.env.example`)
- [ ] `OPENAI_API_KEY` set (required)
- [ ] `ANTHROPIC_API_KEY` set (if using Claude)
- [ ] `LLM_PROVIDER` set to 'openai' or 'claude'
- [ ] Database credentials configured
- [ ] `SECRET_KEY` generated (use Django's get_random_secret_key())

### 3. Python Environment
- [ ] Python 3.8+ installed
- [ ] Virtual environment created: `python -m venv venv`
- [ ] Virtual environment activated
- [ ] Dependencies installed: `pip install -r requirements.txt`

### 4. Django Setup
- [ ] Migrations created: `python manage.py makemigrations`
- [ ] Migrations applied: `python manage.py migrate`
- [ ] Static files collected (if deploying): `python manage.py collectstatic`
- [ ] Superuser created (optional): `python manage.py createsuperuser`

### 5. Testing
- [ ] Server starts: `python manage.py runserver`
- [ ] Homepage loads: http://localhost:8000
- [ ] Upload a test PDF
- [ ] Ask a test question
- [ ] Verify citations appear

## Quick Commands

```bash
# Full setup
./setup.sh

# Start server
python manage.py runserver

# Create admin user
python manage.py createsuperuser

# Access admin panel
http://localhost:8000/admin
```

## Troubleshooting

### "No module named 'pgvector'"
```bash
pip install pgvector
```

### "relation does not exist"
```bash
python manage.py migrate
```

### "OPENAI_API_KEY not set"
- Check `.env` file exists
- Verify API key is correct
- Restart Django server after changing .env

### Upload fails
```bash
mkdir -p media/documents
chmod 755 media
```

## Demo Preparation

1. **Clear old data**:
   ```bash
   python manage.py flush
   ```

2. **Upload sample documents**:
   - Prepare 2-3 HR policy PDFs
   - Upload via UI
   - Wait for processing

3. **Test questions**:
   - "What is the annual leave entitlement?"
   - "How does the disciplinary process work?"
   - "What benefits are included?"

4. **Show features**:
   - Document browser (right panel)
   - Citation system
   - Quick question buttons
   - LLM provider setting

## Production Deployment

- [ ] Set `DEBUG=False` in .env
- [ ] Configure `ALLOWED_HOSTS` in settings.py
- [ ] Use production database
- [ ] Set up proper SECRET_KEY
- [ ] Configure static files serving
- [ ] Set up HTTPS
- [ ] Configure CORS if needed
- [ ] Add authentication
- [ ] Set up monitoring
- [ ] Configure backups
