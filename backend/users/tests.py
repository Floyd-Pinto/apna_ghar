import os
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


def make_user(email, **extra):
    return User.objects.create_user(
        email=email, username=email.split('@')[0], password='pass12345',
        first_name='T', last_name='U', **extra,
    )


class AdminManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user('root@example.com', is_staff=True, is_superuser=True)
        self.user = make_user('user@example.com')

    def test_regular_user_cannot_list_or_promote(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get('/api/auth/admin/users/').status_code, 403)
        resp = self.client.post(f'/api/auth/admin/users/{self.user.id}/promote/')
        self.assertEqual(resp.status_code, 403)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_admin_lists_users_with_search(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/auth/admin/users/', {'search': 'user@'})
        self.assertEqual(resp.status_code, 200)
        emails = [u['email'] for u in resp.data['results']]
        self.assertEqual(emails, ['user@example.com'])

    def test_admin_promotes_then_demotes(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/auth/admin/users/{self.user.id}/promote/')
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff and self.user.is_superuser)

        resp = self.client.post(f'/api/auth/admin/users/{self.user.id}/demote/')
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff or self.user.is_superuser)

    def test_admin_cannot_demote_self(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(f'/api/auth/admin/users/{self.admin.id}/demote/')
        self.assertEqual(resp.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_staff)

    def test_profile_update_cannot_self_promote(self):
        self.client.force_authenticate(self.user)
        self.client.patch('/api/auth/profile/', {'is_staff': True}, format='json')
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)


class BootAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('first@example.com')
        self.client.force_authenticate(self.user)

    def test_disabled_without_token_env(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop('ADMIN_BOOT_TOKEN', None)
            self.assertEqual(self.client.post('/api/auth/admin/boot/', {'token': 'x'}).status_code, 403)

    @mock.patch.dict(os.environ, {'ADMIN_BOOT_TOKEN': 'secret'})
    def test_wrong_token_rejected(self):
        self.assertEqual(self.client.post('/api/auth/admin/boot/', {'token': 'nope'}).status_code, 401)

    @mock.patch.dict(os.environ, {'ADMIN_BOOT_TOKEN': 'secret'})
    def test_boot_only_once(self):
        self.assertEqual(self.client.post('/api/auth/admin/boot/', {'token': 'secret'}).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)

        other = make_user('second@example.com')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post('/api/auth/admin/boot/', {'token': 'secret'}).status_code, 409)


class EnsureAdminCommandTests(TestCase):
    def test_creates_admin(self):
        call_command('ensure_admin', email='Boss@Example.com', password='pw-123456', stdout=StringIO())
        user = User.objects.get(email='boss@example.com')
        self.assertTrue(user.is_staff and user.is_superuser)
        self.assertTrue(user.check_password('pw-123456'))

    def test_promotes_existing_user(self):
        make_user('existing@example.com')
        call_command('ensure_admin', email='existing@example.com', stdout=StringIO())
        self.assertTrue(User.objects.get(email='existing@example.com').is_staff)

    def test_skips_without_email(self):
        out = StringIO()
        call_command('ensure_admin', email=None, stdout=out)
        self.assertIn('skipping', out.getvalue())


class PasswordHashingTests(TestCase):
    def test_create_user_can_log_in(self):
        make_user('login@example.com')
        resp = APIClient().post('/api/auth/login/', {'username_or_email': 'login@example.com', 'password': 'pass12345'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIn('access', resp.data['tokens'])
        self.assertIn('is_staff', resp.data['user'])
        self.assertFalse(resp.data['user']['is_staff'])

    def test_register_then_log_in(self):
        client = APIClient()
        resp = client.post('/api/auth/register/', {
            'username': 'newbie', 'email': 'newbie@example.com', 'password': 'Str0ng-pass!',
            'password2': 'Str0ng-pass!', 'first_name': 'New', 'last_name': 'Bie', 'role': 'buyer',
        }, format='json')
        self.assertIn(resp.status_code, (200, 201), resp.content)
        resp = client.post('/api/auth/login/', {'username_or_email': 'newbie@example.com', 'password': 'Str0ng-pass!'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
