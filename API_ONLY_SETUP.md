# API-Only Configuration (No Local Models)

## Why API-Only?

To support free hosting on Render (512MB RAM), we removed local ML models (sentence-transformers) which required ~500MB RAM. Now the system uses API-based embeddings only.

## Supported Providers:

### For Embeddings (Required):
1. **OpenAI** - `text-embedding-ada-002`
   - Get key: https://platform.openai.com/api-keys
   - Cost: ~$0.0001 per 1K tokens

2. **HuggingFace** - `sentence-transformers/all-MiniLM-L6-v2`
   - Get key: https://huggingface.co/settings/tokens
   - Cost: Free (with rate limits)

3. **Cohere** - `embed-english-v3.0`
   - Get key: https://dashboard.cohere.com/api-keys
   - Cost: Free tier available

### For Chat (Optional):
- OpenAI GPT-4/3.5
- Anthropic Claude
- Google Gemini
- Cohere
- Groq

## Setup:

### Option 1: System-Wide API Key (Simple)
Add to `.env`:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

### Option 2: User-Provided API Keys (Recommended)
1. Leave `.env` empty
2. Users add their own keys in Settings page
3. Each user uses their own quota

## For Render Deployment:

Add environment variable:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

Or leave empty and require users to provide keys.

## Memory Usage:

- **Before (with sentence-transformers)**: ~600MB
- **After (API-only)**: ~150MB

✅ Now works on Render free tier!
