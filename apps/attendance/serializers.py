from rest_framework import serializers
from .models import AttendanceLog, DailyAttendance


class AttendanceLogSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField()
    bus_number = serializers.CharField(
        source='bus.bus_number',
        read_only=True,
        default=None
    )

    class Meta:
        model = AttendanceLog
        fields = [
            'id', 'student_name', 'bus_number',
            'action', 'recognition_status',
            'confidence_score', 'timestamp',
            'bus_latitude', 'bus_longitude'
        ]


class ScanFaceSerializer(serializers.Serializer):
    """
    Serializer لاستقبال الصورة من الـ ESP32
    """
    image      = serializers.ImageField()
    bus_number = serializers.CharField(max_length=20)
    action     = serializers.ChoiceField(
        choices=['boarding', 'leaving'],
        default='boarding'
    )

    def validate_image(self, value):
        max_size = 5 * 1024 * 1024  # 5MB
        if value.size > max_size:
            raise serializers.ValidationError('الصورة أكبر من 5MB')
        return value


class DailyAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='student.user.full_name',
        read_only=True
    )
    university_id = serializers.CharField(
        source='student.university_id',
        read_only=True
    )

    class Meta:
        model = DailyAttendance
        fields = [
            'id', 'student_name', 'university_id',
            'date', 'status', 'boarding_time', 'leaving_time'
        ]
