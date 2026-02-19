"""
Backend API Tests for ODDSIDE Game Night Features
Tests: Admin buy-in, cash-out, game management, chip tracking
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://glass-ui-refactor.preview.emergentagent.com')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1770401937136')
USER_ID = os.environ.get('TEST_USER_ID', 'test-user-1770401937136')
SESSION_TOKEN_2 = os.environ.get('TEST_SESSION_TOKEN_2', 'test_session_player2_1770402119637')
USER_ID_2 = os.environ.get('TEST_USER_ID_2', 'test-user-player2-1770402119637')
USER_EMAIL_2 = os.environ.get('TEST_USER_EMAIL_2', 'test.player2.1770402119637@example.com')


class TestGameNightCreation:
    """Test game night creation and management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def create_test_group(self):
        """Helper to create a test group"""
        payload = {
            "name": f"TEST_GameGroup_{int(time.time())}",
            "description": "Test group for game night testing",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        response = requests.post(
            f"{BASE_URL}/api/groups",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        return response.json()["group_id"]
    
    def test_create_game_night(self):
        """Test creating a new game night"""
        group_id = self.create_test_group()
        
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_Game_{int(time.time())}",
            "scheduled_at": "2026-02-01T20:00:00Z",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "game_id" in data
        assert data["status"] == "scheduled"
        print(f"SUCCESS: Created game night: {data['game_id']}")
    
    def test_get_game_details(self):
        """Test getting game details"""
        group_id = self.create_test_group()
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_Game_{int(time.time())}",
            "scheduled_at": "2026-02-01T20:00:00Z",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["game_id"] == game_id
        assert "status" in data
        assert "players" in data
        print(f"SUCCESS: Got game details for {game_id}")
    
    def test_start_game_requires_2_players(self):
        """Test that starting a game requires minimum 2 players"""
        group_id = self.create_test_group()
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_Game_{int(time.time())}",
            "scheduled_at": "2026-02-01T20:00:00Z",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/start",
            headers=self.headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "Minimum 2 players" in data.get("detail", "")
        print(f"SUCCESS: Game start correctly requires 2 players")


def add_player2_to_group(group_id, headers, headers_2):
    """Helper to add player 2 to a group via invite"""
    # Invite player 2 by email
    requests.post(
        f"{BASE_URL}/api/groups/{group_id}/invite",
        json={"email": USER_EMAIL_2},
        headers=headers
    )
    
    # Get and accept invite
    invites_response = requests.get(
        f"{BASE_URL}/api/users/invites",
        headers=headers_2
    )
    if invites_response.status_code == 200:
        invites = invites_response.json()
        for invite in invites:
            if invite.get("group_id") == group_id and invite.get("status") == "pending":
                requests.post(
                    f"{BASE_URL}/api/users/invites/{invite['invite_id']}/respond",
                    json={"accept": True},
                    headers=headers_2
                )
                return True
    return False


def create_active_game_with_2_players(headers, headers_2):
    """Helper to create and start a game with 2 players"""
    # Create group
    group_payload = {
        "name": f"TEST_Group_{int(time.time())}",
        "description": "Test group",
        "default_buy_in": 20,
        "chips_per_buy_in": 20
    }
    group_response = requests.post(
        f"{BASE_URL}/api/groups",
        json=group_payload,
        headers=headers
    )
    assert group_response.status_code == 200
    group_id = group_response.json()["group_id"]
    
    # Add player 2 to group
    add_player2_to_group(group_id, headers, headers_2)
    
    # Create game
    game_payload = {
        "group_id": group_id,
        "title": f"TEST_Game_{int(time.time())}",
        "scheduled_at": "2026-02-01T20:00:00Z",
        "buy_in_amount": 20,
        "chips_per_buy_in": 20
    }
    game_response = requests.post(
        f"{BASE_URL}/api/games",
        json=game_payload,
        headers=headers
    )
    assert game_response.status_code == 200
    game_id = game_response.json()["game_id"]
    
    # Player 2 joins game
    requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=headers_2)
    
    # Start game
    start_response = requests.post(
        f"{BASE_URL}/api/games/{game_id}/start",
        headers=headers
    )
    assert start_response.status_code == 200, f"Failed to start game: {start_response.json()}"
    
    return group_id, game_id


class TestAdminBuyIn:
    """Test admin buy-in endpoint - host-only buy-in feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_admin_buy_in_requires_auth(self):
        """Test admin buy-in requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/games/fake_game/admin-buy-in",
            json={"user_id": "test_user", "amount": 20}
        )
        assert response.status_code == 401
        print("SUCCESS: Admin buy-in requires authentication")
    
    def test_admin_buy_in_game_not_found(self):
        """Test admin buy-in with non-existent game"""
        response = requests.post(
            f"{BASE_URL}/api/games/nonexistent_game/admin-buy-in",
            json={"user_id": "test_user", "amount": 20},
            headers=self.headers
        )
        assert response.status_code == 404
        print("SUCCESS: Admin buy-in returns 404 for non-existent game")
    
    def test_admin_buy_in_for_host_player(self):
        """Test admin buy-in for the host player (self)"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Admin buy-in for self (host)
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID, "amount": 20},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["player_user_id"] == USER_ID
        assert data["total_buy_in"] == 20
        assert "chips_added" in data
        print(f"SUCCESS: Admin buy-in for host - chips added: {data['chips_added']}")
    
    def test_admin_buy_in_fixed_denominations(self):
        """Test admin buy-in with fixed denominations ($5, $10, $20, $50, $100)"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Test each fixed denomination
        denominations = [5, 10, 20, 50, 100]
        total_buy_in = 0
        
        for amount in denominations:
            response = requests.post(
                f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
                json={"user_id": USER_ID, "amount": amount},
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            total_buy_in += amount
            assert data["total_buy_in"] == total_buy_in
            print(f"SUCCESS: Admin buy-in ${amount} - total: ${total_buy_in}")
        
        print(f"SUCCESS: All fixed denominations ($5, $10, $20, $50, $100) work correctly")
    
    def test_admin_buy_in_player_not_in_game(self):
        """Test admin buy-in for player not in game"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": "nonexistent_player", "amount": 20},
            headers=self.headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Admin buy-in for non-player returns 400: {data['detail']}")
    
    def test_admin_buy_in_for_other_player(self):
        """Test admin buy-in for another player in the game"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Admin buy-in for player 2
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID_2, "amount": 50},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["player_user_id"] == USER_ID_2
        assert data["total_buy_in"] == 50
        print(f"SUCCESS: Admin buy-in for other player - chips added: {data['chips_added']}")


class TestCashOut:
    """Test cash-out with chip count feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_cash_out_requires_auth(self):
        """Test cash-out requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/games/fake_game/cash-out",
            json={"chips_returned": 20}
        )
        assert response.status_code == 401
        print("SUCCESS: Cash-out requires authentication")
    
    def test_cash_out_with_chip_count_profit(self):
        """Test cash-out with chip count input (profit scenario)"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Add buy-in first
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID, "amount": 20},
            headers=self.headers
        )
        
        # Cash out with 25 chips (profit scenario)
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/cash-out",
            json={"chips_returned": 25},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "cash_out_amount" in data or "cash_out" in data
        assert "net_result" in data
        # With 20 chips bought for $20 and returning 25 chips at $1/chip = $25 cash out
        # Net result = $25 - $20 = $5 profit
        assert data["net_result"] == 5.0
        print(f"SUCCESS: Cash-out with chips - net result: ${data['net_result']}")
    
    def test_cash_out_loss_scenario(self):
        """Test cash-out with loss (fewer chips returned)"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Add buy-in first
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID, "amount": 20},
            headers=self.headers
        )
        
        # Cash out with 10 chips (loss scenario)
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/cash-out",
            json={"chips_returned": 10},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # With 20 chips bought for $20 and returning 10 chips at $1/chip = $10 cash out
        # Net result = $10 - $20 = -$10 loss
        assert data["net_result"] == -10.0
        print(f"SUCCESS: Cash-out loss scenario - net result: ${data['net_result']}")


class TestGameThread:
    """Test game thread messaging"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_get_game_thread(self):
        """Test getting game thread messages"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        response = requests.get(
            f"{BASE_URL}/api/games/{game_id}/thread",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the "Game started!" system message
        assert len(data) >= 1
        print(f"SUCCESS: Got game thread with {len(data)} messages")
    
    def test_post_message_to_thread(self):
        """Test posting a message to game thread"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/thread",
            json={"content": "Test message from automated testing"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        print(f"SUCCESS: Posted message to thread: {data['message_id']}")


class TestTransactionHistory:
    """Test transaction history per player"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_transaction_history_in_game_details(self):
        """Test that game details include transaction history per player"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Add multiple buy-ins
        for amount in [20, 10, 50]:
            requests.post(
                f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
                json={"user_id": USER_ID, "amount": amount},
                headers=self.headers
            )
        
        # Get game details and check transaction history
        response = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find current player
        current_player = None
        for player in data.get("players", []):
            if player.get("user_id") == USER_ID:
                current_player = player
                break
        
        assert current_player is not None, "Current player not found in game"
        
        # Verify total buy-in is sum of all buy-ins
        expected_total = 20 + 10 + 50  # 80
        assert current_player.get("total_buy_in") == expected_total
        
        # Check if transactions are included
        if "transactions" in current_player:
            assert len(current_player["transactions"]) >= 3
            print(f"SUCCESS: Transaction history verified - {len(current_player['transactions'])} transactions, total buy-in: ${expected_total}")
        else:
            print(f"SUCCESS: Total buy-in verified: ${expected_total}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
