from django.urls import path
from .views import (
    DashboardStatsView,
    DriverListView,
    StudentManagementListView,
    StudentManagementDetailView,
    AssignBusToStudentView,
    ResetStudentFaceView,
    BusManagementListView,
    BusManagementDetailView,
    AttendanceReportView,
    UnrecognizedScansView,
    AttendanceLogListView,
)

urlpatterns = [
    # إحصائيات
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('drivers/', DriverListView.as_view(), name='dashboard-drivers'),
    path('attendance/logs/', AttendanceLogListView.as_view(), name='attendance-logs'),

    # إدارة الطلاب
    path('students/',                              StudentManagementListView.as_view(),   name='dashboard-students'),
    path('students/<int:student_id>/',             StudentManagementDetailView.as_view(), name='dashboard-student-detail'),
    path('students/<int:student_id>/assign-bus/',  AssignBusToStudentView.as_view(),      name='assign-bus'),
    path('students/<int:student_id>/reset-face/',  ResetStudentFaceView.as_view(),        name='reset-face'),

    # إدارة الأتوبيسات
    path('buses/',                       BusManagementListView.as_view(),   name='dashboard-buses'),
    path('buses/<str:bus_number>/',      BusManagementDetailView.as_view(), name='dashboard-bus-detail'),

    # تقارير
    path('reports/attendance/',    AttendanceReportView.as_view(),    name='attendance-report'),
    path('reports/unrecognized/',  UnrecognizedScansView.as_view(),   name='unrecognized-scans'),
]
