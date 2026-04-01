from django.core.cache import cache
from django.http import JsonResponse
from functools import wraps
import time

def rate_limit(max_requests=10, window_seconds=60):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                identifier = request.META.get('REMOTE_ADDR', 'unknown')
            else:
                identifier = f"user_{request.user.id}"
            
            cache_key = f"rate_limit:{identifier}"
            requests = cache.get(cache_key, [])
            now = time.time()
            
            # Remove old requests outside window
            requests = [req_time for req_time in requests if now - req_time < window_seconds]
            
            if len(requests) >= max_requests:
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'retry_after': int(window_seconds - (now - requests[0]))
                }, status=429)
            
            requests.append(now)
            cache.set(cache_key, requests, window_seconds)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
