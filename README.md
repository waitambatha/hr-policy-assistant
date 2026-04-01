# HR Policy RAG Assistant - Setup Instructions

## Prerequisites
- Python 3.8+
- Supabase account (free tier)
- OpenAI API key (optional, for embeddings)
- Claude API key (optional, if using Claude for chat)

## Installation Steps

### 1. Setup Supabase Database

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run:

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

4. Get your connection details from Settings → Database

### 2. Setup Python Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
LLM_PROVIDER=ollama  # or 'openai', 'claude'
OPENAI_API_KEY=sk-your-openai-key-here  # optional
ANTHROPIC_API_KEY=sk-ant-your-claude-key-here  # optional

# Supabase PostgreSQL
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_SCHEMA=hr_rag

SECRET_KEY=your-django-secret-key-here
DEBUG=True
```

### 4. Run Migrations

```bash
python manage.py migrate
```

### 5. Run Development Server

```bash
python manage.py runserver
```

**That's it!** The system will automatically:
- Run migrations to Supabase
- Create default tenant
- Create admin user (username: `admin`, password: `admin123`)
- Start the server

Visit: http://localhost:8000

## Usage

1. **Upload Documents**: Click the upload area in the right panel to upload PDF policy documents
2. **Wait for Processing**: Documents are automatically chunked, embedded, and indexed
3. **Ask Questions**: Type questions in the chat interface
4. **Get Cited Answers**: Responses include exact section and page references

## Features

- ✅ PDF document upload and processing
- ✅ Automatic text extraction and chunking
- ✅ Vector embeddings with pgvector
- ✅ RAG-powered Q&A with citations
- ✅ Support for both OpenAI and Claude
- ✅ Clean, modern UI
- ✅ Session-based chat history

## Architecture

```
User Question
    ↓
Generate Embedding (OpenAI)
    ↓
Vector Similarity Search (pgvector)
    ↓
Retrieve Top 5 Relevant Chunks
    ↓
Build Context + Prompt
    ↓
LLM Response (OpenAI/Claude)
    ↓
Return Answer with Citations
```

## Troubleshooting

**pgvector not found:**
- Ensure PostgreSQL dev headers are installed
- Reinstall pgvector extension
- Restart PostgreSQL service

**API errors:**
- Verify API keys in .env
- Check API key permissions and quotas
- Ensure correct LLM_PROVIDER setting

**Upload errors:**
- Check file permissions on media directory
- Ensure PDF is not corrupted
- Check Django MEDIA_ROOT settings
