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
    face_images = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
        help_text="List of base64-encoded face images captured during registration"
    )

    class Meta:
        model = User
        fields = ('email', 'password', 'full_name', 'role', 'phone', 'face_images')

    def create(self, validated_data):
        face_images_data = validated_data.pop('face_images', [])
        user = User.objects.create_user(**validated_data)
        if user.role == 'student':
            academic_year = self.context.get('academic_year', 1)
            from apps.students.models import StudentProfile, FaceImage
            from apps.ai.face_recognition_service import face_recognition_service
            from django.core.files.base import ContentFile
            import time
            import base64
            import logging
            logger = logging.getLogger(__name__)

            # Create StudentProfile
            profile = StudentProfile.objects.create(
                user=user,
                university_id=f"U{int(time.time())}",
                faculty="General",
                department="General",
                academic_year=academic_year
            )

            # Process and save face images
            saved_count = 0
            for idx, img_str in enumerate(face_images_data):
                try:
                    # If it's a data URL, e.g. "data:image/jpeg;base64,..."
                    if ',' in img_str:
                        header, img_str = img_str.split(',', 1)
                    
                    img_data = base64.b64decode(img_str)
                    file_name = f"face_{idx}_{int(time.time())}.jpg"
                    
                    face_image_obj = FaceImage.objects.create(
                        student=profile,
                        image=ContentFile(img_data, name=file_name),
                        label=f"registration_{idx}"
                    )
                    
                    # Generate embedding
                    processed = face_recognition_service.process_and_save_embedding(face_image_obj)
                    if processed:
                        saved_count += 1
                        logger.info(f"Successfully processed registration image {idx} for student {user.email}")
                    else:
                        logger.warning(f"Could not extract face embedding for registration image {idx} for student {user.email}")
                except Exception as e:
                    logger.error(f"Failed to process registration face image {idx} for student {user.email}: {e}")
            
            # If we successfully processed at least one face image, set is_face_registered = True
            if saved_count > 0:
                profile.is_face_registered = True
                profile.save(update_fields=['is_face_registered'])
                logger.info(f"Set is_face_registered=True for student {user.email} with {saved_count} face images.")
            else:
                logger.warning(f"No face images were successfully processed for student {user.email}.")

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
