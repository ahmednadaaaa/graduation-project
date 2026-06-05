from django.db import models


class AttendanceLog(models.Model):
    """
    سجل الحضور — كل مرة طالب يركب أو ينزل من الأتوبيس
    بيتسجل record جديد هنا
    """

    class Action(models.TextChoices):
        BOARDING = 'boarding', 'ركب الأتوبيس'
        LEAVING  = 'leaving',  'نزل من الأتوبيس'

    class Status(models.TextChoices):
        RECOGNIZED   = 'recognized',   'تم التعرف'
        UNRECOGNIZED = 'unrecognized', 'لم يتم التعرف'
        ERROR        = 'error',        'خطأ في المعالجة'

    # الطالب اللي اتعرف عليه
    # null=True علشان لو ملقاش الوجه، بنحفظ الـ log بـ null
    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_logs'
    )

    # الأتوبيس اللي حصل فيه الـ event
    bus = models.ForeignKey(
        'bus.Bus',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_logs'
    )

    # الحدث: ركب ولا نزل؟
    action = models.CharField(
        max_length=10,
        choices=Action.choices,
        default=Action.BOARDING
    )

    # هل الـ AI عرف الطالب؟
    recognition_status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.UNRECOGNIZED
    )

    # نسبة الثقة في التعرف (0.0 → 1.0)
    # مثلاً 0.87 تعني 87% مطابقة
    confidence_score = models.FloatField(
        null=True,
        blank=True,
        help_text='نسبة الثقة في التعرف (0.0 - 1.0)'
    )

    # الصورة الملتقطة من الـ ESP32
    captured_image = models.ImageField(
        upload_to='attendance/captures/',
        null=True,
        blank=True,
        help_text='الصورة الملتقطة من الكاميرا'
    )

    # موقع الأتوبيس وقت الـ scan (الحقول القديمة — محافظ عليها)
    bus_latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True
    )
    bus_longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True
    )

    # ── حقول GPS للمراجعة الإدارية ──────────────────────────────
    # بيتحفظوا أوتوماتيك من موقع الأتوبيس وقت الـ boarding/leaving
    # كلهم اختياريين علشان النظام يشتغل لو مفيش GPS
    boarding_latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط عرض موقع الصعود'
    )
    boarding_longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط طول موقع الصعود'
    )
    leaving_latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط عرض موقع النزول'
    )
    leaving_longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط طول موقع النزول'
    )

    # وقت الـ event
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Attendance Log'
        verbose_name_plural = 'Attendance Logs'
        ordering = ['-timestamp']

    def __str__(self):
        student_name = self.student.user.full_name if self.student else 'Unknown'
        return f"{student_name} - {self.action} - {self.timestamp}"

    @property
    def student_name(self):
        if self.student:
            return self.student.user.full_name
        return 'غير معروف'

    @property
    def boarding_maps_url(self):
        """رابط Google Maps لموقع الصعود — None لو مفيش إحداثيات"""
        if self.boarding_latitude and self.boarding_longitude:
            return f'https://www.google.com/maps?q={self.boarding_latitude},{self.boarding_longitude}'
        return None

    @property
    def leaving_maps_url(self):
        """رابط Google Maps لموقع النزول — None لو مفيش إحداثيات"""
        if self.leaving_latitude and self.leaving_longitude:
            return f'https://www.google.com/maps?q={self.leaving_latitude},{self.leaving_longitude}'
        return None


class DailyAttendance(models.Model):
    """
    ملخص الحضور اليومي لكل طالب
    بدل ما نحسب كل يوم من الـ AttendanceLog
    بنعمل record ملخص هنا أوتوماتيك
    """

    class AttendanceStatus(models.TextChoices):
        PRESENT = 'present', 'حاضر'
        ABSENT  = 'absent',  'غائب'
        LATE    = 'late',    'متأخر'

    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='daily_attendance'
    )

    date = models.DateField()

    status = models.CharField(
        max_length=10,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.ABSENT
    )

    # وقت الركوب ووقت النزول
    boarding_time = models.DateTimeField(null=True, blank=True)
    leaving_time  = models.DateTimeField(null=True, blank=True)

    # ── إحداثيات GPS لأغراض المراجعة الإدارية ──────────────────
    # بتتحفظ أوتوماتيك من موقع الأتوبيس — اختيارية دايماً
    boarding_latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط عرض موقع الصعود'
    )
    boarding_longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط طول موقع الصعود'
    )
    leaving_latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط عرض موقع النزول'
    )
    leaving_longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text='خط طول موقع النزول'
    )

    class Meta:
        verbose_name = 'Daily Attendance'
        verbose_name_plural = 'Daily Attendance'
        # مينفعش طالب عنده أكتر من record في نفس اليوم
        unique_together = ['student', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.user.full_name} - {self.date} - {self.status}"
