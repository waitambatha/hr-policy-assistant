from django.urls import path
from . import views
from .api_auth import api_login
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('', views.index, name='index'),
    path('health/', health_check, name='health'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('upload/', views.upload_document, name='upload_document'),
    path('chat/', views.chat, name='chat'),
    path('clear/', views.clear_chat, name='clear_chat'),
    path('settings/', views.settings_page, name='settings'),
    path('settings/save-api-key/', views.save_api_key, name='save_api_key'),
    path('settings/delete-api-key/', views.delete_api_key, name='delete_api_key'),
    path('settings/test-api-key/', views.test_api_key, name='test_api_key'),
    
    # API Gateway endpoints
    path('api/login/', api_login, name='api_login'),
]
