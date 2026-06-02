"""
unitrack/settings/local.py

Development-only settings. Override base.py values here.
Usage:
  export DJANGO_SETTINGS_MODULE=unitrack.settings.local
  python manage.py runserver
"""

from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ['*']

# SQLite for local development — no PostgreSQL needed
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'unitrack',
        'USER': 'postgres',
        'PASSWORD': 'ahmed123',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Celery — use Redis if available, else fall back gracefully
# To run locally: brew install redis && redis-server
# CELERY_BROKER_URL is already set in base.py from REDIS_URL env var
