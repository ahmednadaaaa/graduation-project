from django.urls import path
from .views import StudentProfileView, FaceImageView, StudentAttendanceHistoryView

urlpatterns = [
    # بروفايل الطالب
    path('profile/', StudentProfileView.as_view(), name='student-profile'),
    path('attendance/history/', StudentAttendanceHistoryView.as_view(), name='attendance-history'),

    # صور الوجه
    path('face-images/', FaceImageView.as_view(), name='face-images'),
    path('face-images/<int:image_id>/', FaceImageView.as_view(), name='face-image-delete'),
]
