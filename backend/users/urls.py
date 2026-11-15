from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .admin_views import AdminUserListView, PromoteUserView, DemoteUserView, BootAdminView
from .views import (
    LoginView, RegisterView, LogoutView, UserProfileView, 
    GoogleOAuthRedirect, ChangePasswordView, UpdateUsernameView,
    SetInitialPasswordView, UpdateRoleView
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('set-initial-password/', SetInitialPasswordView.as_view(), name='set_initial_password'),
    path('update-username/', UpdateUsernameView.as_view(), name='update_username'),
    path('update-role/', UpdateRoleView.as_view(), name='update_role'),

    # Admin management
    path('admin/users/', AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<uuid:user_id>/promote/', PromoteUserView.as_view(), name='admin_promote'),
    path('admin/users/<uuid:user_id>/demote/', DemoteUserView.as_view(), name='admin_demote'),
    path('admin/boot/', BootAdminView.as_view(), name='admin_boot'),
    
    # OAuth callback - called after allauth processes Google OAuth
    path('google/redirect/', GoogleOAuthRedirect.as_view(), name='google_oauth_redirect'),
]