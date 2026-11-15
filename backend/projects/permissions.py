from rest_framework import permissions

from .access import can_view_unit_private, get_developer, is_admin, manages_project, project_of


class IsProjectManagerOrReadOnly(permissions.BasePermission):
    """
    Anyone can read. Writes need a signed-in user, and for an existing object
    the user must be the builder who owns its project (or an admin).
    """
    message = 'Only the builder who owns this project can change it.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return manages_project(request.user, project_of(obj))


class PropertyAccess(IsProjectManagerOrReadOnly):
    """Available units are public; booked/sold units only for their buyer, builder or an admin."""
    message = 'You do not have access to this unit.'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return obj.status == 'available' or can_view_unit_private(request.user, obj)
        return manages_project(request.user, obj.project)


class IsDeveloperOwnerOrReadOnly(permissions.BasePermission):
    """Developer profiles can only be edited by the builder they belong to (or an admin)."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin(request.user) or obj.user_id == request.user.id


class IsAuthorOrReadOnly(permissions.BasePermission):
    """Reviews can only be edited/deleted by their author (or an admin)."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin(request.user) or obj.user_id == request.user.id


class IsAdmin(permissions.BasePermission):
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return is_admin(request.user)


# Kept for backwards compatibility with existing imports
class IsBuilderOrReadOnly(IsProjectManagerOrReadOnly):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin(request.user) or get_developer(request.user) is not None


IsOwnerOrBuilderOrReadOnly = PropertyAccess
