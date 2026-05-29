from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudentProfile, FaceImage

User = get_user_model()


class FaceImageSerializer(serializers.ModelSerializer):
    """
    Serializer لصور الوجه
    """
    class Meta:
        model = FaceImage
        fields = ['id', 'image', 'label', 'is_processed', 'created_at']
        # is_processed بيتملا أوتوماتيك — مش المستخدم اللي يحدده
        read_only_fields = ['id', 'is_processed', 'created_at']


class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Serializer لبروفايل الطالب
    بيجيب البيانات مع صور الوجه مع بيانات الـ User
    """

    # بيجيب صور الوجه المرتبطة بالطالب
    # many=True لأنها أكتر من صورة
    # read_only لأننا بنرفع الصور بـ endpoint منفصل
    face_images = FaceImageSerializer(many=True, read_only=True)

    # بيجيب اسم الطالب من الـ User المرتبط
    # source='user.full_name' يعني: روح جيب full_name من الـ user
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)

    # property من الـ model
    face_images_count = serializers.ReadOnlyField()
    has_enough_face_images = serializers.ReadOnlyField()

    class Meta:
        model = StudentProfile
        fields = [
            'id',
            'full_name',
            'email',
            'profile_picture',
            'university_id',
            'faculty',
            'department',
            'academic_year',
            'home_latitude',
            'home_longitude',
            'home_address',
            'assigned_bus',
            'is_face_registered',
            'face_images_count',
            'has_enough_face_images',
            'face_images',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'is_face_registered',
            'created_at'
        ]


class CreateStudentProfileSerializer(serializers.ModelSerializer):
    """
    Serializer خاص لإنشاء بروفايل طالب جديد
    أبسط من الـ serializer الكبير — بس البيانات الأساسية
    """
    class Meta:
        model = StudentProfile
        fields = [
            'university_id',
            'faculty',
            'department',
            'academic_year',
            'home_latitude',
            'home_longitude',
            'home_address',
            'assigned_bus',
        ]

    def validate_university_id(self, value):
        """
        validate_ + اسم الـ field = دالة بتتشغل أوتوماتيك عند الـ validation
        بنتأكد إن الرقم الجامعي مش موجود قبل كده
        """
        # عند الـ update، نتجاهل الـ instance الحالي
        instance = self.instance
        qs = StudentProfile.objects.filter(university_id=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'الرقم الجامعي ده موجود بالفعل'
            )
        return value

    def validate_academic_year(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                'السنة الدراسية لازم تكون بين 1 و 5'
            )
        return value

    def create(self, validated_data):
        # الـ user بيجي من الـ view مش من الـ request
        # هنشوف ده في الـ view دلوقتي
        user = self.context['request'].user
        return StudentProfile.objects.create(user=user, **validated_data)


class UploadFaceImageSerializer(serializers.ModelSerializer):
    """
    Serializer بسيط لرفع صورة وجه واحدة
    """
    class Meta:
        model = FaceImage
        fields = ['id', 'image', 'label', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_image(self, value):
        """
        بنتحقق من حجم الصورة — مش أكتر من 5MB
        value هنا هو الـ file object
        """
        max_size = 5 * 1024 * 1024  # 5 MB بالـ bytes

        if value.size > max_size:
            raise serializers.ValidationError(
                'حجم الصورة لازم يكون أقل من 5MB'
            )
        return value
