"""
Backend API Tests for Kvitt New Features
Tests: Request buy-in, Request cash-out, Admin cash-out, Game history
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-ui-revamp-7.preview.emergentagent.com')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1770401937136')
USER_ID = os.environ.get('TEST_USER_ID', 'test-user-1770401937136')
SESSION_TOKEN_2 = os.environ.get('TEST_SESSION_TOKEN_2', 'test_session_player2_1770402119637')
USER_ID_2 = os.environ.get('TEST_USER_ID_2', 'test-user-player2-1770402119637')
USER_EMAIL_2 = os.environ.get('TEST_USER_EMAIL_2', 'test.player2.1770402119637@example.com')


def add_player2_to_group(group_id, headers, headers_2):
    """Helper to add player 2 to a group via invite"""
    requests.post(
        f"{BASE_URL}/api/groups/{group_id}/invite",
        json={"email": USER_EMAIL_2},
        headers=headers
    )
    
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
    
    add_player2_to_group(group_id, headers, headers_2)
    
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
    
    requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=headers_2)
    
    start_response = requests.post(
        f"{BASE_URL}/api/games/{game_id}/start",
        headers=headers
    )
    assert start_response.status_code == 200, f"Failed to start game: {start_response.json()}"
    
    return group_id, game_id


class TestRequestBuyIn:
    """Test player request buy-in feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_request_buy_in_requires_auth(self):
        """Test request buy-in requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/games/fake_game/request-buy-in",
            json={"amount": 20}
        )
        assert response.status_code == 401
        print("SUCCESS: Request buy-in requires authentication")
    
    def test_request_buy_in_game_not_found(self):
        """Test request buy-in with non-existent game"""
        response = requests.post(
            f"{BASE_URL}/api/games/nonexistent_game/request-buy-in",
            json={"amount": 20},
            headers=self.headers
        )
        assert response.status_code == 404
        print("SUCCESS: Request buy-in returns 404 for non-existent game")
    
    def test_request_buy_in_success(self):
        """Test player successfully requests buy-in"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Player 2 requests buy-in
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/request-buy-in",
            json={"amount": 20},
            headers=self.headers_2
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["amount"] == 20
        assert "chips" in data
        print(f"SUCCESS: Player requested buy-in - amount: ${data['amount']}, chips: {data['chips']}")
    
    def test_request_buy_in_various_amounts(self):
        """Test request buy-in with various amounts"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        amounts = [5, 10, 20, 50, 100]
        for amount in amounts:
            response = requests.post(
                f"{BASE_URL}/api/games/{game_id}/request-buy-in",
                json={"amount": amount},
                headers=self.headers_2
            )
            assert response.status_code == 200
            data = response.json()
            assert data["amount"] == amount
            print(f"SUCCESS: Request buy-in ${amount} - chips: {data['chips']}")


class TestRequestCashOut:
    """Test player request cash-out feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_request_cash_out_requires_auth(self):
        """Test request cash-out requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/games/fake_game/request-cash-out",
            json={"chips_count": 20}
        )
        assert response.status_code == 401
        print("SUCCESS: Request cash-out requires authentication")
    
    def test_request_cash_out_game_not_found(self):
        """Test request cash-out with non-existent game"""
        response = requests.post(
            f"{BASE_URL}/api/games/nonexistent_game/request-cash-out",
            json={"chips_count": 20},
            headers=self.headers
        )
        assert response.status_code == 404
        print("SUCCESS: Request cash-out returns 404 for non-existent game")
    
    def test_request_cash_out_success(self):
        """Test player successfully requests cash-out"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # First add buy-in for player 2
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID_2, "amount": 20},
            headers=self.headers
        )
        
        # Player 2 requests cash-out
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/request-cash-out",
            json={"chips_count": 25},
            headers=self.headers_2
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Player requested cash-out with 25 chips")
    
    def test_request_cash_out_not_player(self):
        """Test request cash-out when not a player in game"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Create a third user session (doesn't exist, should fail)
        headers_3 = {"Authorization": "Bearer fake_session_token"}
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/request-cash-out",
            json={"chips_count": 20},
            headers=headers_3
        )
        assert response.status_code == 401
        print("SUCCESS: Request cash-out fails for non-authenticated user")


class TestAdminCashOut:
    """Test admin/host cash-out player feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_admin_cash_out_requires_auth(self):
        """Test admin cash-out requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/games/fake_game/admin-cash-out",
            json={"user_id": "test_user", "chips_count": 20}
        )
        assert response.status_code == 401
        print("SUCCESS: Admin cash-out requires authentication")
    
    def test_admin_cash_out_game_not_found(self):
        """Test admin cash-out with non-existent game"""
        response = requests.post(
            f"{BASE_URL}/api/games/nonexistent_game/admin-cash-out",
            json={"user_id": "test_user", "chips_count": 20},
            headers=self.headers
        )
        assert response.status_code == 404
        print("SUCCESS: Admin cash-out returns 404 for non-existent game")
    
    def test_admin_cash_out_success(self):
        """Test host successfully cashes out a player"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Add buy-in for player 2
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID_2, "amount": 20},
            headers=self.headers
        )
        
        # Host cashes out player 2
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": USER_ID_2, "chips_count": 25},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["user_id"] == USER_ID_2
        assert data["chips_returned"] == 25
        assert data["cash_value"] == 25.0  # 25 chips * $1/chip
        assert data["net_result"] == 5.0  # $25 - $20 = $5 profit
        print(f"SUCCESS: Admin cashed out player - chips: {data['chips_returned']}, net: ${data['net_result']}")
    
    def test_admin_cash_out_loss_scenario(self):
        """Test admin cash-out with loss scenario"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Add buy-in for player 2
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID_2, "amount": 50},
            headers=self.headers
        )
        
        # Host cashes out player 2 with fewer chips (loss)
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": USER_ID_2, "chips_count": 30},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chips_returned"] == 30
        assert data["cash_value"] == 30.0  # 30 chips * $1/chip
        assert data["net_result"] == -20.0  # $30 - $50 = -$20 loss
        print(f"SUCCESS: Admin cash-out loss scenario - net: ${data['net_result']}")
    
    def test_admin_cash_out_player_not_in_game(self):
        """Test admin cash-out for player not in game"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": "nonexistent_player", "chips_count": 20},
            headers=self.headers
        )
        assert response.status_code == 400
        print("SUCCESS: Admin cash-out returns 400 for player not in game")
    
    def test_admin_cash_out_non_host_fails(self):
        """Test that non-host cannot cash out players"""
        group_id, game_id = create_active_game_with_2_players(self.headers, self.headers_2)
        
        # Add buy-in for host
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-buy-in",
            json={"user_id": USER_ID, "amount": 20},
            headers=self.headers
        )
        
        # Player 2 tries to cash out host (should fail)
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": USER_ID, "chips_count": 20},
            headers=self.headers_2
        )
        assert response.status_code == 403
        print("SUCCESS: Non-host cannot use admin cash-out")


class TestGameHistory:
    """Test game history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_game_history_requires_auth(self):
        """Test game history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/users/game-history")
        assert response.status_code == 401
        print("SUCCESS: Game history requires authentication")
    
    def test_game_history_returns_data(self):
        """Test game history returns games and stats"""
        response = requests.get(
            f"{BASE_URL}/api/users/game-history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "games" in data
        assert "stats" in data
        assert isinstance(data["games"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "totalGames" in stats
        assert "totalWinnings" in stats
        assert "totalLosses" in stats
        assert "winRate" in stats
        
        print(f"SUCCESS: Game history returned - {len(data['games'])} games, stats: {stats}")
    
    def test_game_history_includes_game_details(self):
        """Test game history includes proper game details"""
        response = requests.get(
            f"{BASE_URL}/api/users/game-history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["games"]) > 0:
            game = data["games"][0]
            # Verify game has required fields
            assert "game_id" in game
            assert "status" in game
            assert "group" in game
            print(f"SUCCESS: Game history includes proper game details")
        else:
            print("SUCCESS: Game history returned (no games yet)")


class TestStaticPages:
    """Test static pages (Privacy, Terms) are accessible"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: API root returns: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
