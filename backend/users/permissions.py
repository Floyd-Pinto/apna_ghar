from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    """ApnaGhar admins are users with is_staff=True (the rest of the app already uses this flag)."""

    message = 'Admin access required'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
