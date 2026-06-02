import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'unitrack.settings.local')

django.setup()

# لازم نعمل django.setup() الأول
# قبل ما نعمل import لأي حاجة من الـ apps
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from apps.websockets.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # HTTP requests العادية
    'http': get_asgi_application(),

    # WebSocket connections
    # AllowedHostsOriginValidator → بيتأكد إن الـ origin مسموح بيه
    # AuthMiddlewareStack → بيحط الـ user في الـ scope تلقائياً
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
