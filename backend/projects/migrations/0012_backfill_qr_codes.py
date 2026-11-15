"""
Give every unit and milestone a QR code.

Property/ConstructionMilestone.save() only generated QR codes when `self.pk is None`, which never
happens with UUID primary keys, so most rows (and all seeded/imported ones) were left without one.
This fills the gaps using the same format the model now uses; existing codes are left untouched.
"""
import hashlib
import uuid

from django.db import migrations


def backfill(apps, schema_editor):
    Property = apps.get_model('projects', 'Property')
    Milestone = apps.get_model('projects', 'ConstructionMilestone')

    units = list(Property.objects.filter(qr_code_data__isnull=True).only('id', 'project_id', 'unit_number'))
    units += list(Property.objects.filter(qr_code_data='').only('id', 'project_id', 'unit_number'))
    for unit in units:
        unit.qr_code_data = f"property:{unit.project_id}:{unit.id}:{uuid.uuid4().hex[:8]}"
        unit.qr_code_secret = hashlib.sha256(
            f"{unit.id}:{unit.project_id}:{unit.unit_number}:{uuid.uuid4().hex}".encode()).hexdigest()
    Property.objects.bulk_update(units, ['qr_code_data', 'qr_code_secret'], batch_size=500)

    milestones = list(Milestone.objects.filter(qr_code_data__isnull=True).only('id', 'project_id', 'title'))
    milestones += list(Milestone.objects.filter(qr_code_data='').only('id', 'project_id', 'title'))
    for m in milestones:
        m.qr_code_data = f"milestone:{m.project_id}:{m.id}:{uuid.uuid4().hex[:8]}"
        m.qr_code_secret = hashlib.sha256(
            f"{m.id}:{m.project_id}:{m.title}:{uuid.uuid4().hex}".encode()).hexdigest()
    Milestone.objects.bulk_update(milestones, ['qr_code_data', 'qr_code_secret'], batch_size=500)


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0011_add_booking_model'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
