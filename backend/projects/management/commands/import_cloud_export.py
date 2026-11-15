"""
Load the CSV export of the old cloud (Supabase) database into the current database.

    python manage.py import_cloud_export            # add to whatever is there
    python manage.py import_cloud_export --replace  # wipe projects/developers first (drops the demo seed data)

Reads developers.csv, projects.csv, properties.csv and construction_milestones.csv from
rag-pipeline/data/ (override with --dir). User accounts were not part of the export, so one
builder login is created per developer (password: --builder-password, default "Builder@123").
"""
import csv
import json
import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction
from django.utils.dateparse import parse_date, parse_datetime

from projects.models import ConstructionMilestone, Developer, Project, Property

User = get_user_model()

FILES = {
    'developers': 'developers.csv',
    'projects': 'projects.csv',
    'properties': 'properties.csv',
    'milestones': 'construction_milestones.csv',
}


def convert(field, raw):
    """Turn a CSV cell into a value for `field` (CSV exports store everything as text)."""
    if raw is None or raw == '':
        if isinstance(field, models.JSONField):
            return field.get_default()
        if isinstance(field, (models.CharField, models.TextField)) and not field.null:
            return ''
        return None
    if isinstance(field, models.JSONField):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return field.get_default()
    if isinstance(field, models.BooleanField):
        return raw.strip().lower() in ('true', 't', '1', 'yes')
    if isinstance(field, models.DecimalField):
        try:
            return Decimal(raw)
        except InvalidOperation:
            return None
    if isinstance(field, (models.IntegerField, models.BigIntegerField, models.PositiveIntegerField)):
        return int(float(raw))
    if isinstance(field, models.DateTimeField):
        return parse_datetime(raw.replace(' ', 'T', 1)) if 'T' not in raw else parse_datetime(raw)
    if isinstance(field, models.DateField):
        return parse_date(raw[:10])
    return raw


def row_to_kwargs(model, row, skip=()):
    fields = {f.attname: f for f in model._meta.concrete_fields}
    out = {}
    for column, raw in row.items():
        if column in skip or column not in fields:
            continue
        out[column] = convert(fields[column], raw)
    return out


class Command(BaseCommand):
    help = 'Import the CSV export of the old cloud database (developers, projects, units, milestones).'

    def add_arguments(self, parser):
        default_dir = Path(settings.BASE_DIR).parent / 'rag-pipeline' / 'data'
        parser.add_argument('--dir', default=os.getenv('RAG_DATA_DIR', str(default_dir)))
        parser.add_argument('--replace', action='store_true',
                            help='Delete existing projects and developers (e.g. demo seed data) first')
        parser.add_argument('--builder-password', default='Builder@123')

    def read(self, directory, key):
        path = Path(directory) / FILES[key]
        if not path.exists():
            raise CommandError(f'Missing {path}')
        with open(path, newline='', encoding='utf-8') as f:
            return list(csv.DictReader(f))

    @transaction.atomic
    def handle(self, *args, dir, replace, builder_password, **options):
        rows = {key: self.read(dir, key) for key in FILES}

        if replace:
            self.stdout.write('Removing existing projects and developers...')
            Project.objects.all().delete()
            Developer.objects.all().delete()

        # Developers + one builder login each
        dev_map, logins = {}, []
        for row in rows['developers']:
            slug = re.sub(r'[^a-z0-9]+', '.', row['company_name'].lower()).strip('.') or f"builder{row['id']}"
            email = f'{slug}@builders.apnaghar.local'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'username': slug[:150], 'first_name': row['company_name'][:150],
                          'last_name': 'Builder', 'role': 'builder'},
            )
            if created:
                user.set_password(builder_password)
                user.save()
                logins.append(email)
            elif user.role != 'builder':
                user.role = 'builder'
                user.save(update_fields=['role'])

            existing = getattr(user, 'developer_profile', None)
            kwargs = row_to_kwargs(Developer, row, skip=('id', 'user_id'))
            if existing:
                for k, v in kwargs.items():
                    setattr(existing, k, v)
                existing.save()
                dev_map[row['id']] = existing
            else:
                if kwargs.get('rera_number'):
                    Developer.objects.filter(rera_number=kwargs['rera_number']).delete()
                dev_map[row['id']] = Developer.objects.create(user=user, **kwargs)

        # Projects (keep their UUIDs so units/milestones still point at them)
        existing_projects = set(Project.objects.values_list('id', flat=True))
        projects = []
        for row in rows['projects']:
            developer = dev_map.get(row['developer_id'])
            if developer is None:
                continue
            kwargs = row_to_kwargs(Project, row, skip=('developer_id',))
            if kwargs['id'] in {str(i) for i in existing_projects}:
                continue
            projects.append(Project(developer=developer, **kwargs))
        Project.objects.bulk_create(projects, batch_size=200)
        project_ids = {str(i) for i in Project.objects.values_list('id', flat=True)}

        # Units: bulk_create skips Property.save(), so the exported QR codes/secrets are kept
        # and no blockchain call is made per unit. Buyers weren't exported, so buyer stays empty.
        existing_units = {str(i) for i in Property.objects.values_list('id', flat=True)}
        units = [
            Property(**row_to_kwargs(Property, row, skip=('buyer_id',)))
            for row in rows['properties']
            if row['project_id'] in project_ids and row['id'] not in existing_units
        ]
        Property.objects.bulk_create(units, batch_size=500)

        existing_ms = {str(i) for i in ConstructionMilestone.objects.values_list('id', flat=True)}
        milestones = [
            ConstructionMilestone(**row_to_kwargs(ConstructionMilestone, row, skip=('verified_by_id',)))
            for row in rows['milestones']
            if row['project_id'] in project_ids and row['id'] not in existing_ms
        ]
        ConstructionMilestone.objects.bulk_create(milestones, batch_size=500)

        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(dev_map)} developers, {len(projects)} projects, '
            f'{len(units)} units, {len(milestones)} milestones.'
        ))
        if logins:
            self.stdout.write(f'Builder logins (password "{builder_password}"):')
            for email in logins:
                self.stdout.write(f'  {email}')
