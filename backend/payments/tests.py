import hashlib
import hmac
import json
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from . import razorpay_service as rz_module
from .models import Payment

User = get_user_model()

KEY_SECRET = 'test_key_secret'
WEBHOOK_SECRET = 'test_webhook_secret'


def _sign(secret, message):
    if isinstance(message, str):
        message = message.encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


@override_settings(
    RAZORPAY_KEY_ID='rzp_test_key',
    RAZORPAY_KEY_SECRET=KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET=WEBHOOK_SECRET,
)
class RazorpayTestCase(TestCase):
    def setUp(self):
        # The service is a module-level singleton; rebuild it with test settings
        rz_module._razorpay_service = None
        self.user = User.objects.create_user(
            email='buyer@example.com', username='buyer', password='pass12345',
            first_name='Test', last_name='Buyer',
        )
        self.payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('1000.00'),
            payment_method='razorpay',
            gateway_order_id='order_ABC',
        )
        self.client = APIClient()

    def tearDown(self):
        rz_module._razorpay_service = None


class WebhookTests(RazorpayTestCase):
    url = '/api/payments/webhooks/razorpay/'

    def _post(self, event):
        body = json.dumps(event)
        return self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE=_sign(WEBHOOK_SECRET, body),
        )

    def _payment_event(self, name, **entity):
        return {'event': name, 'payload': {'payment': {'entity': entity}}}

    def test_captured_matches_by_order_id_and_completes(self):
        resp = self._post(self._payment_event(
            'payment.captured', id='pay_123', order_id='order_ABC', status='captured'))
        self.assertEqual(resp.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'completed')
        self.assertEqual(self.payment.gateway_payment_id, 'pay_123')
        self.assertTrue(self.payment.webhook_received)

    def test_authorized_sets_processing_not_completed(self):
        self._post(self._payment_event(
            'payment.authorized', id='pay_123', order_id='order_ABC'))
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'processing')

    def test_failed_records_reason(self):
        self._post(self._payment_event(
            'payment.failed', id='pay_123', order_id='order_ABC',
            error_code='BAD_REQUEST_ERROR', error_description='Card declined'))
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')
        self.assertEqual(self.payment.failure_reason, 'Card declined')

    def test_bad_signature_rejected(self):
        body = json.dumps(self._payment_event('payment.captured', id='pay_1', order_id='order_ABC'))
        resp = self.client.post(self.url, data=body, content_type='application/json',
                                HTTP_X_RAZORPAY_SIGNATURE='nope')
        self.assertEqual(resp.status_code, 400)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')

    def test_unknown_payment_returns_404(self):
        resp = self._post(self._payment_event(
            'payment.captured', id='pay_x', order_id='order_unknown'))
        self.assertEqual(resp.status_code, 404)


class VerifyTests(RazorpayTestCase):
    def _url(self):
        return f'/api/payments/payments/{self.payment.id}/verify/'

    def test_forged_signature_rejected(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(self._url(), {
            'razorpay_order_id': 'order_ABC',
            'razorpay_payment_id': 'pay_123',
            'razorpay_signature': 'forged',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')
        self.assertIsNone(self.payment.gateway_payment_id)

    def test_mismatched_order_rejected(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(self._url(), {
            'razorpay_order_id': 'order_OTHER',
            'razorpay_payment_id': 'pay_123',
            'razorpay_signature': _sign(KEY_SECRET, 'order_OTHER|pay_123'),
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_valid_signature_completes_payment(self):
        self.client.force_authenticate(self.user)
        with mock.patch.object(rz_module.RazorpayService, 'fetch_payment',
                               return_value={'id': 'pay_123', 'status': 'captured'}):
            resp = self.client.post(self._url(), {
                'razorpay_order_id': 'order_ABC',
                'razorpay_payment_id': 'pay_123',
                'razorpay_signature': _sign(KEY_SECRET, 'order_ABC|pay_123'),
            }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'completed')

    @override_settings(RAZORPAY_KEY_ID=None, RAZORPAY_KEY_SECRET=None)
    def test_gateway_not_configured_returns_503(self):
        rz_module._razorpay_service = None
        self.client.force_authenticate(self.user)
        resp = self.client.post(self._url(), {
            'razorpay_order_id': 'order_ABC',
            'razorpay_payment_id': 'pay_123',
            'razorpay_signature': 'x',
        }, format='json')
        self.assertEqual(resp.status_code, 503)


@override_settings(RAZORPAY_KEY_ID=None, RAZORPAY_KEY_SECRET=None, PAYMENTS_TEST_MODE=True)
class TestModePaymentTests(TestCase):
    def setUp(self):
        rz_module._razorpay_service = None
        self.user = User.objects.create_user(
            email='payer@example.com', username='payer', password='pass12345', first_name='P', last_name='U')
        self.other = User.objects.create_user(
            email='other@example.com', username='other', password='pass12345', first_name='O', last_name='U')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def tearDown(self):
        rz_module._razorpay_service = None

    def _create(self):
        return self.client.post('/api/payments/payments/', {
            'amount': '50000', 'payment_method': 'razorpay', 'payment_type': 'booking_token'}, format='json')

    def test_config_reports_test_mode(self):
        self.assertEqual(self.client.get('/api/payments/payments/config/').data['mode'], 'test')

    def test_create_and_simulate_success(self):
        resp = self._create()
        self.assertEqual(resp.status_code, 201, resp.content)
        payment = Payment.objects.get()
        self.assertEqual(payment.gateway, 'test')
        resp = self.client.post(f'/api/payments/payments/{payment.id}/simulate/', {'outcome': 'success'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'completed')

    def test_cannot_simulate_someone_elses_payment(self):
        self._create()
        payment = Payment.objects.get()
        self.client.force_authenticate(self.other)
        resp = self.client.post(f'/api/payments/payments/{payment.id}/simulate/', format='json')
        self.assertIn(resp.status_code, (403, 404))

    @override_settings(PAYMENTS_TEST_MODE=False)
    def test_without_gateway_or_test_mode_nothing_is_created(self):
        resp = self._create()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)
