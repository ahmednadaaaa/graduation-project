from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, ProfileView, CustomTokenObtainPairView,
    AdminPendingUsersView, AdminApproveUserView, AdminRejectUserView
)

urlpatterns = [
    # Registration
    path('register/', RegisterView.as_view(), name='register'),
    
    # Login (Custom)
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # TokenRefreshView → Refresh an expired access token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),

    # Admin Approval endpoints
    path('admin/pending/', AdminPendingUsersView.as_view(), name='admin_pending_users'),
    path('admin/approve/<int:user_id>/', AdminApproveUserView.as_view(), name='admin_approve_user'),
    path('admin/reject/<int:user_id>/', AdminRejectUserView.as_view(), name='admin_reject_user'),
]
