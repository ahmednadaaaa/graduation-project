from django.db import models
from django.conf import settings


class StudentProfile(models.Model):
    """
    بروفايل الطالب — كل طالب عنده بروفايل واحد بس
    مرتبط بالـ User بعلاقة OneToOne
    يعني: User واحد → StudentProfile واحد بس
    """

    # ربط مع الـ User — لما الـ User يتمسح، الـ Profile يتمسح معاه
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile'
        # related_name يخلينا نوصل للبروفايل من الـ User بـ:
        # user.student_profile
    )

    # بيانات أكاديمية
    university_id = models.CharField(
        max_length=20,
        unique=True,
        help_text='الرقم الجامعي'
    )
    faculty = models.CharField(max_length=100, help_text='الكلية')
    department = models.CharField(max_length=100, help_text='القسم')
    academic_year = models.PositiveSmallIntegerField(
        help_text='السنة الدراسية (1-5)'
    )

    # بيانات بيت الطالب (GPS)
    # بنحتاجها علشان نعرف الطالب ده على أي خط سير
    home_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='خط العرض'
    )
    home_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='خط الطول'
    )
    home_address = models.TextField(
        blank=True,
        null=True,
        help_text='العنوان كنص (اختياري)'
    )

    # الأتوبيس المخصص للطالب (هنربطه في Phase 3)
    # دلوقتي بنخليه CharField بسيط
    assigned_bus = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='رقم الأتوبيس المخصص'
    )

    # هل الـ Face Recognition اتسجل؟
    is_face_registered = models.BooleanField(
        default=False,
        help_text='هل تم تسجيل الوجه؟'
    )

    # FCM Token للـ Push Notifications (Firebase Cloud Messaging)
    fcm_token = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text='Firebase Cloud Messaging token for push notifications'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'

    def __str__(self):
        return f"{self.user.full_name} - {self.university_id}"

    @property
    def face_images_count(self):
        # عدد صور الوجه المرفوعة
        # self.face_images ده الـ related_name من FaceImage
        return self.face_images.count()

    @property
    def has_enough_face_images(self):
        # محتاج على الأقل صورة واحدة علشان الـ AI يشتغل
        return self.face_images.count() >= 1


def face_image_upload_path(instance, filename):
    """
    دالة بتحدد مسار حفظ صورة الوجه
    instance = الـ FaceImage object
    filename = اسم الملف الأصلي

    النتيجة: media/faces/student_42/image.jpg
    """
    student_id = instance.student.id
    return f'faces/student_{student_id}/{filename}'


class FaceImage(models.Model):
    """
    صور وجه الطالب — كل طالب ممكن يرفع أكتر من صورة
    علشان الـ AI يتعلم وجهه بشكل أفضل من زوايا مختلفة
    """

    # ربط مع StudentProfile — One Student → Many FaceImages
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='face_images'
        # related_name يخلينا نوصل للصور بـ:
        # student_profile.face_images.all()
    )

    # الصورة نفسها
    image = models.ImageField(
        upload_to=face_image_upload_path,  # بيستخدم الدالة اللي فوق
        help_text='صورة الوجه'
    )

    # اسم توضيحي (اختياري) — مثلاً "front", "left", "right"
    label = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='وصف الصورة (أمام، يمين، شمال)'
    )

    # الـ face embedding — ده vector رقمي للوجه
    # هنملاه في Phase 4 لما نعمل الـ AI
    # دلوقتي بنعمله TextField فاضي
    face_embedding = models.TextField(
        blank=True,
        null=True,
        help_text='الـ face vector - بيتملا أوتوماتيك'
    )

    # هل اتعالجت الصورة وطلع منها الـ embedding؟
    is_processed = models.BooleanField(
        default=False,
        help_text='هل تم معالجة الصورة واستخراج الـ embedding؟'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Face Image'
        verbose_name_plural = 'Face Images'

    def __str__(self):
        return f"Face of {self.student.user.full_name} - {self.label or 'unlabeled'}"
