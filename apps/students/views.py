from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import StudentProfile, FaceImage
from .serializers import (
    StudentProfileSerializer,
    CreateStudentProfileSerializer,
    UploadFaceImageSerializer,
)
from apps.ai.face_recognition_service import face_recognition_service


class StudentProfileView(APIView):
    """
    GET  /api/students/profile/   → اعرض بروفايل طالب
    POST /api/students/profile/   → إنشاء بروفايل جديد
    PUT  /api/students/profile/   → تحديث البروفايل
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # get_object_or_404:
        # لو لقى الـ profile يرجعه
        # لو ملقاش يرجع 404 أوتوماتيك بدل ما يـ crash
        profile = get_object_or_404(
            StudentProfile,
            user=request.user
        )
        serializer = StudentProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        # أولاً: تأكد إن المستخدم ده طالب
        if request.user.role != 'student':
            return Response(
                {'error': 'بس الطلاب ينفعوا يعملوا بروفايل طالب'},
                status=status.HTTP_403_FORBIDDEN
            )

        # تأكد إن الطالب مش عامل بروفايل قبل كده
        if StudentProfile.objects.filter(user=request.user).exists():
            return Response(
                {'error': 'البروفايل موجود بالفعل'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # context={'request': request} علشان الـ serializer
        # يعرف مين الـ user اللي بيعمل الـ profile
        serializer = CreateStudentProfileSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            profile = serializer.save()

            # نرجع البروفايل كامل بعد الإنشاء
            return Response(
                StudentProfileSerializer(profile).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        profile = get_object_or_404(StudentProfile, user=request.user)

        serializer = CreateStudentProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            profile = serializer.save()
            return Response(StudentProfileSerializer(profile).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FaceImageView(APIView):
    """
    GET    /api/students/face-images/          → اعرض كل الصور
    POST   /api/students/face-images/          → رفع صورة جديدة
    DELETE /api/students/face-images/<id>/     → مسح صورة
    """
    permission_classes = [IsAuthenticated]

    def _get_student_profile(self, user):
        """
        دالة مساعدة خاصة (الـ _ قبلها معناها private)
        بتجيب بروفايل الطالب أو ترجع None
        """
        return get_object_or_404(StudentProfile, user=user)

    def get(self, request):
        profile = self._get_student_profile(request.user)
        images = profile.face_images.all()

        serializer = UploadFaceImageSerializer(images, many=True)

        return Response({
            'count': images.count(),
            'has_enough': profile.has_enough_face_images,
            'images': serializer.data
        })

    def post(self, request):
        profile = self._get_student_profile(request.user)

        # الحد الأقصى 10 صور لكل طالب
        if profile.face_images.count() >= 10:
            return Response(
                {'error': 'وصلت للحد الأقصى (10 صور)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # request.FILES فيها الملفات المرفوعة
        # request.data فيها البيانات النصية
        serializer = UploadFaceImageSerializer(data=request.data)

        if serializer.is_valid():
            # بنحفظ الصورة ونربطها بالـ profile
            face_image = serializer.save(student=profile)

            # ← الجديد: عالج الصورة وعمل embedding أوتوماتيك
            processed = face_recognition_service.process_and_save_embedding(
                face_image
            )

            # لو الطالب رفع 3 صور أو أكتر، نحدث is_face_registered
            if profile.has_enough_face_images and not profile.is_face_registered:
                profile.is_face_registered = True
                profile.save(update_fields=['is_face_registered'])

            response_data = serializer.data
            response_data['embedding_processed'] = processed

            return Response(
                response_data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, image_id):
        profile = self._get_student_profile(request.user)

        # get_object_or_404 بيتأكد إن الصورة دي فعلاً للطالب ده
        image = get_object_or_404(
            FaceImage,
            id=image_id,
            student=profile   # ← مهم جداً — أمان
        )

        image.delete()

        # لو بقت أقل من 3 صور، خلي is_face_registered = False
        if not profile.has_enough_face_images:
            profile.is_face_registered = False
            profile.save(update_fields=['is_face_registered'])

        return Response(
            {'message': 'تم مسح الصورة'},
            status=status.HTTP_204_NO_CONTENT
        )


class StudentAttendanceHistoryView(APIView):
    """
    GET /api/students/attendance/history/
    سجل الحضور الخاص بالطالب
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_object_or_404(StudentProfile, user=request.user)
        
        from apps.attendance.models import AttendanceLog
        logs = AttendanceLog.objects.filter(
            student=profile
        ).select_related('bus').order_by('-timestamp')

        return Response([
            {
                'id': log.id,
                'date': log.timestamp.strftime('%Y-%m-%d'),
                'boarding_time': log.timestamp.strftime('%H:%M'),
                'bus_number': log.bus.bus_number if log.bus else '—',
                'status': 'present', # في ليفل الطالب كله present لأنه سجل فعلا
                'action': log.action
            }
            for log in logs
        ])
