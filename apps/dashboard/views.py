from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count, Q

from .permissions import IsAdmin, IsAdminOrDriver
from .serializers import (
    DashboardStatsSerializer,
    StudentListSerializer,
    StudentDetailSerializer,
    AssignBusSerializer,
    BusManagementSerializer,
    AttendanceReportSerializer,
)
from apps.students.models import StudentProfile
from apps.bus.models import Bus, Route
from apps.attendance.models import AttendanceLog, DailyAttendance

User = get_user_model()


# ══════════════════════════════════════════
# DASHBOARD STATS
# ══════════════════════════════════════════

class DashboardStatsView(APIView):
    """
    GET /api/dashboard/stats/
    إحصائيات عامة للـ Dashboard
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        today = timezone.now().date()

        # نحسب كل حاجة في queries قليلة
        total_students   = StudentProfile.objects.count()
        total_buses      = Bus.objects.count()
        total_drivers    = User.objects.filter(role='driver').count()
        active_buses     = Bus.objects.filter(status='en_route').count()
        registered_faces = StudentProfile.objects.filter(
            is_face_registered=True
        ).count()

        # إحصائيات النهارده
        today_records  = DailyAttendance.objects.filter(date=today)
        today_present  = today_records.filter(status='present').count()
        today_absent   = total_students - today_present
        today_scans    = AttendanceLog.objects.filter(
            timestamp__date=today
        ).count()

        stats = {
            'total_students':   total_students,
            'total_buses':      total_buses,
            'total_drivers':    total_drivers,
            'active_buses':     active_buses,
            'today_present':    today_present,
            'today_absent':     today_absent,
            'today_scans':      today_scans,
            'registered_faces': registered_faces,
        }

        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)


# ══════════════════════════════════════════
# STUDENT MANAGEMENT
# ══════════════════════════════════════════

class StudentManagementListView(APIView):
    """
    GET  /api/dashboard/students/         → قائمة الطلاب مع فلترة
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        students = StudentProfile.objects.select_related(
            'user'
        ).prefetch_related('face_images')

        # ── فلاتر اختيارية من الـ query params ──

        # فلتر بالكلية
        faculty = request.query_params.get('faculty')
        if faculty:
            students = students.filter(faculty__icontains=faculty)

        # فلتر بالأتوبيس
        bus_number = request.query_params.get('bus')
        if bus_number:
            students = students.filter(assigned_bus=bus_number)

        # فلتر بحالة الوجه
        face_registered = request.query_params.get('face_registered')
        if face_registered is not None:
            val = face_registered.lower() == 'true'
            students = students.filter(is_face_registered=val)

        # فلتر بالاسم أو الرقم الجامعي
        search = request.query_params.get('search')
        if search:
            students = students.filter(
                Q(user__full_name__icontains=search) |
                Q(university_id__icontains=search) |
                Q(user__email__icontains=search)
            )

        serializer = StudentListSerializer(students, many=True)
        return Response({
            'count': students.count(),
            'students': serializer.data
        })


class StudentManagementDetailView(APIView):
    """
    GET    /api/dashboard/students/<id>/          → تفاصيل طالب
    PATCH  /api/dashboard/students/<id>/          → تعديل بيانات
    DELETE /api/dashboard/students/<id>/          → حذف الطالب
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, student_id):
        student = get_object_or_404(
            StudentProfile.objects.select_related('user'),
            id=student_id
        )
        serializer = StudentDetailSerializer(
            student,
            context={'request': request}
        )
        return Response(serializer.data)

    def patch(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)

        # الأدمن يقدر يغير: is_active, assigned_bus, academic_year
        allowed_user_fields    = ['is_active', 'full_name', 'phone']
        allowed_profile_fields = ['assigned_bus', 'academic_year', 'faculty']

        # حدّث الـ User fields
        user_data = {
            k: v for k, v in request.data.items()
            if k in allowed_user_fields
        }
        if user_data:
            for field, value in user_data.items():
                setattr(student.user, field, value)
            student.user.save(update_fields=list(user_data.keys()))

        # حدّث الـ Profile fields
        profile_data = {
            k: v for k, v in request.data.items()
            if k in allowed_profile_fields
        }
        if profile_data:
            for field, value in profile_data.items():
                setattr(student, field, value)
            student.save(update_fields=list(profile_data.keys()))

        serializer = StudentDetailSerializer(
            student,
            context={'request': request}
        )
        return Response(serializer.data)

    def delete(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)

        # مسح الـ User بيمسح الـ Profile تلقائياً (CASCADE)
        student.user.delete()

        return Response(
            {'message': 'تم حذف الطالب'},
            status=status.HTTP_204_NO_CONTENT
        )


class AssignBusToStudentView(APIView):
    """
    POST /api/dashboard/students/<id>/assign-bus/
    تخصيص أتوبيس لطالب
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        serializer = AssignBusSerializer(data=request.data)

        if serializer.is_valid():
            student.assigned_bus = serializer.validated_data['bus_number']
            student.save(update_fields=['assigned_bus'])

            return Response({
                'message': f'تم تخصيص {serializer.validated_data["bus_number"]} للطالب',
                'student': student.user.full_name,
                'bus': student.assigned_bus,
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetStudentFaceView(APIView):
    """
    DELETE /api/dashboard/students/<id>/reset-face/
    إعادة تسجيل وجه الطالب (مسح كل الصور)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)

        # امسح كل صور الوجه
        deleted_count = student.face_images.count()
        student.face_images.all().delete()

        # حدّث الـ flag
        student.is_face_registered = False
        student.save(update_fields=['is_face_registered'])

        return Response({
            'message': 'تم مسح بيانات الوجه',
            'deleted_images': deleted_count,
        })


# ══════════════════════════════════════════
# BUS MANAGEMENT
# ══════════════════════════════════════════

class BusManagementListView(APIView):
    """
    GET  /api/dashboard/buses/     → قائمة الأتوبيسات مع إحصائيات
    POST /api/dashboard/buses/     → إضافة أتوبيس جديد
    """
    permission_classes = [IsAuthenticated, IsAdminOrDriver]

    def get(self, request):
        # السائق بيشوف بس الأتوبيس بتاعه
        if request.user.role == 'driver':
            buses = Bus.objects.filter(
                driver=request.user
            ).select_related('driver', 'route')
        else:
            buses = Bus.objects.select_related(
                'driver', 'route'
            ).all()

        serializer = BusManagementSerializer(buses, many=True)
        return Response({
            'count': buses.count(),
            'buses': serializer.data
        })

    def post(self, request):
        # بس الأدمن يضيف أتوبيس
        if request.user.role != 'admin':
            return Response(
                {'error': 'بس الأدمن يقدر يضيف أتوبيس'},
                status=status.HTTP_403_FORBIDDEN
            )

        required = ['bus_number', 'plate_number', 'capacity']
        for field in required:
            if field not in request.data:
                return Response(
                    {'error': f'{field} مطلوب'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # تأكد مفيش أتوبيس بنفس الرقم
        if Bus.objects.filter(
            bus_number=request.data['bus_number']
        ).exists():
            return Response(
                {'error': 'رقم الأتوبيس ده موجود بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        bus = Bus.objects.create(
            bus_number=request.data['bus_number'],
            plate_number=request.data['plate_number'],
            capacity=request.data.get('capacity', 40),
        )

        serializer = BusManagementSerializer(bus)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BusManagementDetailView(APIView):
    """
    GET    /api/dashboard/buses/<bus_number>/      → تفاصيل أتوبيس
    PATCH  /api/dashboard/buses/<bus_number>/      → تعديل
    DELETE /api/dashboard/buses/<bus_number>/      → حذف
    """
    permission_classes = [IsAuthenticated, IsAdminOrDriver]

    def get(self, request, bus_number):
        bus = get_object_or_404(
            Bus.objects.select_related('driver', 'route'),
            bus_number=bus_number
        )
        serializer = BusManagementSerializer(bus)
        return Response(serializer.data)

    def patch(self, request, bus_number):
        if request.user.role != 'admin':
            return Response(
                {'error': 'بس الأدمن يعدل'},
                status=status.HTTP_403_FORBIDDEN
            )

        bus = get_object_or_404(Bus, bus_number=bus_number)

        allowed = ['plate_number', 'capacity', 'status', 'is_active', 'route']
        for field in allowed:
            if field in request.data:
                setattr(bus, field, request.data[field])

        # تخصيص سائق
        if 'driver_id' in request.data:
            driver = get_object_or_404(
                User,
                id=request.data['driver_id'],
                role='driver'
            )
            bus.driver = driver

        bus.save()
        serializer = BusManagementSerializer(bus)
        return Response(serializer.data)

    def delete(self, request, bus_number):
        if request.user.role != 'admin':
            return Response(
                {'error': 'بس الأدمن يحذف'},
                status=status.HTTP_403_FORBIDDEN
            )

        bus = get_object_or_404(Bus, bus_number=bus_number)
        bus.delete()
        return Response(
            {'message': 'تم حذف الأتوبيس'},
            status=status.HTTP_204_NO_CONTENT
        )


# ══════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════

class AttendanceReportView(APIView):
    """
    POST /api/dashboard/reports/attendance/
    تقرير الحضور لفترة معينة
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = AttendanceReportSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        date_from  = serializer.validated_data['date_from']
        date_to    = serializer.validated_data['date_to']
        student_id = serializer.validated_data.get('student_id')
        bus_number = serializer.validated_data.get('bus_number')

        # ابني الـ query
        records = DailyAttendance.objects.filter(
            date__range=[date_from, date_to]
        ).select_related('student', 'student__user')

        if student_id:
            records = records.filter(student__id=student_id)

        if bus_number:
            records = records.filter(
                student__assigned_bus=bus_number
            )

        # احسب الإحصائيات
        total   = records.count()
        present = records.filter(status='present').count()
        absent  = records.filter(status='absent').count()

        # نرتبهم بالتاريخ
        records = records.order_by('-date')

        return Response({
            'period': {
                'from': str(date_from),
                'to':   str(date_to),
            },
            'summary': {
                'total_records': total,
                'present':       present,
                'absent':        absent,
                'attendance_rate': round(
                    (present / total * 100) if total > 0 else 0,
                    1
                ),
            },
            'records': [
                {
                    'student': r.student.user.full_name,
                    'university_id': r.student.university_id,
                    'date': str(r.date),
                    'status': r.status,
                    'boarding_time': str(r.boarding_time) if r.boarding_time else None,
                    'leaving_time':  str(r.leaving_time)  if r.leaving_time  else None,
                }
                for r in records
            ]
        })


class UnrecognizedScansView(APIView):
    """
    GET /api/dashboard/reports/unrecognized/
    الصور اللي ملقتش تطابق في الـ AI
    مفيدة علشان تعرف في مشكلة في الكاميرا أو في تسجيل الوجه
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        today = timezone.now().date()

        # ممكن تفلتر بالتاريخ
        date_str = request.query_params.get('date')
        if date_str:
            try:
                from datetime import datetime
                today = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        logs = AttendanceLog.objects.filter(
            recognition_status='unrecognized',
            timestamp__date=today
        ).select_related('bus')

        return Response({
            'date': str(today),
            'count': logs.count(),
            'scans': [
                {
                    'id': log.id,
                    'bus': log.bus.bus_number if log.bus else None,
                    'action': log.action,
                    'timestamp': log.timestamp.isoformat(),
                    'image': request.build_absolute_uri(
                        log.captured_image.url
                    ) if log.captured_image else None,
                }
                for log in logs
            ]
        })


class DriverListView(APIView):
    """
    GET /api/dashboard/drivers/
    قائمة مستخدمي role=driver للوحة التحكم.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        drivers = User.objects.filter(role='driver').select_related('driver_profile').order_by('email')
        payload = []
        for d in drivers:
            assigned = Bus.objects.filter(driver=d).first()
            # تأكد من وجود بروفايل أو انشئه
            profile = getattr(d, 'driver_profile', None)
            
            payload.append({
                'id': d.id,
                'full_name': d.full_name,
                'email': d.email,
                'phone': d.phone or '',
                'is_active': d.is_active,
                'assigned_bus': assigned.bus_number if assigned else None,
                'license_number': profile.license_number if profile else '—',
                'license_expiry': str(profile.license_expiry) if profile and profile.license_expiry else '—',
                'profile_picture': request.build_absolute_uri(d.profile_picture.url) if d.profile_picture else None,
            })
        return Response({'count': len(payload), 'drivers': payload})


class AttendanceLogListView(APIView):
    """
    GET /api/dashboard/attendance/logs/
    قائمة بآخر عمليات تسجيل الحضور (boarding/leaving) للوحة التحكم
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        logs = AttendanceLog.objects.select_related(
            'student', 'student__user', 'bus'
        ).order_by('-timestamp')[:100]

        return Response([
            {
                'id': log.id,
                'student_name': log.student.user.full_name if log.student else 'Unknown',
                'university_id': log.student.university_id if log.student else None,
                'bus_number': log.bus.bus_number if log.bus else '—',
                'action': log.action,
                'timestamp': log.timestamp.isoformat(),
                'status': log.recognition_status,
                'boarding_time': log.timestamp.strftime('%H:%M') if log.action == 'boarding' else None,
            }
            for log in logs
        ])


# ══════════════════════════════════════════
# LOCATION AUDIT REPORT (Admin Only)
# ══════════════════════════════════════════

class StudentLocationAuditView(APIView):
    """
    GET /api/dashboard/reports/location-audit/

    تقرير للأدمن يُظهر لكل طالب في يوم معين:
      - وقت الصعود + رابط Google Maps لموقع الصعود
      - وقت النزول + رابط Google Maps لموقع النزول

    الهدف: يجاوب على سؤال ولي الأمر
    "فين نزل ابني النهارده؟"

    Query params:
      - date (YYYY-MM-DD) — افتراضي: اليوم
      - student_id        — اختياري: فلتر بطالب معين
      - bus_number        — اختياري: فلتر بأتوبيس معين
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # ── تحديد التاريخ ──────────────────────────────────────
        date_str = request.query_params.get('date')
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'صيغة التاريخ غلط — استخدم YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.now().date()

        # ── بناء الـ query ──────────────────────────────────────
        records = DailyAttendance.objects.filter(
            date=target_date
        ).select_related('student', 'student__user')

        # فلتر بطالب معين
        student_id = request.query_params.get('student_id')
        if student_id:
            records = records.filter(student__id=student_id)

        # فلتر بأتوبيس معين
        bus_number = request.query_params.get('bus_number')
        if bus_number:
            records = records.filter(student__assigned_bus=bus_number)

        records = records.order_by('student__user__full_name')

        # ── بناء النتيجة ────────────────────────────────────────
        def make_maps_url(lat, lng):
            """بناء رابط Google Maps من الإحداثيات"""
            if lat and lng:
                return f'https://www.google.com/maps?q={lat},{lng}'
            return None

        rows = []
        for r in records:
            boarding_url = make_maps_url(r.boarding_latitude, r.boarding_longitude)
            leaving_url  = make_maps_url(r.leaving_latitude,  r.leaving_longitude)

            rows.append({
                'student_id':    r.student.id,
                'student_name':  r.student.user.full_name,
                'university_id': r.student.university_id,
                'assigned_bus':  r.student.assigned_bus or '—',
                'status':        r.status,

                # ── Boarding ──────────────────────────────────
                'boarding_time': (
                    r.boarding_time.strftime('%I:%M %p')
                    if r.boarding_time else None
                ),
                'boarding_location': {
                    'latitude':  str(r.boarding_latitude)  if r.boarding_latitude  else None,
                    'longitude': str(r.boarding_longitude) if r.boarding_longitude else None,
                    'maps_url':  boarding_url,
                    # عرض '📍 موقع الصعود' أو '—' في الـ Frontend
                    'display':   '📍 موقع الصعود' if boarding_url else '—',
                },

                # ── Leaving ───────────────────────────────────
                'leaving_time': (
                    r.leaving_time.strftime('%I:%M %p')
                    if r.leaving_time else None
                ),
                'leaving_location': {
                    'latitude':  str(r.leaving_latitude)  if r.leaving_latitude  else None,
                    'longitude': str(r.leaving_longitude) if r.leaving_longitude else None,
                    'maps_url':  leaving_url,
                    'display':   '📍 موقع النزول' if leaving_url else '—',
                },
            })

        return Response({
            'date':  str(target_date),
            'count': len(rows),
            'rows':  rows,
        })
