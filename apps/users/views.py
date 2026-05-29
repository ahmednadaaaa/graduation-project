from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/users/register/
    Anyone can register — no auth token needed
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        # Log exactly what the frontend sends
        logger.warning(f"[REGISTER] request.data = {dict(request.data)}")

        academic_year = request.data.get('academic_year', 1)
        serializer = RegisterSerializer(data=request.data, context={'academic_year': academic_year})

        if serializer.is_valid():
            user = serializer.save()
            
            # Notify admins about the new user needing approval
            try:
                from apps.websockets.utils import send_user_notification
                from apps.websockets.models import Notification
                admin_users = User.objects.filter(role='admin')
                for admin in admin_users:
                    send_user_notification(
                        user=admin,
                        title="New User Registration",
                        message=f"{user.full_name} ({user.email}) registered as {user.role} and is awaiting approval.",
                        notif_type=Notification.NotifType.NEW_USER,
                        link="/admin-dashboard/pending"
                    )
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")

            return Response(
                {
                    'message': 'Account created successfully. Pending admin approval.',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'is_approved': user.is_approved,
                    }
                },
                status=status.HTTP_201_CREATED
            )

        # Log errors and return them in full
        logger.warning(f"[REGISTER] validation errors = {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """
    GET  /api/users/profile/   → get my profile
    PUT  /api/users/profile/   → update my profile
    """
    permission_classes = [IsAuthenticated]  # must be logged in

    def get(self, request):
        # request.user is automatically set by JWT middleware
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        # partial=True means: update only the fields that are sent
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AdminPendingUsersView(APIView):
    """GET /api/users/admin/pending/ -> returns list of users pending approval"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({"detail": "Only admins can view pending users."}, status=status.HTTP_403_FORBIDDEN)
        
        pending_users = User.objects.filter(is_approved=False, is_active=True).order_by('-date_joined')
        serializer = UserProfileSerializer(pending_users, many=True)
        return Response(serializer.data)

class AdminApproveUserView(APIView):
    """POST /api/users/admin/approve/<id>/ -> approve user"""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({"detail": "Only admins can approve users."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user_to_approve = User.objects.get(id=user_id)
            user_to_approve.approve(admin_user=request.user)
            
            try:
                from apps.websockets.utils import send_user_notification
                from apps.websockets.models import Notification
                send_user_notification(
                    user=user_to_approve,
                    title="Account Approved",
                    message="Your account has been approved. You can now login.",
                    notif_type=Notification.NotifType.APPROVED
                )
            except Exception:
                pass
            
            return Response({"message": f"User {user_to_approve.email} approved successfully."})
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class AdminRejectUserView(APIView):
    """POST /api/users/admin/reject/<id>/ -> reject user"""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({"detail": "Only admins can reject users."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user_to_reject = User.objects.get(id=user_id)
            reason = request.data.get('reason', '')
            user_to_reject.reject(reason=reason)

            try:
                from apps.websockets.utils import send_user_notification
                from apps.websockets.models import Notification
                send_user_notification(
                    user=user_to_reject,
                    title="Account Rejected",
                    message=f"Your account was rejected. Reason: {reason}",
                    notif_type=Notification.NotifType.REJECTED
                )
            except Exception:
                pass

            return Response({"message": f"User {user_to_reject.email} rejected successfully."})
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
