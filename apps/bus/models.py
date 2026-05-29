from django.db import models
from django.conf import settings


class Route(models.Model):
    """
    خط السير — مثلاً: "كفر الشيخ ← الجامعة"
    كل الأتوبيس بيمشي على Route معينة
    """

    name = models.CharField(
        max_length=100,
        help_text='اسم الخط - مثلاً: كفر الشيخ - الجامعة'
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text='وصف الخط'
    )

    # إجمالي المسافة بالكيلومتر
    total_distance_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )

    # وقت الرحلة المتوقع بالدقائق
    estimated_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Route'
        verbose_name_plural = 'Routes'

    def __str__(self):
        return self.name


class RouteStop(models.Model):
    """
    محطة على خط السير
    كل Route عندها محطات متعددة مرتبة
    """

    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='stops'
        # route.stops.all() → كل محطات الخط ده
    )

    name = models.CharField(max_length=100, help_text='اسم المحطة')

    # إحداثيات المحطة
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    # ترتيب المحطة في الخط (1, 2, 3, ...)
    order = models.PositiveSmallIntegerField(help_text='ترتيب المحطة')

    # وقت الوصول المتوقع من بداية الرحلة بالدقائق
    estimated_arrival_minutes = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Route Stop'
        verbose_name_plural = 'Route Stops'
        # بيرتب المحطات تلقائياً بالترتيب
        ordering = ['order']
        # مينفعش نفس الترتيب يتكرر في نفس الخط
        unique_together = ['route', 'order']

    def __str__(self):
        return f"{self.route.name} - محطة {self.order}: {self.name}"


class Bus(models.Model):
    """
    الأتوبيس — البيانات الأساسية
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', 'شغال'
        INACTIVE = 'inactive', 'مش شغال'
        MAINTENANCE = 'maintenance', 'صيانة'
        EN_ROUTE = 'en_route', 'في الطريق'
        ARRIVED = 'arrived', 'وصل'

    # رقم الأتوبيس — زي لوحة المركبة
    bus_number = models.CharField(
        max_length=20,
        unique=True,
        help_text='رقم الأتوبيس - مثلاً: BUS-01'
    )

    # بيانات المركبة
    plate_number = models.CharField(
        max_length=20,
        unique=True,
        help_text='رقم اللوحة'
    )
    capacity = models.PositiveSmallIntegerField(
        default=40,
        help_text='عدد المقاعد'
    )

    # السائق المخصص للأتوبيس
    # null=True علشان ممكن الأتوبيس مفيش سائق متخصص له
    driver = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_bus',
        limit_choices_to={'role': 'driver'},
        # limit_choices_to: في الـ Admin بيظهر بس الـ users اللي role='driver'
        help_text='السائق المخصص'
    )

    # خط السير
    route = models.ForeignKey(
        Route,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='buses'
    )

    # حالة الأتوبيس دلوقتي
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INACTIVE
    )

    # هل الأتوبيس شغال دلوقتي؟
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bus'
        verbose_name_plural = 'Buses'

    def __str__(self):
        return f"{self.bus_number} - {self.plate_number}"

    @property
    def current_location(self):
        """
        بيجيب آخر موقع اتسجل للأتوبيس ده
        latest('timestamp') = بيجيب الـ record الأحدث
        """
        return self.locations.order_by('-timestamp').first()

    @property
    def driver_name(self):
        if self.driver:
            return self.driver.full_name
        return 'لا يوجد سائق'


class BusLocation(models.Model):
    """
    سجل مواقع الأتوبيس — كل مرة الـ ESP32 يبعت موقع بيتحفظ هنا
    ده بيعمل "تاريخ" كامل لمسار الأتوبيس
    """

    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name='locations'
        # bus.locations.all() → كل المواقع المسجلة للأتوبيس ده
    )

    # الإحداثيات
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text='خط العرض'
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text='خط الطول'
    )

    # السرعة (اختياري — لو الـ GPS بيبعتها)
    speed_kmh = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='السرعة بالكيلومتر/ساعة'
    )

    # الاتجاه بالدرجات (0 = شمال، 90 = شرق، ...)
    heading = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='الاتجاه بالدرجات'
    )

    # وقت إرسال الموقع من الـ ESP32
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Bus Location'
        verbose_name_plural = 'Bus Locations'
        # آخر موقع يظهر أول
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.bus.bus_number} @ {self.timestamp}"
