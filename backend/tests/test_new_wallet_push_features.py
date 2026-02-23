"""
Backend API Tests for Iteration 8: New Wallet + Push Notification Features
Tests: withdraw, withdrawals, push-token endpoints + code structure verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    BASE_URL = "https://mobile-ui-revamp-7.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip('/')


class TestNewWalletEndpoints:
    """Test new wallet endpoints (withdraw, withdrawals)"""
    
    def test_withdraw_endpoint_requires_auth(self):
        """POST /api/wallet/withdraw should return 401 without auth (not 404)"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/withdraw",
            json={
                "amount_cents": 5000,
                "method": "bank_transfer",
                "destination_details": "test@example.com",
                "pin": "1234"
            }
        )
        # Should be 401 (endpoint exists, requires auth), NOT 404
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_withdrawals_list_endpoint_requires_auth(self):
        """GET /api/wallet/withdrawals should return 401 without auth (not 404)"""
        response = requests.get(f"{BASE_URL}/api/wallet/withdrawals")
        # Should be 401 (endpoint exists, requires auth), NOT 404
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"


class TestPushTokenEndpoints:
    """Test push notification token endpoints"""
    
    def test_register_push_token_requires_auth(self):
        """POST /api/users/push-token should return 401 without auth (not 404)"""
        response = requests.post(
            f"{BASE_URL}/api/users/push-token",
            json={"expo_push_token": "ExponentPushToken[test123]"}
        )
        # Should be 401 (endpoint exists, requires auth), NOT 404
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_unregister_push_token_requires_auth(self):
        """DELETE /api/users/push-token should return 401 without auth (not 404)"""
        response = requests.delete(f"{BASE_URL}/api/users/push-token")
        # Should be 401 (endpoint exists, requires auth), NOT 404
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"


class TestExistingWalletDeposit:
    """Verify existing deposit endpoints still work"""
    
    def test_deposit_endpoint_requires_auth(self):
        """POST /api/wallet/deposit should return 401 without auth (not 404)"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            json={"amount_cents": 5000, "origin_url": "kvitt://wallet"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_deposit_status_endpoint_requires_auth(self):
        """GET /api/wallet/deposit/status/:id should return 401 without auth (not 404)"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit/status/test_session_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
