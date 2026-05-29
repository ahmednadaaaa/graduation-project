from django.contrib import admin
from django.utils.html import format_html

from .models import FaceImage, StudentProfile


class FaceImageInline(admin.TabularInline):
    model = FaceImage
    extra = 0
    fields = ('image', 'image_preview', 'label', 'is_processed', 'created_at')
    readonly_fields = ('created_at', 'image_preview')

    @admin.display(description='Preview')
    def image_preview(self, obj):
        if obj.pk and obj.image:
            return format_html(
                '<img src="{}" alt="" style="max-height: 56px; border-radius: 4px;" />',
                obj.image.url,
            )
        return '—'


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        'university_id',
        'user',
        'faculty',
        'department',
        'academic_year',
        'is_face_registered',
        'created_at',
    )
    list_filter = ('faculty', 'department', 'is_face_registered', 'academic_year')
    search_fields = (
        'university_id',
        'user__email',
        'user__full_name',
        'faculty',
        'department',
    )
    autocomplete_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [FaceImageInline]
    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('Academic', {'fields': ('university_id', 'faculty', 'department', 'academic_year')}),
        ('Home location', {'fields': ('home_latitude', 'home_longitude', 'home_address')}),
        ('Bus & face', {'fields': ('assigned_bus', 'is_face_registered')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(FaceImage)
class FaceImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'label', 'is_processed', 'created_at')
    list_filter = ('is_processed',)
    search_fields = ('student__university_id', 'student__user__email', 'label')
    autocomplete_fields = ('student',)
    readonly_fields = ('created_at',)
