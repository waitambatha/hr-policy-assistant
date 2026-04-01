# HR Policy RAG Assistant - POC Summary

## 🎯 What We Built

A fully functional RAG (Retrieval-Augmented Generation) system for HR policy Q&A with:
- Clean, modern UI matching the design mockup
- PDF document upload and processing
- Vector similarity search using pgvector
- LLM-powered responses with exact citations
- Support for both OpenAI and Claude APIs

## 📁 Project Structure

```
RAG_POC/
├── manage.py                          # Django management script
├── requirements.txt                   # Python dependencies
├── .env                              # Environment variables (API keys, DB config)
├── .env.example                      # Template for .env
├── README.md                         # Setup instructions
├── setup.sh                          # Quick setup script
│
├── hr_policy_rag/                    # Django project settings
│   ├── settings.py                   # Main configuration
│   ├── urls.py                       # URL routing
│   └── wsgi.py                       # WSGI config
│
└── assistant/                        # Main Django app
    ├── models.py                     # Database models (Document, DocumentChunk, ChatMessage)
    ├── views.py                      # Request handlers
    ├── urls.py                       # App URLs
    ├── services.py                   # RAG logic (embedding, chunking, querying)
    ├── admin.py                      # Django admin config
    │
    ├── templates/assistant/
    │   └── index.html               # Main UI template
    │
    └── static/assistant/
        ├── css/style.css            # Styling
        └── js/main.js               # Frontend logic
```

## 🔧 Key Components

### 1. Models (models.py)
- **Document**: Stores uploaded PDFs with metadata
- **DocumentChunk**: Text chunks with embeddings (pgvector)
- **ChatMessage**: Chat history with citations

### 2. RAG Pipeline (services.py)
- `extract_text_from_pdf()`: Extracts text from PDFs by page
- `chunk_text()`: Splits text into manageable chunks
- `get_embedding()`: Generates OpenAI embeddings
- `process_document()`: Full pipeline for new documents
- `query_rag()`: Retrieves relevant chunks and generates answers

### 3. Views (views.py)
- `index`: Main page with chat and documents
- `upload_document`: Handles PDF uploads
- `chat`: Processes questions and returns answers
- `clear_chat`: Clears chat history

### 4. Frontend
- **HTML**: Clean two-panel layout (chat + documents)
- **CSS**: Modern, responsive design
- **JavaScript**: AJAX chat, real-time updates

## 🚀 How It Works

1. **Upload**: User uploads PDF → Extracted → Chunked → Embedded → Stored in pgvector
2. **Query**: User asks question → Question embedded → Vector search finds top 5 chunks
3. **Generate**: Chunks + question sent to LLM → Response with citations returned
4. **Display**: Answer shown with document/section/page references

## 🎨 Features Implemented

✅ PDF upload via UI
✅ Automatic text extraction and chunking
✅ Vector embeddings (OpenAI text-embedding-ada-002)
✅ Similarity search (pgvector cosine distance)
✅ LLM responses (OpenAI GPT-4 or Claude)
✅ Citation tracking (document, section, page)
✅ Session-based chat history
✅ Quick question buttons
✅ Document browser
✅ Clean, professional UI

## 🔑 Configuration

Edit `.env` to configure:
- `LLM_PROVIDER`: Choose 'openai' or 'claude'
- `OPENAI_API_KEY`: Required for embeddings
- `ANTHROPIC_API_KEY`: Optional, for Claude chat
- Database credentials

## 📊 Tech Stack

- **Backend**: Django 5.0
- **Database**: PostgreSQL + pgvector
- **Embeddings**: OpenAI (text-embedding-ada-002)
- **LLM**: OpenAI GPT-4 or Claude 3 Sonnet
- **PDF Processing**: PyPDF2
- **Frontend**: HTML/CSS/JavaScript (vanilla)

## 🎯 POC Objectives Met

✅ Demonstrates RAG expertise
✅ Clean, professional UI
✅ Full document processing pipeline
✅ Accurate citation system
✅ Configurable LLM provider
✅ Production-ready architecture
✅ Easy to deploy and demo

## 🚦 Quick Start

```bash
# 1. Setup
./setup.sh

# 2. Configure
# Edit .env with your API keys

# 3. Run
python manage.py runserver

# 4. Visit
http://localhost:8000
```

## 📝 Next Steps for Production

- Add authentication (SSO/LDAP)
- Implement role-based access control
- Add document versioning
- Optimize chunking strategy
- Add streaming responses
- Deploy to cloud (AWS/Azure/GCP)
- Add monitoring and logging
- Implement caching layer
