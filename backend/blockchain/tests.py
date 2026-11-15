from unittest import mock

from django.test import SimpleTestCase

from . import blockchain_service


class BlockchainApiCallTests(SimpleTestCase):
    def _response(self, payload):
        resp = mock.Mock()
        resp.json.return_value = payload
        resp.raise_for_status.return_value = None
        return resp

    def test_sends_api_key_and_timeout(self):
        service = blockchain_service.BlockchainService()
        with mock.patch.object(blockchain_service, 'BLOCKCHAIN_API_KEY', 'secret'), \
             mock.patch.object(blockchain_service.requests, 'request',
                               return_value=self._response({'success': True})) as req:
            result = service._call_blockchain_api('POST', '/property', {'propertyId': 'p1'})

        self.assertEqual(result, {'success': True})
        _, kwargs = req.call_args
        self.assertEqual(kwargs['headers'], {'X-API-Key': 'secret'})
        self.assertEqual(kwargs['json'], {'propertyId': 'p1'})
        self.assertIn('timeout', kwargs)

    def test_network_error_returns_failure_instead_of_raising(self):
        service = blockchain_service.BlockchainService()
        with mock.patch.object(blockchain_service.requests, 'request',
                               side_effect=blockchain_service.requests.ConnectionError('down')):
            result = service._call_blockchain_api('GET', '/history/x')
        self.assertFalse(result['success'])
