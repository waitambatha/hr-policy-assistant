from django.contrib import admin
from .models import Document, DocumentChunk, ChatMessage, UserProfile, APIKey, QueryCache

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'page_count', 'section_count', 'uploaded_at']
    readonly_fields = ['uploaded_at', 'page_count', 'section_count']

@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'section', 'page_number']
    list_filter = ['document']

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'role', 'created_at']
    list_filter = ['role', 'created_at']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'preferred_provider', 'preferred_model', 'created_at']
    search_fields = ['user__username']

@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['user', 'provider', 'is_active', 'created_at', 'last_used']
    list_filter = ['provider', 'is_active']
    search_fields = ['user__username']

@admin.register(QueryCache)
class QueryCacheAdmin(admin.ModelAdmin):
    list_display = ['question', 'hit_count', 'created_at', 'last_accessed']
    search_fields = ['question', 'answer']
    list_filter = ['created_at']
    ordering = ['-hit_count']
