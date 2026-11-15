import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create (or promote) the root admin from ADMIN_EMAIL / ADMIN_PASSWORD (safe to run on every deploy)."

    def add_arguments(self, parser):
        parser.add_argument('--email', default=os.getenv('ADMIN_EMAIL'))
        parser.add_argument('--password', default=os.getenv('ADMIN_PASSWORD'))
        parser.add_argument('--username', default=os.getenv('ADMIN_USERNAME', 'admin'))

    def handle(self, *args, email=None, password=None, username='admin', **options):
        if not email:
            self.stdout.write('ADMIN_EMAIL not set - skipping admin bootstrap')
            return

        User = get_user_model()
        email = email.strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        if user:
            if user.is_staff and user.is_superuser:
                self.stdout.write(f'{email} is already an admin')
                return
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])
            self.stdout.write(self.style.SUCCESS(f'Promoted {email} to admin'))
            return

        if not password:
            raise CommandError('ADMIN_PASSWORD is required to create a new admin account')

        base, n = username, 1
        while User.objects.filter(username=username).exists():
            n += 1
            username = f'{base}{n}'

        User.objects.create_superuser(
            email=email, username=username, password=password,
            first_name='Admin', last_name='User',
        )
        self.stdout.write(self.style.SUCCESS(f'Created admin {email}'))
