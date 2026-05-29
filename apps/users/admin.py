from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):

    # الأعمدة اللي بتظهر في قايمة اليوزرز
    list_display = ['email', 'full_name', 'role', 'is_approved', 'is_active', 'date_joined']

    # فلتر على الجنب الأيمن
    list_filter = ['role', 'is_approved', 'is_active']

    # ✅ خلي is_approved قابل للتعديل من القايمة مباشرة بدون ما تفتح اليوزر
    list_editable = ['is_approved']

    # حقول البحث
    search_fields = ['email', 'full_name']

    # الحقول اللي بتظهر جوا صفحة اليوزر
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Personal Info', {
            'fields': ('full_name', 'phone', 'role')
        }),
        ('Permissions', {
            'fields': ('is_approved', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )

    # الحقول اللي بتظهر لما تضيف يوزر جديد من الأدمن
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'password1', 'password2', 'is_approved'),
        }),
    )

    # الـ username بيبقى الـ email عندك
    ordering = ['email']


admin.site.site_header = 'UniTrack Admin'
admin.site.site_title = 'UniTrack'
admin.site.index_title = 'Administration'
