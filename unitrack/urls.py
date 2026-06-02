from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.urls import re_path
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.http import JsonResponse
from django.utils import timezone
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .views import FrontendAppView


def health_check(request):
    """
    GET /health/
    Lightweight liveness probe — used by Docker healthcheck and monitoring.
    Returns 200 with JSON payload so curl -f works correctly.
    """
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'UniTrack API',
    })


urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    # Swagger / OpenAPI (requires: pip install drf-spectacular, INSTALLED_APPS += 'drf_spectacular')
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/users/', include('apps.users.urls')),          # Phase 1
    path('api/students/', include('apps.students.urls')),    # Phase 2
    path('api/bus/', include('apps.bus.urls')),              # Phase 3
    path('api/attendance/', include('apps.attendance.urls')), # Phase 4
    path('api/dashboard/', include('apps.dashboard.urls')),  # Phase 6
    path('api/notifications/', include('apps.websockets.urls')), # Notifications
    path('api/ai/', include('apps.ai.urls')),                # AI Route Optimization
]

# Serve uploaded media files during development
if settings.DEBUG:
    urlpatterns += [
        path('assets/<path:path>', serve, {'document_root': settings.BASE_DIR / 'frontend' / 'dist' / 'assets'}),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += staticfiles_urlpatterns()

# SPA fallback route (must be last and must not catch API/admin/static/media/assets)
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|static/|assets/|health/).*$',
            FrontendAppView.as_view(),
            name='frontend-app'),
]
