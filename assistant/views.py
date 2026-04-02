from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.conf import settings
from django.db import models
from .models import Document, DocumentChunk, ChatMessage, APIKey, UserProfile, Tenant
from .services import query_rag, test_provider_key, process_document
from .decorators import admin_required, role_required, tenant_required
from .rate_limiting import rate_limit
import uuid
import json
import os

def login_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user:
            auth_login(request, user)
            return redirect('index')
        else:
            return render(request, 'assistant/login.html', {'error': 'Invalid username or password'})
    
    return render(request, 'assistant/login.html')

def signup_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        password2 = request.POST.get('password2')
        
        if password != password2:
            return render(request, 'assistant/signup.html', {'error': 'Passwords do not match'})
        
        if User.objects.filter(username=username).exists():
            return render(request, 'assistant/signup.html', {'error': 'Username already exists'})
        
        if User.objects.filter(email=email).exists():
            return render(request, 'assistant/signup.html', {'error': 'Email already exists'})
        
        # Create user
        user = User.objects.create_user(username=username, email=email, password=password)
        
        # Create profile with default tenant
        tenant, _ = Tenant.objects.get_or_create(name="Default Tenant", slug="default")
        UserProfile.objects.create(user=user, tenant=tenant, role='employee')
        
        # Auto login
        auth_login(request, user)
        return redirect('index')
    
    return render(request, 'assistant/signup.html')

def logout_view(request):
    auth_logout(request)
    return redirect('login')

@login_required
def index(request):
    if 'session_id' not in request.session:
        request.session['session_id'] = str(uuid.uuid4())
    
    # Filter documents by tenant
    if hasattr(request, 'tenant') and request.tenant:
        documents = Document.objects.filter(tenant=request.tenant)
    else:
        documents = Document.objects.none()
    
    messages = ChatMessage.objects.filter(session_id=request.session['session_id'])
    
    # Get user's active API keys
    user_providers = list(APIKey.objects.filter(user=request.user).values_list('provider', flat=True))
    llm_provider = user_providers[0] if user_providers else 'None (Add API key in Settings)'
    
    context = {
        'documents': documents,
        'messages': messages,
        'llm_provider': llm_provider,
    }
    return render(request, 'assistant/index_new.html', context)

@login_required
@admin_required
@tenant_required
def upload_document(request):
    if request.method == 'POST' and request.FILES.get('document'):
        file = request.FILES['document']
        title = os.path.splitext(file.name)[0]
        
        # Check if user has API key for embeddings
        from .models import APIKey
        embedding_providers = ['openai', 'huggingface', 'cohere']
        has_embedding_key = APIKey.objects.filter(
            user=request.user, 
            provider__in=embedding_providers
        ).exists()
        
        if not has_embedding_key:
            return JsonResponse({
                'error': 'Please add an API key (OpenAI, HuggingFace, or Cohere) in Settings before uploading documents.'
            }, status=400)
        
        document = Document.objects.create(
            tenant=request.tenant,
            title=title,
            file=file,
            uploaded_by=request.user
        )
        
        # Process synchronously (Celery optional)
        try:
            from .tasks import process_document_async
            process_document_async.delay(document.id)
        except:
            # Fallback to sync if Celery not running
            process_document(document)
        
        return redirect('index')
    return redirect('index')

@rate_limit(max_requests=20, window_seconds=60)
def chat(request):
    if request.method == 'POST':
        # Handle both JSON and form data
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            question = data.get('question', '')
        else:
            question = request.POST.get('question', '')
        
        session_id = request.session.get('session_id')
        user = request.user if request.user.is_authenticated else None
        tenant = request.tenant if hasattr(request, 'tenant') else None
        
        # Save user message
        ChatMessage.objects.create(
            user=user,
            session_id=session_id,
            role='user',
            content=question
        )
        
        # Get RAG response with tenant context
        response, citations = query_rag(question, user, tenant)
        
        # Save assistant message
        ChatMessage.objects.create(
            user=user,
            session_id=session_id,
            role='assistant',
            content=response,
            citations=citations
        )
        
        return JsonResponse({
            'response': response,
            'citations': citations,
            'chat_id': session_id
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

def clear_chat(request):
    if request.method == 'POST':
        session_id = request.session.get('session_id')
        ChatMessage.objects.filter(session_id=session_id).delete()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def settings_page(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    api_keys = APIKey.objects.filter(user=request.user)
    
    providers = [
        {'id': 'openai', 'name': 'OpenAI', 'models': ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], 'icon': '🤖'},
        {'id': 'huggingface', 'name': 'HuggingFace', 'models': ['mistralai/Mistral-7B-Instruct-v0.2', 'meta-llama/Llama-2-70b-chat-hf'], 'icon': '🤗'},
        {'id': 'cohere', 'name': 'Cohere', 'models': ['command-r-plus', 'command-r', 'command'], 'icon': '🔷'},
        {'id': 'anthropic', 'name': 'Anthropic Claude', 'models': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'], 'icon': '🧠'},
        {'id': 'google', 'name': 'Google Gemini', 'models': ['gemini-1.5-pro', 'gemini-1.5-flash'], 'icon': '✨'},
        {'id': 'groq', 'name': 'Groq', 'models': ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'], 'icon': '⚡'},
    ]
    
    # Map existing keys
    user_keys = {key.provider: key for key in api_keys}
    
    context = {
        'profile': profile,
        'providers': providers,
        'user_keys': user_keys,
    }
    return render(request, 'assistant/settings.html', context)

@login_required
def save_api_key(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        provider = data.get('provider')
        api_key = data.get('api_key')
        model = data.get('model', '')
        
        if not provider or not api_key:
            return JsonResponse({'error': 'Provider and API key required'}, status=400)
        
        # Save or update API key
        key_obj, created = APIKey.objects.get_or_create(
            user=request.user,
            provider=provider
        )
        key_obj.encrypt_key(api_key)
        key_obj.is_active = True
        key_obj.save()
        
        # Update profile
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.preferred_provider = provider
        profile.preferred_model = model
        profile.save()
        
        return JsonResponse({
            'status': 'success',
            'message': f'{provider} API key saved successfully'
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def check_api_keys(request):
    """Check if user has any API keys"""
    has_keys = APIKey.objects.filter(user=request.user).exists()
    return JsonResponse({'has_keys': has_keys})

@login_required
def get_chats(request):
    """Get user's chat history"""
    chats = ChatMessage.objects.filter(
        user=request.user,
        role='user'
    ).values('session_id').annotate(
        first_message=models.Min('created_at'),
        title=models.F('content')
    ).order_by('-first_message')[:20]
    
    chat_list = []
    for chat in chats:
        chat_list.append({
            'id': chat['session_id'],
            'title': chat['title'][:50] + '...' if len(chat['title']) > 50 else chat['title'],
            'created_at': chat['first_message'].isoformat()
        })
    
    return JsonResponse({'chats': chat_list})

@login_required
def get_chat_messages(request, chat_id):
    """Get messages for a specific chat"""
    messages = ChatMessage.objects.filter(
        user=request.user,
        session_id=chat_id
    ).order_by('created_at')
    
    message_list = []
    for msg in messages:
        message_list.append({
            'role': msg.role,
            'content': msg.content,
            'citations': msg.citations or []
        })
    
    return JsonResponse({
        'messages': message_list,
        'document_id': None  # TODO: Add document tracking
    })

@login_required
def get_documents(request):
    """Get user's documents"""
    if hasattr(request, 'tenant') and request.tenant:
        documents = Document.objects.filter(tenant=request.tenant)
    else:
        documents = Document.objects.none()
    
    doc_list = []
    for doc in documents:
        doc_list.append({
            'id': doc.id,
            'title': doc.title,
            'chunks_count': doc.chunks.count(),
            'pages': doc.pages or 0
        })
    
    return JsonResponse({'documents': doc_list})

@login_required
def delete_api_key(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        provider = data.get('provider')
        
        APIKey.objects.filter(user=request.user, provider=provider).delete()
        
        return JsonResponse({'status': 'success'})
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def test_api_key(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        provider = data.get('provider')
        api_key = data.get('api_key')
        
        success, message = test_provider_key(provider, api_key)
        
        return JsonResponse({
            'success': success,
            'message': message
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)
