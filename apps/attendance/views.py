import base64

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import AttendanceLog, DailyAttendance
from .serializers import (
    AttendanceLogSerializer,
    ScanFaceSerializer,
    DailyAttendanceSerializer,
)
from apps.bus.models import Bus
from apps.ai.face_recognition_service import face_recognition_service


class ScanFaceView(APIView):
    """
    POST /api/attendance/scan/

    ده الـ endpoint الرئيسي اللي الـ ESP32-CAM بيبعت عليه الصورة

    الـ Flow:
    1. استقبل الصورة + bus_number + action
    2. شغل الـ Face Recognition
    3. لو عرف الطالب → سجل الحضور
    4. رجع النتيجة للـ ESP32
    """
    permission_classes = [AllowAny]  # الـ ESP32 مش بيعمل login

    def post(self, request):
        # ── Validation (unchanged) ──────────────────────────────────────────
        serializer = ScanFaceSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        image      = serializer.validated_data['image']
        bus_number = serializer.validated_data['bus_number']
        action     = serializer.validated_data['action']

        # جيب الأتوبيس
        bus = get_object_or_404(Bus, bus_number=bus_number)

        # شغل الـ Face Recognition
        recognition_result = face_recognition_service.identify_student(image)

        # جيب آخر موقع للأتوبيس
        current_location = bus.current_location

        # ابني الـ log data
        log_data = {
            'bus': bus,
            'action': action,
            'captured_image': image,
        }

        # أضف الموقع لو موجود
        if current_location:
            log_data['bus_latitude']  = current_location.latitude
            log_data['bus_longitude'] = current_location.longitude

        if recognition_result['found']:
            # ✅ تم التعرف على الطالب
            student    = recognition_result['student']
            confidence = recognition_result['confidence']

            # احفظ الـ log
            log_data.update({
                'student': student,
                'recognition_status': AttendanceLog.Status.RECOGNIZED,
                'confidence_score': confidence,
            })
            attendance_log = AttendanceLog.objects.create(**log_data)

            # حدّث الـ DailyAttendance
            self._update_daily_attendance(student, action, attendance_log)

            # ── الجديد: ابعت على الـ WebSocket ──
            self._broadcast_attendance(bus_number, student, action, confidence)
            self._notify_student(student, action, bus_number)

            return Response({
                'status': 'recognized',
                'student': {
                    'name': student.user.full_name,
                    'university_id': student.university_id,
                    'faculty': student.faculty,
                },
                'action': action,
                'confidence': round(confidence * 100, 1),  # مثلاً 87.3%
                'message': f'أهلاً {student.user.full_name}! تم تسجيل {action}'
            })

        else:
            # ❌ لم يتم التعرف
            log_data.update({
                'student': None,
                'recognition_status': AttendanceLog.Status.UNRECOGNIZED,
                'confidence_score': 0.0,
            })
            AttendanceLog.objects.create(**log_data)

            return Response({
                'status': 'unrecognized',
                'message': recognition_result.get('error', 'لم يتم التعرف على الطالب'),
                'action': action,
            }, status=status.HTTP_200_OK)

    def _broadcast_attendance(self, bus_number, student, action, confidence):
        """
        ابعت حدث الحضور لكل المتصلين بـ WebSocket الأتوبيس ده
        """
        channel_layer = get_channel_layer()

        # async_to_sync علشان الـ view ده sync مش async
        async_to_sync(channel_layer.group_send)(
            f'attendance_{bus_number}',
            {
                # 'type' لازم يساوي اسم الدالة في الـ Consumer
                # attendance_event → def attendance_event(self, event)
                'type': 'attendance_event',
                'data': {
                    'student_name': student.user.full_name,
                    'university_id': student.university_id,
                    'action': action,
                    'confidence': round(confidence * 100, 1),
                    'bus_number': bus_number,
                }
            }
        )

    def _notify_student(self, student, action, bus_number):
        """
        ابعت إشعار شخصي للطالب نفسه
        """
        action_text = 'ركبت الأتوبيس' if action == 'boarding' else 'نزلت من الأتوبيس'
        title = 'تسجيل حضور'
        message = f'تم تسجيل أنك {action_text} رقم {bus_number}'
        
        try:
            from apps.websockets.utils import send_user_notification
            from apps.websockets.models import Notification
            send_user_notification(
                user=student.user,
                title=title,
                message=message,
                notif_type=Notification.NotifType.ATTENDANCE,
                link="/student-dashboard"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send attendance notification: {e}")

        # Push + enhanced WebSocket notification via notifications helpers
        try:
            from apps.notifications.helpers import (
                notify_student_boarding,
                notify_student_leaving,
            )
            if action == 'boarding':
                notify_student_boarding(student)
            elif action == 'leaving':
                notify_student_leaving(student)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Push notification failed (non-critical): {e}")

    def _update_daily_attendance(self, student, action, log):
        """
        دالة داخلية لتحديث ملخص الحضور اليومي

        get_or_create:
        - لو موجود → يرجعه
        - لو مش موجود → يعمله جديد
        - بيرجع (object, created) → created = True/False
        """
        today = timezone.now().date()

        daily, created = DailyAttendance.objects.get_or_create(
            student=student,
            date=today,
            defaults={'status': DailyAttendance.AttendanceStatus.ABSENT}
        )

        if action == 'boarding':
            daily.status        = DailyAttendance.AttendanceStatus.PRESENT
            daily.boarding_time = log.timestamp
        elif action == 'leaving':
            daily.leaving_time  = log.timestamp

        daily.save()


class StudentAttendanceView(APIView):
    """
    GET /api/attendance/my/    → سجل حضور الطالب المسجل دخول
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # تأكد إن المستخدم ده طالب
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'مش طالب'},
                status=status.HTTP_403_FORBIDDEN
            )

        student = request.user.student_profile

        # آخر 30 سجل
        logs = AttendanceLog.objects.filter(
            student=student
        ).select_related('bus')[:30]

        serializer = AttendanceLogSerializer(logs, many=True)
        return Response({
            'student': student.user.full_name,
            'total_records': logs.count(),
            'logs': serializer.data
        })


class DailyAttendanceView(APIView):
    """
    GET /api/attendance/daily/    → ملخص الحضور اليومي (للأدمن)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.role == 'admin':
            return Response(
                {'error': 'بس الأدمن يقدر يشوف'},
                status=status.HTTP_403_FORBIDDEN
            )

        # فلتر بالتاريخ لو اتبعت
        date_str = request.query_params.get('date')

        if date_str:
            try:
                from datetime import datetime
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'صيغة التاريخ غلط — استخدم YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()

        records = DailyAttendance.objects.filter(
            date=date
        ).select_related('student', 'student__user')

        serializer = DailyAttendanceSerializer(records, many=True)

        present_count = records.filter(
            status=DailyAttendance.AttendanceStatus.PRESENT
        ).count()

        return Response({
            'date': str(date),
            'total': records.count(),
            'present': present_count,
            'absent': records.count() - present_count,
            'records': serializer.data
        })
