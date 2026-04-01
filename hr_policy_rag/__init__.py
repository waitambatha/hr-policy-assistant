from __future__ import absolute_import, unicode_literals

# Make Celery optional
try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    pass
