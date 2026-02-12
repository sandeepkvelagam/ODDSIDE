"""
Backend API Tests for ODDSIDE Social Features
Tests: User search, invites, badges, group invites
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pokerpal-voice.preview.emergentagent.com')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1770400891447')
USER_ID = os.environ.get('TEST_USER_ID', 'test-user-1770400891447')


class TestHealthAndBasicEndpoints:
    """Test basic API health and root endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: API root returns: {data['message']}")
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("SUCCESS: API is healthy")


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me with valid session token"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        print(f"SUCCESS: Auth returns user: {data.get('name', data.get('email'))}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("SUCCESS: Unauthenticated request returns 401")


class TestUserSearch:
    """Test user search API endpoint"""
    
    def test_user_search_requires_auth(self):
        """Test /api/users/search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/users/search?query=test")
        assert response.status_code == 401
        print("SUCCESS: User search requires authentication")
    
    def test_user_search_with_valid_query(self):
        """Test /api/users/search with valid query"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/users/search?query=test", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: User search returned {len(data)} results")
    
    def test_user_search_short_query(self):
        """Test /api/users/search with query < 2 chars returns empty"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/users/search?query=a", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data == []
        print("SUCCESS: Short query returns empty list")


class TestUserInvites:
    """Test user invites API endpoint"""
    
    def test_get_invites_requires_auth(self):
        """Test /api/users/invites requires authentication"""
        response = requests.get(f"{BASE_URL}/api/users/invites")
        assert response.status_code == 401
        print("SUCCESS: Get invites requires authentication")
    
    def test_get_invites_with_auth(self):
        """Test /api/users/invites returns list of invites"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/users/invites", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Get invites returned {len(data)} invites")


class TestUserBadges:
    """Test user badges API endpoint"""
    
    def test_get_badges_requires_auth(self):
        """Test /api/users/me/badges requires authentication"""
        response = requests.get(f"{BASE_URL}/api/users/me/badges")
        assert response.status_code == 401
        print("SUCCESS: Get badges requires authentication")
    
    def test_get_badges_with_auth(self):
        """Test /api/users/me/badges returns badge data"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/users/me/badges", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "level" in data
        assert "stats" in data
        assert "badges" in data
        
        # Verify level structure
        assert "name" in data["level"]
        assert "icon" in data["level"]
        
        # Verify stats structure
        assert "total_games" in data["stats"]
        assert "total_profit" in data["stats"]
        assert "wins" in data["stats"]
        assert "win_rate" in data["stats"]
        
        print(f"SUCCESS: Get badges returned level: {data['level']['name']}, badges: {len(data['badges'])}")


class TestGroupManagement:
    """Test group management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.created_group_id = None
    
    def test_create_group(self):
        """Test creating a new group"""
        payload = {
            "name": f"TEST_Group_{int(time.time())}",
            "description": "Test group for automated testing",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        response = requests.post(
            f"{BASE_URL}/api/groups",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "group_id" in data
        assert data["name"] == payload["name"]
        self.created_group_id = data["group_id"]
        print(f"SUCCESS: Created group: {data['group_id']}")
        return data["group_id"]
    
    def test_get_groups(self):
        """Test getting user's groups"""
        response = requests.get(f"{BASE_URL}/api/groups", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Get groups returned {len(data)} groups")
    
    def test_get_group_details(self):
        """Test getting group details"""
        # First create a group
        group_id = self.test_create_group()
        
        response = requests.get(f"{BASE_URL}/api/groups/{group_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["group_id"] == group_id
        assert "members" in data
        print(f"SUCCESS: Get group details for {group_id}")


class TestGroupInvites:
    """Test group invite functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    def test_invite_member_requires_auth(self):
        """Test inviting member requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/groups/fake_group/invite",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 401
        print("SUCCESS: Invite member requires authentication")
    
    def test_invite_member_to_nonexistent_group(self):
        """Test inviting to non-existent group returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/groups/nonexistent_group/invite",
            json={"email": "test@example.com"},
            headers=self.headers
        )
        assert response.status_code == 403
        print("SUCCESS: Invite to non-existent group returns 403")
    
    def test_invite_member_flow(self):
        """Test full invite member flow"""
        # Create a group first
        group_payload = {
            "name": f"TEST_InviteGroup_{int(time.time())}",
            "description": "Test group for invite testing",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        assert group_response.status_code == 200
        group_id = group_response.json()["group_id"]
        
        # Invite a non-registered user
        invite_response = requests.post(
            f"{BASE_URL}/api/groups/{group_id}/invite",
            json={"email": f"newuser_{int(time.time())}@example.com"},
            headers=self.headers
        )
        assert invite_response.status_code == 200
        data = invite_response.json()
        assert "message" in data
        assert "status" in data
        print(f"SUCCESS: Invite sent, status: {data['status']}")


class TestStats:
    """Test stats endpoints"""
    
    def test_get_my_stats(self):
        """Test /api/stats/me returns user stats"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/stats/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_games" in data
        assert "net_profit" in data
        print(f"SUCCESS: Stats returned - games: {data['total_games']}, profit: {data['net_profit']}")


class TestNotifications:
    """Test notifications endpoints"""
    
    def test_get_notifications(self):
        """Test /api/notifications returns notifications list"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Notifications returned {len(data)} items")


class TestLedger:
    """Test ledger endpoints"""
    
    def test_get_balances(self):
        """Test /api/ledger/balances returns balance data"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/ledger/balances", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "net_balance" in data
        assert "total_owes" in data
        assert "total_owed" in data
        print(f"SUCCESS: Balances returned - net: {data['net_balance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
