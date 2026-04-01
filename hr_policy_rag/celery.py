import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_policy_rag.settings')

app = Celery('hr_policy_rag')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
