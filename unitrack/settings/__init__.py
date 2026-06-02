"""
unitrack/settings/__init__.py

Backward-compatibility shim.
Code that references DJANGO_SETTINGS_MODULE=unitrack.settings (old style)
will transparently load local settings in development.

For production, always set explicitly:
  DJANGO_SETTINGS_MODULE=unitrack.settings.production
"""

# Re-export everything from local so `unitrack.settings` still works
from .local import *  # noqa: F401, F403
