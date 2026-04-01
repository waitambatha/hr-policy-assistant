from django.conf import settings
from openai import OpenAI
from anthropic import Anthropic
import PyPDF2
from docx import Document as DocxDocument
from .models import DocumentChunk, QueryCache
from pgvector.django import CosineDistance
import requests
from sentence_transformers import SentenceTransformer
import os
import hashlib
import time
from django.core.cache import cache

# Initialize clients
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

# Initialize embedding model for HuggingFace/Ollama
embedding_model = None
if settings.LLM_PROVIDER in ['huggingface', 'ollama']:
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text):
    """Generate embedding using configured provider"""
    if settings.LLM_PROVIDER == 'openai':
        response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    elif settings.LLM_PROVIDER in ['huggingface', 'ollama']:
        # Use local sentence transformer
        embedding = embedding_model.encode(text)
        return embedding.tolist()
    else:
        raise ValueError(f"Unsupported LLM provider: {settings.LLM_PROVIDER}")

def extract_text_from_pdf(pdf_file):
    """Extract text from PDF with page numbers"""
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    pages = []
    for i, page in enumerate(pdf_reader.pages):
        text = page.extract_text()
        pages.append({
            'page_number': i + 1,
            'content': text
        })
    return pages, len(pdf_reader.pages)

def extract_text_from_docx(docx_file):
    """Extract text from DOCX with page estimation"""
    doc = DocxDocument(docx_file)
    pages = []
    current_page = 1
    current_content = []
    char_count = 0
    chars_per_page = 3000  # Approximate characters per page
    
    for para in doc.paragraphs:
        text = para.text
        current_content.append(text)
        char_count += len(text)
        
        # Estimate page breaks
        if char_count >= chars_per_page:
            pages.append({
                'page_number': current_page,
                'content': '\n'.join(current_content)
            })
            current_page += 1
            current_content = []
            char_count = 0
    
    # Add remaining content
    if current_content:
        pages.append({
            'page_number': current_page,
            'content': '\n'.join(current_content)
        })
    
    return pages, current_page

def extract_text_from_document(file_path):
    """Extract text from PDF or DOCX based on file extension"""
    ext = os.path.splitext(file_path)[1].lower()
    
    with open(file_path, 'rb') as f:
        if ext == '.pdf':
            return extract_text_from_pdf(f)
        elif ext in ['.docx', '.doc']:
            return extract_text_from_docx(f)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

def chunk_text(text, chunk_size=500):
    """Simple chunking by characters"""
    words = text.split()
    chunks = []
    current_chunk = []
    current_size = 0
    
    for word in words:
        current_chunk.append(word)
        current_size += len(word) + 1
        
        if current_size >= chunk_size:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_size = 0
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def process_document(document):
    """Process uploaded document: extract text, chunk, embed, and store"""
    pages, page_count = extract_text_from_document(document.file.path)
    document.page_count = page_count
    
    section_count = 0
    for page_data in pages:
        page_num = page_data['page_number']
        content = page_data['content']
        
        # Simple section detection (lines starting with numbers or "Section")
        sections = []
        current_section = ""
        current_text = []
        
        for line in content.split('\n'):
            if line.strip().startswith(('Section', 'SECTION', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
                if current_text:
                    sections.append({
                        'section': current_section,
                        'text': '\n'.join(current_text)
                    })
                    current_text = []
                current_section = line.strip()[:100]
                section_count += 1
            current_text.append(line)
        
        if current_text:
            sections.append({
                'section': current_section,
                'text': '\n'.join(current_text)
            })
        
        # If no sections found, treat whole page as one section
        if not sections:
            sections = [{'section': '', 'text': content}]
        
        # Chunk and embed each section
        for section_data in sections:
            chunks = chunk_text(section_data['text'])
            for chunk in chunks:
                if chunk.strip():
                    embedding = get_embedding(chunk)
                    DocumentChunk.objects.create(
                        document=document,
                        content=chunk,
                        section=section_data['section'],
                        page_number=page_num,
                        embedding=embedding
                    )
    
    document.section_count = section_count
    document.save()

def query_rag(question, user=None, tenant=None):
    """Query RAG system with caching and return response with citations"""
    start_time = time.time()
    
    # Check cache first (tenant-scoped)
    cache_key_suffix = f"_{tenant.id}" if tenant else ""
    question_hash = hashlib.sha256(question.lower().strip().encode()).hexdigest()
    cached = cache.get(f'rag_answer:{question_hash}{cache_key_suffix}')
    
    if cached:
        # Update cache hit count
        try:
            cache_obj = QueryCache.objects.get(question_hash=question_hash)
            cache_obj.hit_count += 1
            cache_obj.save()
        except QueryCache.DoesNotExist:
            pass
        
        return cached['answer'], cached['citations']
    
    # Get question embedding
    question_embedding = get_embedding(question)
    
    # Find most relevant chunks (tenant-filtered)
    chunks_query = DocumentChunk.objects.annotate(
        distance=CosineDistance('embedding', question_embedding)
    )
    
    if tenant:
        chunks_query = chunks_query.filter(document__tenant=tenant)
    
    relevant_chunks = chunks_query.order_by('distance')[:5]
    
    if not relevant_chunks:
        return "No documents have been indexed yet. Please upload some policy documents first.", []
    
    # Build context from chunks
    context_parts = []
    citations = []
    
    for chunk in relevant_chunks:
        context_parts.append(f"[Document: {chunk.document.title}, Section: {chunk.section or 'N/A'}, Page: {chunk.page_number}]\n{chunk.content}")
        citations.append({
            'document': chunk.document.title,
            'section': chunk.section or 'N/A',
            'page': chunk.page_number
        })
    
    context = "\n\n".join(context_parts)
    
    # Build prompt
    prompt = f"""You are an HR Policy Assistant. Answer the employee's question based on the provided policy documents.

Always cite the exact document, section, and page number in your response.

Context from policy documents:
{context}

Employee question: {question}

Provide a clear answer with specific citations (e.g., "Section 4.2 - Annual Leave Entitlement, HR Policy Manual 2024.pdf - Page 34")."""
    
    # Get user's API key if available
    api_key = None
    provider = settings.LLM_PROVIDER
    
    if user and user.is_authenticated:
        try:
            from .models import APIKey
            profile = user.profile
            provider = profile.preferred_provider or settings.LLM_PROVIDER
            key_obj = APIKey.objects.get(user=user, provider=provider, is_active=True)
            api_key = key_obj.decrypt_key()
        except:
            pass
    
    # Get LLM response based on provider
    answer = get_llm_response(prompt, provider, api_key)
    
    # Cache the result
    cache.set(f'rag_answer:{question_hash}', {
        'answer': answer,
        'citations': citations
    }, timeout=86400)  # 24 hours
    
    # Save to database cache
    QueryCache.objects.create(
        question_hash=question_hash,
        question=question,
        answer=answer,
        citations=citations,
        hit_count=1
    )
    
    return answer, citations

def get_llm_response(prompt, provider, api_key=None):
    """Get response from LLM provider"""
    try:
        if provider == 'openai':
            client = OpenAI(api_key=api_key or settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            return response.choices[0].message.content
            
        elif provider == 'anthropic':
            client = Anthropic(api_key=api_key or settings.ANTHROPIC_API_KEY)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
            
        elif provider == 'google':
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content(prompt)
            return response.text
            
        elif provider == 'cohere':
            import cohere
            co = cohere.Client(api_key)
            response = co.generate(prompt=prompt, max_tokens=1000)
            return response.generations[0].text
            
        elif provider == 'groq':
            from groq import Groq
            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
            
        elif provider == 'together':
            response = requests.post(
                'https://api.together.xyz/v1/chat/completions',
                headers={'Authorization': f'Bearer {api_key}'},
                json={
                    'model': 'meta-llama/Llama-3-70b-chat-hf',
                    'messages': [{'role': 'user', 'content': prompt}]
                }
            )
            return response.json()['choices'][0]['message']['content']
            
        elif provider == 'ollama':
            response = requests.post('http://localhost:11434/api/generate', json={
                'model': 'llama3.2:3b',
                'prompt': prompt,
                'stream': False
            })
            return response.json()['response']
            
        elif provider == 'huggingface':
            headers = {"Authorization": f"Bearer {api_key or settings.HUGGINGFACE_API_KEY}"}
            response = requests.post(
                "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
                headers=headers,
                json={"inputs": prompt, "parameters": {"max_new_tokens": 500}}
            )
            return response.json()[0]['generated_text']
            
        else:
            return "LLM provider not configured correctly."
            
    except Exception as e:
        return f"Error getting LLM response: {str(e)}"

def test_provider_key(provider, api_key):
    """Test if API key is valid for provider"""
    try:
        if provider == 'openai':
            client = OpenAI(api_key=api_key)
            client.models.list()
            return True, "OpenAI API key is valid"
            
        elif provider == 'anthropic':
            client = Anthropic(api_key=api_key)
            client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}]
            )
            return True, "Anthropic API key is valid"
            
        elif provider == 'google':
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            list(genai.list_models())
            return True, "Google API key is valid"
            
        elif provider == 'cohere':
            import cohere
            co = cohere.Client(api_key)
            co.generate(prompt="test", max_tokens=10)
            return True, "Cohere API key is valid"
            
        elif provider == 'groq':
            from groq import Groq
            client = Groq(api_key=api_key)
            client.models.list()
            return True, "Groq API key is valid"
            
        elif provider == 'together':
            response = requests.get(
                'https://api.together.xyz/v1/models',
                headers={'Authorization': f'Bearer {api_key}'}
            )
            if response.status_code == 200:
                return True, "Together AI API key is valid"
            return False, "Invalid API key"
            
        elif provider == 'huggingface':
            headers = {"Authorization": f"Bearer {api_key}"}
            response = requests.get(
                "https://huggingface.co/api/whoami-v2",
                headers=headers
            )
            if response.status_code == 200:
                return True, "HuggingFace API key is valid"
            return False, "Invalid API key"
            
        else:
            return False, f"Provider {provider} not supported"
            
    except Exception as e:
        return False, f"API key test failed: {str(e)}"
