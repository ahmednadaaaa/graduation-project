from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Allow default validation to run (checks email/password)
        data = super().validate(attrs)

        # Check if user is approved
        if not self.user.is_approved:
            reason = self.user.rejection_reason or "Your account is pending admin approval."
            if not self.user.is_active and self.user.rejection_reason:
                raise AuthenticationFailed(f"Account rejected: {reason}")
            raise AuthenticationFailed("Your account is pending admin approval. You cannot login yet.")

        # Optionally add extra data to the response
        data['role'] = self.user.role
        data['full_name'] = self.user.full_name
        
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'full_name', 'role', 'phone')

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.role == 'student':
            academic_year = self.context.get('academic_year', 1)
            from apps.students.models import StudentProfile
            import time
            StudentProfile.objects.create(
                user=user,
                university_id=f"U{int(time.time())}",
                faculty="General",
                department="General",
                academic_year=academic_year
            )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    assigned_bus = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'phone', 'role', 'date_joined', 'is_approved', 'profile_picture', 'assigned_bus')
        read_only_fields = ('id', 'email', 'role', 'date_joined', 'is_approved', 'assigned_bus')

    def get_assigned_bus(self, obj):
        if obj.role == 'driver':
            bus = getattr(obj, 'assigned_bus', None)
            return bus.bus_number if bus else None
        elif obj.role == 'student':
            profile = getattr(obj, 'student_profile', None)
            return profile.assigned_bus if profile else None
        return None
