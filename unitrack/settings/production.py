"""
unitrack/settings/production.py

Production-only settings. Override base.py values here.
Activated via environment variable:
  DJANGO_SETTINGS_MODULE=unitrack.settings.production

All secrets MUST come from environment variables — never hardcoded.
"""

import os

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
    if h.strip()
]

# ── PostgreSQL ────────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'unitrack'),
        'USER': os.environ.get('DB_USER', 'unitrack'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
    }
}

# ── Security ──────────────────────────────────────────────────────────────────
# SECURE_SSL_REDIRECT = False intentionally — SSL is terminated at the
# load balancer / reverse proxy (nginx/Caddy), not Django.
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ── Static files in production ─────────────────────────────────────────────
# Run: python manage.py collectstatic before deploying
STATICFILES_DIRS = []  # BASE_DIR/frontend/dist is only needed in dev templates
