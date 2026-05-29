from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # موقع الأتوبيس live
    # ws://localhost:8000/ws/bus/BUS-01/location/
    re_path(
        r'ws/bus/(?P<bus_number>[^/]+)/location/$',
        consumers.BusLocationConsumer.as_asgi()
    ),

    # إشعارات الحضور live
    # ws://localhost:8000/ws/attendance/BUS-01/
    re_path(
        r'ws/attendance/(?P<bus_number>[^/]+)/$',
        consumers.AttendanceConsumer.as_asgi()
    ),

    # إشعارات شخصية للمستخدمين
    # ws://localhost:8000/ws/user/(?P<user_id>\d+)/
    re_path(
        r'ws/user/(?P<user_id>\d+)/$',
        consumers.UserNotificationConsumer.as_asgi()
    ),
]
