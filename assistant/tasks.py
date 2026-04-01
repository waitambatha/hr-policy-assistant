from celery import shared_task
from .services import process_document as process_doc_sync
from .models import APIKey, Document
from django.utils import timezone
from datetime import timedelta

@shared_task
def process_document_async(document_id):
    """Async document processing"""
    doc = Document.objects.get(id=document_id)
    process_doc_sync(doc)

@shared_task
def check_api_key_expiry():
    """Check for unused API keys and send alerts"""
    threshold = timezone.now() - timedelta(days=90)
    unused_keys = APIKey.objects.filter(last_used__lt=threshold, is_active=True)
    
    for key in unused_keys:
        # Send email alert (implement email service)
        print(f"Alert: API key for {key.user.email} - {key.provider} unused for 90 days")

@shared_task
def cleanup_old_cache():
    """Clean up old query cache entries"""
    from .models import QueryCache
    threshold = timezone.now() - timedelta(days=30)
    QueryCache.objects.filter(last_accessed__lt=threshold, hit_count=0).delete()
