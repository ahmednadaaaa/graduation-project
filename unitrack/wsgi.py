"""
WSGI config for the unitrack project.

Exposes the WSGI callable as ``application`` for HTTP when using the default
runserver / WSGI stack.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unitrack.settings')

application = get_wsgi_application()
