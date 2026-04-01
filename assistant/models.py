from django.db import models
from django.contrib.auth.models import User
from pgvector.django import VectorField
from cryptography.fernet import Fernet
from django.conf import settings

class Tenant(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users', null=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    preferred_provider = models.CharField(max_length=50, default='ollama')
    preferred_model = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"

class APIKey(models.Model):
    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('anthropic', 'Anthropic (Claude)'),
        ('google', 'Google (Gemini)'),
        ('cohere', 'Cohere'),
        ('huggingface', 'HuggingFace'),
        ('groq', 'Groq'),
        ('together', 'Together AI'),
        ('azure_openai', 'Azure OpenAI'),
        ('aws_bedrock', 'AWS Bedrock'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    encrypted_key = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'provider']
    
    def encrypt_key(self, raw_key):
        cipher = Fernet(settings.ENCRYPTION_KEY.encode())
        self.encrypted_key = cipher.encrypt(raw_key.encode()).decode()
    
    def decrypt_key(self):
        cipher = Fernet(settings.ENCRYPTION_KEY.encode())
        return cipher.decrypt(self.encrypted_key.encode()).decode()
    
    def __str__(self):
        return f"{self.user.username} - {self.provider}"

class Document(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='documents', null=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    section_count = models.IntegerField(default=0)
    page_count = models.IntegerField(default=0)
    
    class Meta:
        indexes = [models.Index(fields=['tenant'])]
    
    def __str__(self):
        return self.title

class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    content = models.TextField()
    section = models.CharField(max_length=255, blank=True)
    page_number = models.IntegerField()
    embedding = VectorField(dimensions=384)
    
    def __str__(self):
        return f"{self.document.title} - Page {self.page_number}"

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    session_id = models.CharField(max_length=100)
    role = models.CharField(max_length=20)
    content = models.TextField()
    citations = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    response_time = models.FloatField(null=True)
    
    class Meta:
        ordering = ['created_at']

class QueryCache(models.Model):
    question_hash = models.CharField(max_length=64, unique=True)
    question = models.TextField()
    answer = models.TextField()
    citations = models.JSONField(null=True, blank=True)
    hit_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-hit_count', '-last_accessed']
