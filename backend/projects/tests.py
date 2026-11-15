"""Access-control tests: builders own their projects, buyers see only their own units' private data."""
import datetime
import shutil
import tempfile
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from blockchain.models import BlockchainDocument
from .models import ConstructionMilestone, ConstructionUpdate, Developer, Project, Property

User = get_user_model()


def make_user(email, role='buyer', **extra):
    return User.objects.create_user(
        email=email, username=email.split('@')[0], password='pass12345',
        first_name='T', last_name='U', role=role, **extra,
    )


def make_project(developer, name):
    return Project.objects.create(
        developer=developer, name=name, slug=name.lower().replace(' ', '-'), description='d',
        address='a', city='Mumbai', state='MH', pincode='400001', starting_price=Decimal('5000000'),
    )


def make_unit(project, number, buyer=None):
    return Property.objects.create(
        project=project, unit_number=number, property_type='2bhk', carpet_area=Decimal('800'),
        price=Decimal('6000000'), status='sold' if buyer else 'available', buyer=buyer,
    )


class AccessTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.builder = make_user('builder@example.com', role='builder')
        self.other_builder = make_user('other@example.com', role='builder')
        self.buyer = make_user('buyer@example.com')
        self.stranger = make_user('stranger@example.com')
        self.admin = make_user('admin@example.com', is_staff=True)

        # Builder accounts get a developer profile automatically (projects/signals.py)
        self.dev = Developer.objects.get(user=self.builder)
        self.other_dev = Developer.objects.get(user=self.other_builder)
        self.project = make_project(self.dev, 'Sea View')
        self.other_project = make_project(self.other_dev, 'Hill Top')
        self.sold_unit = make_unit(self.project, 'A-101', buyer=self.buyer)
        self.free_unit = make_unit(self.project, 'A-102')
        self.milestone = ConstructionMilestone.objects.create(
            project=self.project, title='Foundation', phase_number=1, target_date=datetime.date(2030, 1, 1),
        )

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client


class ProjectWriteTests(AccessTestBase):
    def test_buyer_cannot_edit_or_delete_project(self):
        c = self.as_user(self.buyer)
        self.assertEqual(c.patch(f'/api/projects/projects/{self.project.id}/', {'name': 'x'}).status_code, 403)
        self.assertEqual(c.delete(f'/api/projects/projects/{self.project.id}/').status_code, 403)

    def test_other_builder_cannot_edit_project(self):
        c = self.as_user(self.other_builder)
        self.assertEqual(c.patch(f'/api/projects/projects/{self.project.id}/', {'name': 'x'}).status_code, 403)

    def test_owner_builder_can_edit_project(self):
        c = self.as_user(self.builder)
        resp = c.patch(f'/api/projects/projects/{self.project.id}/', {'name': 'Sea View II'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)

    def test_anonymous_cannot_delete_available_unit(self):
        resp = APIClient().delete(f'/api/projects/properties/{self.free_unit.id}/')
        self.assertIn(resp.status_code, (401, 403))
        self.assertTrue(Property.objects.filter(id=self.free_unit.id).exists())

    def test_buyer_cannot_edit_own_unit_price(self):
        c = self.as_user(self.buyer)
        self.assertEqual(c.patch(f'/api/projects/properties/{self.sold_unit.id}/', {'price': '1'}).status_code, 403)

    def test_only_admin_verifies_milestones(self):
        url = f'/api/projects/milestones/{self.milestone.id}/verify/'
        self.assertEqual(self.as_user(self.builder).post(url).status_code, 403)
        self.assertEqual(self.as_user(self.admin).post(url).status_code, 200)

    def test_other_builder_cannot_edit_milestone(self):
        c = self.as_user(self.other_builder)
        resp = c.patch(f'/api/projects/milestones/{self.milestone.id}/', {'title': 'x'}, format='json')
        self.assertEqual(resp.status_code, 403)


class UnitPrivacyTests(AccessTestBase):
    def _unit(self, user, unit):
        c = self.as_user(user) if user else APIClient()
        return c.get(f'/api/projects/properties/{unit.id}/')

    def test_buyer_sees_own_unit_qr_and_photos(self):
        resp = self._unit(self.buyer, self.sold_unit)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['viewer_access'], 'owner')
        self.assertTrue(resp.data['qr_code_data'])

    def test_stranger_cannot_open_sold_unit(self):
        self.assertEqual(self._unit(self.stranger, self.sold_unit).status_code, 403)

    def test_builder_sees_qr_for_own_units_only(self):
        resp = self._unit(self.builder, self.free_unit)
        self.assertEqual(resp.data['viewer_access'], 'manager')
        self.assertTrue(resp.data['qr_code_data'])
        resp = self._unit(self.other_builder, self.free_unit)
        self.assertEqual(resp.data['viewer_access'], 'public')
        self.assertIsNone(resp.data['qr_code_data'])

    def test_public_project_page_hides_buyers_and_qr_codes(self):
        resp = APIClient().get(f'/api/projects/projects/{self.project.id}/')
        self.assertEqual(resp.status_code, 200)
        for unit in resp.data['properties']:
            self.assertIsNone(unit['buyer'])
            self.assertIsNone(unit['qr_code_data'])
        for m in resp.data['milestones']:
            self.assertIsNone(m['qr_code_data'])

    def test_property_list_redacts_private_fields(self):
        resp = self.as_user(self.stranger).get('/api/projects/properties/', {'project': self.project.id})
        units = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        sold = next(u for u in units if u['id'] == str(self.sold_unit.id))
        self.assertIsNone(sold['buyer'])
        self.assertIsNone(sold['qr_code_data'])

    def test_unit_progress_only_for_buyer_and_builder(self):
        url = f'/api/projects/properties/{self.sold_unit.id}/progress/'
        self.assertEqual(self.as_user(self.buyer).get(url).status_code, 200)
        self.assertEqual(self.as_user(self.builder).get(url).status_code, 200)
        self.assertEqual(self.as_user(self.stranger).get(url).status_code, 403)


class ConstructionUpdateVisibilityTests(AccessTestBase):
    def setUp(self):
        super().setUp()
        common = dict(project=self.project, created_by=self.builder, description='d',
                      update_date=datetime.date(2030, 1, 1))
        self.public = ConstructionUpdate.objects.create(title='public', **common)
        self.private = ConstructionUpdate.objects.create(
            title='private', update_type='property_specific', property_unit_number='A-101',
            visible_to_owner_only=True, **common)

    def titles(self, user):
        resp = self.as_user(user).get('/api/projects/construction-updates/')
        rows = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        return {r['title'] for r in rows}

    def test_owner_sees_private_update(self):
        self.assertEqual(self.titles(self.buyer), {'public', 'private'})

    def test_saving_a_project_does_not_unlock_private_updates(self):
        self.stranger.saved_projects = [str(self.project.id)]
        self.stranger.save()
        self.assertEqual(self.titles(self.stranger), {'public'})

    def test_other_builder_cannot_post_to_project(self):
        resp = self.as_user(self.other_builder).post('/api/projects/construction-updates/', {
            'project': str(self.project.id), 'title': 't', 'description': 'd', 'update_date': '2030-01-01',
        }, format='json')
        self.assertEqual(resp.status_code, 403)


@override_settings(CLOUDINARY_CLOUD_NAME=None, PINATA_API_KEY=None)
class BlockchainDocumentAccessTests(AccessTestBase):
    def setUp(self):
        super().setUp()
        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        import blockchain.ipfs_service as ipfs
        ipfs._pinata_service = None

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media, ignore_errors=True)

    def upload(self, user, project, unit=None):
        data = {'project_id': str(project.id), 'document_name': 'agreement.pdf',
                'file': SimpleUploadedFile('agreement.pdf', b'%PDF-1.4 test', content_type='application/pdf')}
        if unit:
            data['property_id'] = str(unit.id)
        return self.as_user(user).post('/api/blockchain/documents/upload_document/', data, format='multipart')

    def test_owner_builder_uploads_locally_without_pinata_or_fabric(self):
        resp = self.upload(self.builder, self.project, self.sold_unit)
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertFalse(resp.data['on_chain'])  # no Fabric network in tests
        self.assertEqual(BlockchainDocument.objects.count(), 1)  # no duplicate record

    def test_other_builder_cannot_upload(self):
        self.assertEqual(self.upload(self.other_builder, self.project).status_code, 403)
        self.assertEqual(self.upload(self.buyer, self.project).status_code, 403)

    def test_unit_documents_visible_to_buyer_and_builder_only(self):
        self.upload(self.builder, self.project, self.sold_unit)
        url = '/api/blockchain/documents/'

        def count(user):
            resp = self.as_user(user).get(url)
            rows = resp.data['results'] if isinstance(resp.data, dict) else resp.data
            return len(rows)

        self.assertEqual(count(self.buyer), 1)
        self.assertEqual(count(self.builder), 1)
        self.assertEqual(count(self.admin), 1)
        self.assertEqual(count(self.stranger), 0)
        self.assertEqual(count(self.other_builder), 0)

    def test_records_cannot_be_edited_or_deleted(self):
        self.upload(self.builder, self.project, self.sold_unit)
        doc = BlockchainDocument.objects.get()
        c = self.as_user(self.builder)
        self.assertEqual(c.delete(f'/api/blockchain/documents/{doc.id}/').status_code, 405)


class BookingLifecycleTests(AccessTestBase):
    def book(self, user, unit):
        return self.as_user(user).post('/api/projects/bookings/', {
            'property_id': str(unit.id), 'terms_accepted': True, 'payment_method': 'online'}, format='json')

    def test_booking_reserves_unit_for_buyer(self):
        resp = self.book(self.stranger, self.free_unit)
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertIn('id', resp.data)
        self.assertEqual(resp.data['viewer_role'], 'buyer')
        self.free_unit.refresh_from_db()
        self.assertEqual(self.free_unit.status, 'booked')
        self.assertEqual(self.free_unit.buyer, self.stranger)
        # ...so the buyer can now see the unit's private side
        unit = self.as_user(self.stranger).get(f'/api/projects/properties/{self.free_unit.id}/').data
        self.assertEqual(unit['viewer_access'], 'owner')
        self.assertTrue(unit['qr_code_data'])

    def test_cannot_double_book(self):
        self.assertEqual(self.book(self.stranger, self.free_unit).status_code, 201)
        resp = self.book(self.buyer, self.free_unit)
        self.assertEqual(resp.status_code, 400)

    def test_builder_cannot_book_own_unit(self):
        self.assertEqual(self.book(self.builder, self.free_unit).status_code, 400)

    def test_buyer_cannot_edit_booking_or_record_payment(self):
        booking_id = self.book(self.stranger, self.free_unit).data['id']
        c = self.as_user(self.stranger)
        resp = c.patch(f'/api/projects/bookings/{booking_id}/', {'status': 'completed'}, format='json')
        self.assertEqual(resp.status_code, 405)
        resp = c.post(f'/api/projects/bookings/{booking_id}/update_payment/', {'amount_paid': '99999999'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_builder_records_full_payment_and_unit_is_sold(self):
        booking_id = self.book(self.stranger, self.free_unit).data['id']
        resp = self.as_user(self.builder).post(
            f'/api/projects/bookings/{booking_id}/update_payment/',
            {'amount_paid': str(self.free_unit.price), 'payment_method': 'bank_transfer'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.free_unit.refresh_from_db()
        self.assertEqual(self.free_unit.status, 'sold')
        self.assertEqual(self.free_unit.buyer, self.stranger)

    def test_cancel_releases_unit(self):
        booking_id = self.book(self.stranger, self.free_unit).data['id']
        resp = self.as_user(self.stranger).post(f'/api/projects/bookings/{booking_id}/cancel/', {}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.free_unit.refresh_from_db()
        self.assertEqual(self.free_unit.status, 'available')
        self.assertIsNone(self.free_unit.buyer)


@override_settings(CLOUDINARY_CLOUD_NAME=None)
class CaptureVerificationTests(AccessTestBase):
    """QR site uploads must prove they were shot on site, just now."""
    MOBILE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36'

    def setUp(self):
        super().setUp()
        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.free_unit.refresh_from_db()

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media, ignore_errors=True)

    def _jpeg(self, exif_taken=None):
        import io
        from PIL import Image
        img = Image.new('RGB', (32, 24), (40, 140, 120))
        buf = io.BytesIO()
        if exif_taken:
            exif = Image.Exif()
            # DateTimeOriginal + OffsetTimeOriginal, as a phone camera writes them
            exif[0x8769] = {0x9003: exif_taken.strftime('%Y:%m:%d %H:%M:%S'), 0x9011: '+00:00'}
            img.save(buf, 'JPEG', exif=exif.tobytes())
        else:
            img.save(buf, 'JPEG')
        return SimpleUploadedFile('site.jpg', buf.getvalue(), content_type='image/jpeg')

    def upload(self, *, location=True, age_minutes=1, exif_taken=None):
        import json as _json
        from django.utils import timezone as tz
        captured = tz.now() - datetime.timedelta(minutes=age_minutes)
        meta = {'camera_captured': True, 'tz_offset_minutes': 0,
                'files': [{'name': 'site.jpg', 'last_modified': captured.isoformat()}]}
        if location:
            meta['location'] = {'latitude': 19.07, 'longitude': 72.87, 'accuracy': 8}
        return self.as_user(self.builder).post(
            f'/api/projects/properties/{self.free_unit.id}/secure_upload/',
            {'upload_token': self.free_unit.qr_code_secret[:32], 'description': 'Slab',
             'capture_metadata': _json.dumps(meta), 'device_info': _json.dumps({'is_mobile': True}),
             'images': self._jpeg(exif_taken)},
            format='multipart', HTTP_USER_AGENT=self.MOBILE)

    def test_fresh_geotagged_photo_is_accepted_and_audited(self):
        resp = self.upload()
        self.assertEqual(resp.status_code, 200, resp.content)
        self.free_unit.refresh_from_db()
        verification = self.free_unit.unit_photos[-1]['capture_metadata']['verification']
        self.assertEqual(verification['location']['latitude'], 19.07)
        self.assertEqual(len(verification['files']), 1)

    def test_upload_without_location_is_rejected(self):
        resp = self.upload(location=False)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['error_code'], 'LOCATION_REQUIRED')

    def test_old_photo_is_rejected(self):
        resp = self.upload(age_minutes=60 * 24)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['error_code'], 'STALE_CAPTURE')

    def test_old_camera_exif_date_is_rejected_even_if_file_time_is_fresh(self):
        from django.utils import timezone as tz
        resp = self.upload(exif_taken=tz.now() - datetime.timedelta(days=30))
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['error_code'], 'STALE_CAPTURE')

    def test_geofence_rejects_far_away_uploads(self):
        self.project.latitude, self.project.longitude = Decimal('28.6139'), Decimal('77.2090')  # Delhi
        self.project.save()
        with override_settings(UPLOAD_GEOFENCE_KM=2):
            resp = self.upload()  # the fix is in Mumbai
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['error_code'], 'OUTSIDE_GEOFENCE')


class BuilderOnboardingTests(TestCase):
    def test_new_builder_can_create_a_project(self):
        client = APIClient()
        resp = client.post('/api/auth/register/', {
            'username': 'newbuilder', 'email': 'nb@example.com', 'password': 'Str0ng-pass!',
            'password2': 'Str0ng-pass!', 'first_name': 'Nia', 'last_name': 'Rao', 'role': 'builder',
        }, format='json')
        self.assertIn(resp.status_code, (200, 201), resp.content)
        user = User.objects.get(email='nb@example.com')
        self.assertTrue(Developer.objects.filter(user=user).exists())

        client.force_authenticate(user)
        resp = client.post('/api/projects/projects/', {
            'name': 'Nia Heights', 'slug': 'nia-heights', 'description': 'd', 'address': 'a',
            'city': 'Pune', 'state': 'MH', 'pincode': '411001', 'starting_price': '5000000',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)

    def test_switching_to_builder_creates_profile(self):
        user = make_user('switch@example.com')
        user.role = 'builder'
        user.save()
        self.assertTrue(Developer.objects.filter(user=user).exists())
