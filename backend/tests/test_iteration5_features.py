"""
Backend API Tests for Kvitt Iteration 5 Features
Tests:
1. Auto buy-in on game creation - Host should auto-receive default buy-in when creating an active game
2. Leaderboard display - Should show player names and avatars, not just numbers
3. Request Join button - Active games should have Request Join button for non-players
4. Edit player chips endpoint - POST /api/games/{game_id}/edit-player-chips should work for host
5. Notification actions - Join request and buy-in request notifications should have Approve/Reject buttons
6. Group invite notifications - Should have Accept/Decline buttons
7. Buy-in request flow - Player requests, host gets notification, host approves, player gets chips
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kvitt-ledger.preview.emergentagent.com')

# Test user credentials
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


class TestAutoBuyInOnGameCreation:
    """Test 1: Auto buy-in on game creation - Host should auto-receive default buy-in when creating an active game"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_active_game_host_gets_auto_buyin(self):
        """When creating an active game (no scheduled_at), host should auto-receive buy-in"""
        # Create group first
        group_payload = {
            "name": f"TEST_AutoBuyIn_Group_{int(time.time())}",
            "description": "Test group for auto buy-in",
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
        
        # Create active game (no scheduled_at means it starts immediately)
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_AutoBuyIn_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
            # No scheduled_at - game should be active immediately
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        assert game_response.status_code == 200
        game_data = game_response.json()
        game_id = game_data["game_id"]
        
        # Verify game is active
        assert game_data["status"] == "active", f"Expected game status 'active', got '{game_data['status']}'"
        
        # Get game details to check host's buy-in
        game_details = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert game_details.status_code == 200
        game = game_details.json()
        
        # Find host's player record
        host_player = None
        for player in game.get("players", []):
            if player["user_id"] == USER_ID:
                host_player = player
                break
        
        assert host_player is not None, "Host should be a player in the game"
        assert host_player["total_buy_in"] == 20, f"Host should have $20 buy-in, got ${host_player['total_buy_in']}"
        assert host_player["total_chips"] == 20, f"Host should have 20 chips, got {host_player['total_chips']}"
        
        print(f"SUCCESS: Host auto-received buy-in - ${host_player['total_buy_in']}, {host_player['total_chips']} chips")
    
    def test_scheduled_game_host_no_auto_buyin(self):
        """When creating a scheduled game, host should NOT auto-receive buy-in"""
        # Create group first
        group_payload = {
            "name": f"TEST_ScheduledGame_Group_{int(time.time())}",
            "description": "Test group for scheduled game",
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
        
        # Create scheduled game (with scheduled_at)
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_ScheduledGame_{int(time.time())}",
            "scheduled_at": "2026-02-15T20:00:00Z",  # Future date
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        assert game_response.status_code == 200
        game_data = game_response.json()
        game_id = game_data["game_id"]
        
        # Verify game is scheduled (not active)
        assert game_data["status"] == "scheduled", f"Expected game status 'scheduled', got '{game_data['status']}'"
        
        # Get game details to check host's buy-in
        game_details = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert game_details.status_code == 200
        game = game_details.json()
        
        # Find host's player record
        host_player = None
        for player in game.get("players", []):
            if player["user_id"] == USER_ID:
                host_player = player
                break
        
        assert host_player is not None, "Host should be a player in the game"
        assert host_player["total_buy_in"] == 0, f"Host should have $0 buy-in for scheduled game, got ${host_player['total_buy_in']}"
        assert host_player["total_chips"] == 0, f"Host should have 0 chips for scheduled game, got {host_player['total_chips']}"
        
        print(f"SUCCESS: Scheduled game - host has no auto buy-in (${host_player['total_buy_in']}, {host_player['total_chips']} chips)")


class TestLeaderboardDisplay:
    """Test 2: Leaderboard display - Should show player names and avatars, not just numbers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_leaderboard_returns_user_info(self):
        """Leaderboard should return user info (name, picture) not just user_id"""
        # Create group and add player 2
        group_payload = {
            "name": f"TEST_Leaderboard_Group_{int(time.time())}",
            "description": "Test group for leaderboard",
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
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create and complete a game to generate leaderboard data
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_Leaderboard_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        assert game_response.status_code == 200
        game_id = game_response.json()["game_id"]
        
        # Player 2 joins
        requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=self.headers_2)
        
        # Approve player 2's join (this gives them buy-in)
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/approve-join",
            json={"user_id": USER_ID_2},
            headers=self.headers
        )
        
        # Cash out both players
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": USER_ID, "chips_count": 25},  # Host wins
            headers=self.headers
        )
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": USER_ID_2, "chips_count": 15},  # Player 2 loses
            headers=self.headers
        )
        
        # End the game
        requests.post(f"{BASE_URL}/api/games/{game_id}/end", headers=self.headers)
        
        # Get group stats (leaderboard)
        stats_response = requests.get(
            f"{BASE_URL}/api/stats/group/{group_id}",
            headers=self.headers
        )
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Verify leaderboard structure
        assert "leaderboard" in stats, "Response should contain leaderboard"
        leaderboard = stats["leaderboard"]
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            # Verify user info is included
            assert "user" in entry, "Leaderboard entry should have 'user' field"
            assert entry["user"] is not None, "User info should not be None"
            assert "name" in entry["user"], "User should have 'name' field"
            assert "user_id" in entry, "Entry should have 'user_id' field"
            assert "total_profit" in entry, "Entry should have 'total_profit' field"
            
            print(f"SUCCESS: Leaderboard returns user info - name: {entry['user']['name']}, profit: ${entry['total_profit']}")
        else:
            print("SUCCESS: Leaderboard endpoint works (no data yet)")


class TestEditPlayerChips:
    """Test 4: Edit player chips endpoint - POST /api/games/{game_id}/edit-player-chips should work for host"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_edit_player_chips_requires_auth(self):
        """Edit player chips requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/games/fake_game/edit-player-chips",
            json={"user_id": "test_user", "chips_count": 30}
        )
        assert response.status_code == 401
        print("SUCCESS: Edit player chips requires authentication")
    
    def test_edit_player_chips_game_not_found(self):
        """Edit player chips returns 404 for non-existent game"""
        response = requests.post(
            f"{BASE_URL}/api/games/nonexistent_game/edit-player-chips",
            json={"user_id": "test_user", "chips_count": 30},
            headers=self.headers
        )
        assert response.status_code == 404
        print("SUCCESS: Edit player chips returns 404 for non-existent game")
    
    def test_edit_player_chips_host_only(self):
        """Only host can edit player chips"""
        # Create group and game
        group_payload = {
            "name": f"TEST_EditChips_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_EditChips_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 tries to edit host's chips (should fail)
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/edit-player-chips",
            json={"user_id": USER_ID, "chips_count": 30},
            headers=self.headers_2
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Non-host cannot edit player chips")
    
    def test_edit_player_chips_success(self):
        """Host can successfully edit player chips after cash-out"""
        # Create group and game
        group_payload = {
            "name": f"TEST_EditChipsSuccess_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_EditChipsSuccess_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 joins and gets approved
        requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=self.headers_2)
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/approve-join",
            json={"user_id": USER_ID_2},
            headers=self.headers
        )
        
        # Cash out player 2 first
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/admin-cash-out",
            json={"user_id": USER_ID_2, "chips_count": 15},
            headers=self.headers
        )
        
        # Now host edits player 2's chips
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/edit-player-chips",
            json={"user_id": USER_ID_2, "chips_count": 25, "reason": "Correction"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"
        data = response.json()
        
        assert "old_chips" in data, "Response should have old_chips"
        assert "new_chips" in data, "Response should have new_chips"
        assert data["new_chips"] == 25, f"Expected new_chips=25, got {data['new_chips']}"
        assert "new_cash_value" in data, "Response should have new_cash_value"
        assert "new_net_result" in data, "Response should have new_net_result"
        
        print(f"SUCCESS: Host edited player chips - old: {data['old_chips']}, new: {data['new_chips']}, net: ${data['new_net_result']}")


class TestRequestJoinFlow:
    """Test 3: Request Join button - Active games should have Request Join button for non-players"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_request_join_creates_pending_player(self):
        """Request join should create a pending player record"""
        # Create group
        group_payload = {
            "name": f"TEST_RequestJoin_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_RequestJoin_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 requests to join
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/join",
            headers=self.headers_2
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending", f"Expected status 'pending', got '{data['status']}'"
        
        print(f"SUCCESS: Request join creates pending player - status: {data['status']}")
    
    def test_approve_join_gives_default_buyin(self):
        """Approving join request should give player default buy-in"""
        # Create group
        group_payload = {
            "name": f"TEST_ApproveJoin_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_ApproveJoin_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 requests to join
        requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=self.headers_2)
        
        # Host approves
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/approve-join",
            json={"user_id": USER_ID_2},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify player 2 has buy-in
        game_details = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        game = game_details.json()
        
        player2 = None
        for player in game.get("players", []):
            if player["user_id"] == USER_ID_2:
                player2 = player
                break
        
        assert player2 is not None, "Player 2 should be in the game"
        assert player2["rsvp_status"] == "yes", f"Expected rsvp_status 'yes', got '{player2['rsvp_status']}'"
        assert player2["total_buy_in"] == 20, f"Expected buy-in $20, got ${player2['total_buy_in']}"
        assert player2["total_chips"] == 20, f"Expected 20 chips, got {player2['total_chips']}"
        
        print(f"SUCCESS: Approved player got default buy-in - ${player2['total_buy_in']}, {player2['total_chips']} chips")


class TestBuyInRequestFlow:
    """Test 7: Buy-in request flow - Player requests, host gets notification, host approves, player gets chips"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_buy_in_request_creates_notification(self):
        """Buy-in request should create notification for host"""
        # Create group
        group_payload = {
            "name": f"TEST_BuyInNotif_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_BuyInNotif_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 joins and gets approved
        requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=self.headers_2)
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/approve-join",
            json={"user_id": USER_ID_2},
            headers=self.headers
        )
        
        # Player 2 requests additional buy-in
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/request-buy-in",
            json={"amount": 20},
            headers=self.headers_2
        )
        assert response.status_code == 200
        
        # Check host's notifications
        notif_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=self.headers
        )
        assert notif_response.status_code == 200
        notifications = notif_response.json()
        
        # Find buy-in request notification
        buy_in_notif = None
        for notif in notifications:
            if notif.get("type") == "buy_in_request" and notif.get("data", {}).get("game_id") == game_id:
                buy_in_notif = notif
                break
        
        assert buy_in_notif is not None, "Host should have buy-in request notification"
        assert buy_in_notif["data"]["user_id"] == USER_ID_2, "Notification should have player's user_id"
        assert buy_in_notif["data"]["amount"] == 20, "Notification should have requested amount"
        
        print(f"SUCCESS: Buy-in request created notification for host - amount: ${buy_in_notif['data']['amount']}")
    
    def test_approve_buy_in_gives_chips(self):
        """Approving buy-in request should give player chips"""
        # Create group
        group_payload = {
            "name": f"TEST_ApproveBuyIn_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_ApproveBuyIn_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 joins and gets approved (gets initial 20 chips)
        requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=self.headers_2)
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/approve-join",
            json={"user_id": USER_ID_2},
            headers=self.headers
        )
        
        # Player 2 requests additional buy-in
        requests.post(
            f"{BASE_URL}/api/games/{game_id}/request-buy-in",
            json={"amount": 20},
            headers=self.headers_2
        )
        
        # Host approves buy-in
        response = requests.post(
            f"{BASE_URL}/api/games/{game_id}/approve-buy-in",
            json={"user_id": USER_ID_2, "amount": 20, "chips": 20},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify player 2 has additional chips
        game_details = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        game = game_details.json()
        
        player2 = None
        for player in game.get("players", []):
            if player["user_id"] == USER_ID_2:
                player2 = player
                break
        
        assert player2 is not None, "Player 2 should be in the game"
        assert player2["total_buy_in"] == 40, f"Expected total buy-in $40, got ${player2['total_buy_in']}"
        assert player2["total_chips"] == 40, f"Expected 40 chips, got {player2['total_chips']}"
        
        print(f"SUCCESS: Approved buy-in gave player chips - total: ${player2['total_buy_in']}, {player2['total_chips']} chips")


class TestGroupInviteNotifications:
    """Test 6: Group invite notifications - Should have Accept/Decline buttons"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_group_invite_creates_notification(self):
        """Group invite should create notification with invite_id for Accept/Decline"""
        # Create group
        group_payload = {
            "name": f"TEST_InviteNotif_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Invite player 2
        response = requests.post(
            f"{BASE_URL}/api/groups/{group_id}/invite",
            json={"email": USER_EMAIL_2},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Check player 2's notifications
        notif_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=self.headers_2
        )
        assert notif_response.status_code == 200
        notifications = notif_response.json()
        
        # Find group invite notification
        invite_notif = None
        for notif in notifications:
            if notif.get("type") == "group_invite_request" and notif.get("data", {}).get("group_id") == group_id:
                invite_notif = notif
                break
        
        assert invite_notif is not None, "Player 2 should have group invite notification"
        assert "invite_id" in invite_notif["data"], "Notification should have invite_id for Accept/Decline"
        
        print(f"SUCCESS: Group invite notification has invite_id: {invite_notif['data']['invite_id']}")
    
    def test_accept_invite_via_notification(self):
        """User can accept invite using invite_id from notification"""
        # Create group
        group_payload = {
            "name": f"TEST_AcceptInvite_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Invite player 2
        requests.post(
            f"{BASE_URL}/api/groups/{group_id}/invite",
            json={"email": USER_EMAIL_2},
            headers=self.headers
        )
        
        # Get player 2's invites
        invites_response = requests.get(
            f"{BASE_URL}/api/users/invites",
            headers=self.headers_2
        )
        assert invites_response.status_code == 200
        invites = invites_response.json()
        
        # Find the invite
        invite = None
        for inv in invites:
            if inv.get("group_id") == group_id:
                invite = inv
                break
        
        assert invite is not None, "Player 2 should have pending invite"
        
        # Accept invite
        response = requests.post(
            f"{BASE_URL}/api/users/invites/{invite['invite_id']}/respond",
            json={"accept": True},
            headers=self.headers_2
        )
        assert response.status_code == 200
        
        # Verify player 2 is now a member
        group_response = requests.get(
            f"{BASE_URL}/api/groups/{group_id}",
            headers=self.headers_2
        )
        assert group_response.status_code == 200
        
        print(f"SUCCESS: Player 2 accepted invite and joined group")


class TestNotificationActions:
    """Test 5: Notification actions - Join request and buy-in request notifications should have Approve/Reject buttons"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        self.headers_2 = {"Authorization": f"Bearer {SESSION_TOKEN_2}"}
    
    def test_join_request_notification_has_action_data(self):
        """Join request notification should have user_id and game_id for Approve/Reject"""
        # Create group
        group_payload = {
            "name": f"TEST_JoinNotif_Group_{int(time.time())}",
            "description": "Test group",
            "default_buy_in": 20,
            "chips_per_buy_in": 20
        }
        group_response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_payload,
            headers=self.headers
        )
        group_id = group_response.json()["group_id"]
        
        # Add player 2 to group
        add_player2_to_group(group_id, self.headers, self.headers_2)
        
        # Create active game
        game_payload = {
            "group_id": group_id,
            "title": f"TEST_JoinNotif_Game_{int(time.time())}",
            "buy_in_amount": 20,
            "chips_per_buy_in": 20
        }
        game_response = requests.post(
            f"{BASE_URL}/api/games",
            json=game_payload,
            headers=self.headers
        )
        game_id = game_response.json()["game_id"]
        
        # Player 2 requests to join
        requests.post(f"{BASE_URL}/api/games/{game_id}/join", headers=self.headers_2)
        
        # Check host's notifications
        notif_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=self.headers
        )
        assert notif_response.status_code == 200
        notifications = notif_response.json()
        
        # Find join request notification
        join_notif = None
        for notif in notifications:
            if notif.get("type") == "join_request" and notif.get("data", {}).get("game_id") == game_id:
                join_notif = notif
                break
        
        assert join_notif is not None, "Host should have join request notification"
        assert "user_id" in join_notif["data"], "Notification should have user_id for Approve/Reject"
        assert "game_id" in join_notif["data"], "Notification should have game_id for Approve/Reject"
        assert join_notif["data"]["user_id"] == USER_ID_2, "Notification should have correct user_id"
        
        print(f"SUCCESS: Join request notification has action data - user_id: {join_notif['data']['user_id']}, game_id: {join_notif['data']['game_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
