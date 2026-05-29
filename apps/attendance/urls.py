from django.urls import path
from .views import ScanFaceView, StudentAttendanceView, DailyAttendanceView

urlpatterns = [
    # ESP32 Scan
    path('scan/', ScanFaceView.as_view(), name='attendance-scan'),
    
    # My Attendance (for students)
    path('my/', StudentAttendanceView.as_view(), name='my-attendance'),
    
    # Daily Report (for admin)
    path('daily/', DailyAttendanceView.as_view(), name='daily-attendance'),
]
