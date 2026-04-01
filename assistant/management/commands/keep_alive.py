from django.core.management.base import BaseCommand
import requests
import os

class Command(BaseCommand):
    help = 'Ping self to prevent sleep'

    def handle(self, *args, **options):
        url = os.getenv('RENDER_EXTERNAL_URL', 'http://localhost:8000')
        try:
            response = requests.get(f'{url}/health/', timeout=5)
            self.stdout.write(self.style.SUCCESS(f'✅ Pinged {url} - Status: {response.status_code}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Ping failed: {e}'))
