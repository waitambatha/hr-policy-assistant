from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from assistant.models import Tenant, UserProfile

class Command(BaseCommand):
    help = 'Initialize the system with default tenant'

    def handle(self, *args, **options):
        # Create default tenant
        tenant, created = Tenant.objects.get_or_create(
            slug="default",
            defaults={'name': "Default Tenant"}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ Created default tenant: {tenant.name}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Default tenant exists: {tenant.name}'))
        
        # Check for superusers without profiles
        superusers = User.objects.filter(is_superuser=True, profile__isnull=True)
        for user in superusers:
            UserProfile.objects.create(user=user, tenant=tenant, role='admin')
            self.stdout.write(self.style.SUCCESS(f'✅ Created admin profile for superuser: {user.username}'))
        
        self.stdout.write(self.style.SUCCESS('\n🎉 System ready!'))
