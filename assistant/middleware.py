from django.utils.deprecation import MiddlewareMixin
from .models import Tenant, UserProfile

class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.user.is_authenticated:
            if not hasattr(request.user, 'profile'):
                # Auto-create profile with default tenant
                tenant, _ = Tenant.objects.get_or_create(name="Default Tenant", slug="default")
                # Superusers get admin role, others get employee
                role = 'admin' if request.user.is_superuser else 'employee'
                UserProfile.objects.get_or_create(
                    user=request.user,
                    defaults={'tenant': tenant, 'role': role}
                )
            request.tenant = request.user.profile.tenant
        else:
            # Use default tenant for anonymous users
            request.tenant, _ = Tenant.objects.get_or_create(name="Default Tenant", slug="default")
