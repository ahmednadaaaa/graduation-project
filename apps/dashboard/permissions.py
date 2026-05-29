from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    بيسمح بس للي الـ role بتاعهم 'admin'
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )

class IsAdminOrDriver(permissions.BasePermission):
    """
    بيسمح للأدمن وللسائق
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['admin', 'driver']
        )
