"""
Admin management, modelled on a single-root-admin setup:

* The first admin is created by `python manage.py ensure_admin` (ADMIN_EMAIL / ADMIN_PASSWORD),
  or claimed once via POST /api/auth/admin/boot/ with ADMIN_BOOT_TOKEN while no admin exists.
* Admins can list users and promote / demote them. Everyone else is a normal user (buyer or builder).
* An admin can't demote themselves, so there is always at least one admin.
"""
import hmac
import os

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsPlatformAdmin
from .serializers import AdminUserSerializer

User = get_user_model()


def set_admin(user, is_admin):
    # is_superuser as well so admins can also use the Django admin site
    user.is_staff = is_admin
    user.is_superuser = is_admin
    user.save(update_fields=['is_staff', 'is_superuser'])
    return user


class AdminUserListView(generics.ListAPIView):
    """GET /api/auth/admin/users/?search=&admins_only=true"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get_queryset(self):
        qs = User.objects.all().order_by('-is_staff', '-date_joined')
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search) | Q(username__icontains=search)
                | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        if self.request.query_params.get('admins_only') == 'true':
            qs = qs.filter(is_staff=True)
        return qs


class _SetAdminView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    make_admin = True

    def post(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if not self.make_admin and target.pk == request.user.pk:
            return Response({'error': 'You cannot demote yourself'}, status=status.HTTP_400_BAD_REQUEST)

        set_admin(target, self.make_admin)
        return Response({
            'message': 'User promoted to admin' if self.make_admin else 'Admin rights removed',
            'user': AdminUserSerializer(target).data,
        })


class PromoteUserView(_SetAdminView):
    make_admin = True


class DemoteUserView(_SetAdminView):
    make_admin = False


class BootAdminView(APIView):
    """
    POST /api/auth/admin/boot/  {"token": "..."}  (or X-Admin-Boot header)
    Makes the signed-in user the first admin. Only works while no admin exists
    and ADMIN_BOOT_TOKEN is set; the token is never read from the query string.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        expected = os.getenv('ADMIN_BOOT_TOKEN')
        if not expected:
            return Response({'error': 'Boot not enabled'}, status=status.HTTP_403_FORBIDDEN)

        token = request.data.get('token') or request.headers.get('X-Admin-Boot') or ''
        if not hmac.compare_digest(str(token), expected):
            return Response({'error': 'Invalid boot token'}, status=status.HTTP_401_UNAUTHORIZED)

        if User.objects.filter(is_staff=True).exists():
            return Response({'error': 'Admin already exists'}, status=status.HTTP_409_CONFLICT)

        set_admin(request.user, True)
        return Response({'message': 'You are now the admin', 'user': AdminUserSerializer(request.user).data})
