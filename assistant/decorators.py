from functools import wraps
from django.http import JsonResponse
from django.shortcuts import redirect

def role_required(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login')
            
            if not hasattr(request.user, 'profile'):
                # Auto-create profile if missing
                from .models import UserProfile, Tenant
                tenant, _ = Tenant.objects.get_or_create(name="Default Tenant", slug="default")
                role = 'admin' if request.user.is_superuser else 'employee'
                UserProfile.objects.get_or_create(
                    user=request.user,
                    defaults={'tenant': tenant, 'role': role}
                )
            
            if request.user.profile.role not in roles:
                return JsonResponse({'error': 'Insufficient permissions'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def admin_required(view_func):
    return role_required('admin')(view_func)

def tenant_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not hasattr(request, 'tenant') or request.tenant is None:
            # Auto-create default tenant
            from .models import Tenant
            request.tenant, _ = Tenant.objects.get_or_create(name="Default Tenant", slug="default")
        return view_func(request, *args, **kwargs)
    return wrapper
