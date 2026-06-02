"""
unitrack/celery.py

Celery application configuration for UniTrack.
This module is imported by unitrack/__init__.py so that @shared_task
decorators work across all apps without circular imports.
"""

import os

from celery import Celery

# Default to local settings for development
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unitrack.settings.local')

app = Celery('unitrack')

# Read config from Django settings, using the CELERY_ namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py in all INSTALLED_APPS + apps without models
app.autodiscover_tasks()
app.autodiscover_tasks(['apps.ai_service'])


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
