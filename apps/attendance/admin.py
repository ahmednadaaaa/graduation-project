from django.contrib import admin

from .models import AttendanceLog, DailyAttendance


@admin.register(AttendanceLog)
class AttendanceLogAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'timestamp',
        'student',
        'bus',
        'action',
        'recognition_status',
        'confidence_score',
    )
    list_filter = ('action', 'recognition_status', 'bus')
    search_fields = (
        'student__university_id',
        'student__user__email',
        'student__user__full_name',
        'bus__bus_number',
    )
    autocomplete_fields = ('student', 'bus')
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp',)


@admin.register(DailyAttendance)
class DailyAttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'date', 'status', 'boarding_time', 'leaving_time')
    list_filter = ('status', 'date')
    search_fields = ('student__university_id', 'student__user__email', 'student__user__full_name')
    autocomplete_fields = ('student',)
    date_hierarchy = 'date'
