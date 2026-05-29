from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.students.models import StudentProfile, FaceImage
from apps.bus.models import Bus, Route
from apps.attendance.models import AttendanceLog, DailyAttendance

User = get_user_model()


class DashboardStatsSerializer(serializers.Serializer):
    """
    إحصائيات الـ Dashboard الرئيسية
    Serializer عادي مش ModelSerializer
    لأن البيانات دي بنحسبها مش بنجيبها من model واحد
    """
    total_students    = serializers.IntegerField()
    total_buses       = serializers.IntegerField()
    total_drivers     = serializers.IntegerField()
    active_buses      = serializers.IntegerField()
    today_present     = serializers.IntegerField()
    today_absent      = serializers.IntegerField()
    today_scans       = serializers.IntegerField()
    registered_faces  = serializers.IntegerField()


class StudentListSerializer(serializers.ModelSerializer):
    """
    بيانات الطالب في القائمة
    """
    full_name         = serializers.CharField(source='user.full_name')
    email             = serializers.CharField(source='user.email')
    phone             = serializers.CharField(source='user.phone')
    is_active         = serializers.BooleanField(source='user.is_active')
    profile_picture   = serializers.ImageField(source='user.profile_picture', read_only=True)
    face_images_count = serializers.ReadOnlyField()

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'full_name', 'email', 'phone', 'profile_picture',
            'university_id', 'faculty', 'department',
            'academic_year', 'assigned_bus',
            'home_latitude', 'home_longitude', 'home_address',
            'is_face_registered', 'face_images_count',
            'is_active', 'created_at',
        ]


class StudentDetailSerializer(serializers.ModelSerializer):
    """
    تفاصيل طالب كاملة للأدمن
    """
    full_name     = serializers.CharField(source='user.full_name')
    email         = serializers.CharField(source='user.email')
    phone         = serializers.CharField(source='user.phone')
    is_active     = serializers.BooleanField(source='user.is_active')
    face_images   = serializers.SerializerMethodField()
    recent_attendance = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'full_name', 'email', 'phone',
            'university_id', 'faculty', 'department',
            'academic_year', 'assigned_bus',
            'home_latitude', 'home_longitude', 'home_address',
            'is_face_registered', 'face_images',
            'is_active', 'recent_attendance', 'created_at',
        ]

    def get_face_images(self, obj):
        # بيجيب آخر 5 صور بس
        images = obj.face_images.all()[:5]
        return [
            {
                'id': img.id,
                'label': img.label,
                'is_processed': img.is_processed,
                'url': self.context['request'].build_absolute_uri(
                    img.image.url
                ) if img.image else None
            }
            for img in images
        ]

    def get_recent_attendance(self, obj):
        # آخر 7 أيام حضور
        logs = DailyAttendance.objects.filter(
            student=obj
        ).order_by('-date')[:7]
        return [
            {
                'date': str(log.date),
                'status': log.status,
                'boarding_time': str(log.boarding_time) if log.boarding_time else None,
                'leaving_time': str(log.leaving_time) if log.leaving_time else None,
            }
            for log in logs
        ]


class AssignBusSerializer(serializers.Serializer):
    """
    تخصيص أتوبيس لطالب
    """
    bus_number = serializers.CharField(max_length=20)

    def validate_bus_number(self, value):
        from apps.bus.models import Bus
        if not Bus.objects.filter(bus_number=value, is_active=True).exists():
            raise serializers.ValidationError(
                f'الأتوبيس {value} مش موجود أو مش شغال'
            )
        return value


class BusManagementSerializer(serializers.ModelSerializer):
    """
    بيانات الأتوبيس للأدمن مع إحصائيات
    """
    driver_name       = serializers.ReadOnlyField()
    route_name        = serializers.CharField(source='route.name', read_only=True)
    current_location  = serializers.SerializerMethodField()
    students_count    = serializers.SerializerMethodField()
    today_attendance  = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = [
            'id', 'bus_number', 'plate_number', 'capacity',
            'status', 'is_active', 'driver_name',
            'route', 'route_name', 'current_location',
            'students_count', 'today_attendance',
        ]

    def get_current_location(self, obj):
        loc = obj.current_location
        if loc:
            return {
                'latitude': str(loc.latitude),
                'longitude': str(loc.longitude),
                'timestamp': loc.timestamp.isoformat(),
            }
        return None

    def get_students_count(self, obj):
        # عدد الطلاب المخصصين لهذا الأتوبيس
        return StudentProfile.objects.filter(
            assigned_bus=obj.bus_number
        ).count()

    def get_today_attendance(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        # عدد الطلاب اللي ركبوا الأتوبيس ده النهارده
        return AttendanceLog.objects.filter(
            bus=obj,
            action='boarding',
            recognition_status='recognized',
            timestamp__date=today
        ).count()


class AttendanceReportSerializer(serializers.Serializer):
    """
    تقرير الحضور لفترة معينة
    """
    date_from   = serializers.DateField()
    date_to     = serializers.DateField()
    student_id  = serializers.IntegerField(required=False)
    bus_number  = serializers.CharField(required=False)

    def validate(self, data):
        # date_from لازم تكون قبل date_to
        if data['date_from'] > data['date_to']:
            raise serializers.ValidationError(
                'تاريخ البداية لازم يكون قبل تاريخ النهاية'
            )
        # الفترة مش أكتر من 90 يوم
        from datetime import timedelta
        if (data['date_to'] - data['date_from']).days > 90:
            raise serializers.ValidationError(
                'الفترة لازم تكون أقل من 90 يوم'
            )
        return data
