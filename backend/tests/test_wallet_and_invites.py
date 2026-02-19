"""
Test file for Wallet endpoints and Group Invite functionality.
Tests the following features:
- Wallet: GET /api/wallet, POST /api/wallet/setup, POST /api/wallet/pin/set, 
  POST /api/wallet/transfer, GET /api/wallet/transactions, GET /api/wallet/search
- Group Invites: GET /api/users/invites, POST /api/users/invites/{id}/respond
- Notifications: GET /api/notifications
"""

import pytest
import requests
import os
import uuid

# Get the backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable is not set")

print(f"Testing against: {BASE_URL}")


class TestWalletEndpoints:
    """Test wallet-related API endpoints."""
    
    def test_wallet_endpoint_exists_returns_401_unauthenticated(self):
        """GET /api/wallet should return 401 when not authenticated (NOT 404)."""
        response = requests.get(f"{BASE_URL}/api/wallet")
        # Should be 401 (not authenticated) not 404 (endpoint doesn't exist)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/wallet returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_setup_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/wallet/setup should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/wallet/setup", json={})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/wallet/setup returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_pin_set_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/wallet/pin/set should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/wallet/pin/set", json={"pin": "1234"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/wallet/pin/set returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_transfer_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/wallet/transfer should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/wallet/transfer", json={
            "to_wallet_id": "KVT-TEST123",
            "amount_cents": 100,
            "pin": "1234",
            "idempotency_key": str(uuid.uuid4())
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/wallet/transfer returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_transactions_endpoint_exists_returns_401_unauthenticated(self):
        """GET /api/wallet/transactions should return 401 when not authenticated."""
        response = requests.get(f"{BASE_URL}/api/wallet/transactions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/wallet/transactions returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_search_endpoint_exists_returns_401_unauthenticated(self):
        """GET /api/wallet/search should return 401 when not authenticated."""
        response = requests.get(f"{BASE_URL}/api/wallet/search?q=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/wallet/search returns 401 (endpoint exists, requires auth)")


class TestGroupInviteEndpoints:
    """Test group invite-related API endpoints."""
    
    def test_users_invites_endpoint_exists_returns_401_unauthenticated(self):
        """GET /api/users/invites should return 401 when not authenticated."""
        response = requests.get(f"{BASE_URL}/api/users/invites")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/users/invites returns 401 (endpoint exists, requires auth)")
    
    def test_users_invites_respond_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/users/invites/{id}/respond should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/users/invites/fake_invite_id/respond", json={"accept": True})
        # Should be 401 (not authenticated) not 404/405
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/users/invites/{id}/respond returns 401 (endpoint exists, requires auth)")


class TestNotificationsEndpoints:
    """Test notification-related API endpoints."""
    
    def test_notifications_endpoint_exists_returns_401_unauthenticated(self):
        """GET /api/notifications should return 401 when not authenticated."""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/notifications returns 401 (endpoint exists, requires auth)")


class TestOtherWalletEndpoints:
    """Test additional wallet endpoints."""
    
    def test_wallet_pin_change_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/wallet/pin/change should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/wallet/pin/change", json={
            "current_pin": "1234",
            "new_pin": "5678"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/wallet/pin/change returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_pin_verify_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/wallet/pin/verify should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/wallet/pin/verify", json={"pin": "1234"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/wallet/pin/verify returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_lookup_endpoint_exists_returns_401_unauthenticated(self):
        """GET /api/wallet/lookup/{wallet_id} should return 401 when not authenticated."""
        response = requests.get(f"{BASE_URL}/api/wallet/lookup/KVT-TEST123")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/wallet/lookup/{wallet_id} returns 401 (endpoint exists, requires auth)")
    
    def test_wallet_deposit_endpoint_exists_returns_401_unauthenticated(self):
        """POST /api/wallet/deposit should return 401 when not authenticated."""
        response = requests.post(f"{BASE_URL}/api/wallet/deposit", json={
            "amount_cents": 1000,
            "origin_url": "https://test.com"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/wallet/deposit returns 401 (endpoint exists, requires auth)")


class TestHealthAndBasicEndpoints:
    """Test basic health and unauthenticated endpoints."""
    
    def test_api_health(self):
        """Test API health endpoint."""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health could be 200 or may not exist
        if response.status_code == 200:
            print("✅ GET /api/health returns 200")
        elif response.status_code == 404:
            print("⚠️ GET /api/health returns 404 (endpoint may not exist)")
        else:
            print(f"ℹ️ GET /api/health returns {response.status_code}")
    
    def test_auth_me_returns_401_unauthenticated(self):
        """Test that /api/auth/me requires authentication."""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ GET /api/auth/me returns 401 (requires auth)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
