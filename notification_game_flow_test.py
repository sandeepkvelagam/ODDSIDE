#!/usr/bin/env python3
"""
Kvitt Notification and Game Flow Testing Suite
Tests the NEW endpoints for join game flow, add player, buy-in flow, and notifications
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class NotificationGameFlowTester:
    def __init__(self, base_url: str = "https://kvitt-ledger.preview.emergentagent.com"):
        self.base_url = base_url
        self.user1_id = None  # Host
        self.user2_id = None  # Player
        self.group_id = None
        self.game_id = None
        self.cookies1 = {}  # Host cookies
        self.cookies2 = {}  # Player cookies
        self.tests_run = 0
        self.tests_passed = 0
        
    def get_headers(self) -> Dict[str, str]:
        """Get headers"""
        return {'Content-Type': 'application/json'}
    
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, cookies: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('/') else f"{self.base_url}{endpoint}"
        headers = self.get_headers()
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, cookies=cookies or {}, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, cookies=cookies or {}, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, cookies=cookies or {}, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, cookies=cookies or {}, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                    return False, error_data
                except:
                    print(f"   Error: {response.text}")
                    return False, {}
                    
        except requests.exceptions.RequestException as e:
            print(f"❌ FAILED - Network error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}
    
    def setup_users_and_group(self):
        """Setup two users and a group for testing"""
        print("\n" + "="*60)
        print("SETUP: Creating Users and Group")
        print("="*60)
        
        test_id = str(uuid.uuid4())[:8]
        
        # Create user1 (host)
        sync_data1 = {
            "supabase_id": f"host_{test_id}",
            "email": f"host_{test_id}@kvitt.com",
            "name": f"Host User {test_id}"
        }
        success, user_data1 = self.run_test("Create Host User", "POST", "auth/sync-user", 200, sync_data1)
        if success:
            self.user1_id = user_data1.get('user_id')
            # Update cookies for user1
            response = requests.post(f"{self.base_url}/api/auth/sync-user", json=sync_data1)
            if response.cookies:
                self.cookies1.update(response.cookies)
        
        # Create user2 (player)
        sync_data2 = {
            "supabase_id": f"player_{test_id}",
            "email": f"player_{test_id}@kvitt.com",
            "name": f"Player User {test_id}"
        }
        success, user_data2 = self.run_test("Create Player User", "POST", "auth/sync-user", 200, sync_data2)
        if success:
            self.user2_id = user_data2.get('user_id')
            # Update cookies for user2
            response = requests.post(f"{self.base_url}/api/auth/sync-user", json=sync_data2)
            if response.cookies:
                self.cookies2.update(response.cookies)
        
        # Create group with user1 (host)
        group_data = {
            "name": f"Test Flow Group {test_id}",
            "description": "Group for testing notification and game flow",
            "default_buy_in": 20.0,
            "chips_per_buy_in": 20
        }
        success, response = self.run_test("Create Group", "POST", "groups", 200, group_data, self.cookies1)
        if success:
            self.group_id = response.get('group_id')
        
        # Invite user2 to group
        if self.group_id:
            invite_data = {"email": f"player_{test_id}@kvitt.com"}
            success, _ = self.run_test("Invite Player to Group", "POST", f"groups/{self.group_id}/invite", 200, invite_data, self.cookies1)
        
        # Accept invite as user2
        if self.group_id:
            # First get invites for user2
            success, invites = self.run_test("Get Player Invites", "GET", "users/invites", 200, cookies=self.cookies2)
            if success and invites:
                invite_id = invites[0].get('invite_id')
                if invite_id:
                    accept_data = {"accept": True}
                    success, _ = self.run_test("Accept Group Invite", "POST", f"users/invites/{invite_id}/respond", 200, accept_data, self.cookies2)
        
        return self.user1_id and self.user2_id and self.group_id
    
    def test_join_game_flow(self):
        """Test the new join game flow endpoints"""
        print("\n" + "="*60)
        print("TESTING JOIN GAME FLOW")
        print("="*60)
        
        if not (self.user1_id and self.user2_id and self.group_id):
            print("❌ Skipping - setup failed")
            return False
        
        # Create a game with user1 (host)
        game_data = {
            "group_id": self.group_id,
            "title": "Join Flow Test Game",
            "buy_in_amount": 20.0,
            "chips_per_buy_in": 20
        }
        success, response = self.run_test("Create Game", "POST", "games", 200, game_data, self.cookies1)
        if success:
            self.game_id = response.get('game_id')
        
        if not self.game_id:
            print("❌ Failed to create game")
            return False
        
        # Test 1: User2 requests to join game - should create pending join request (not auto-join)
        success, join_response = self.run_test("Player Requests Join", "POST", f"games/{self.game_id}/join", 200, cookies=self.cookies2)
        if success:
            status = join_response.get('status')
            if status == 'pending':
                print("✅ Join request correctly created as pending")
            else:
                print(f"❌ Expected 'pending' status, got '{status}'")
        
        # Test 2: Check host notifications - should see join request
        success, notifications = self.run_test("Check Host Notifications", "GET", "notifications", 200, cookies=self.cookies1)
        join_notification_found = False
        if success and notifications:
            for notif in notifications:
                if notif.get('type') == 'join_request':
                    join_notification_found = True
                    print(f"✅ Found join request notification: {notif.get('message')}")
                    break
        
        if not join_notification_found:
            print("❌ No join request notification found for host")
        
        # Test 3: Host approves join
        approve_data = {"user_id": self.user2_id}
        success, approve_response = self.run_test("Host Approves Join", "POST", f"games/{self.game_id}/approve-join", 200, approve_data, self.cookies1)
        
        # Test 4: Check player notifications - should see join approved
        success, player_notifications = self.run_test("Check Player Notifications", "GET", "notifications", 200, cookies=self.cookies2)
        join_approved_found = False
        if success and player_notifications:
            for notif in player_notifications:
                if notif.get('type') == 'join_approved':
                    join_approved_found = True
                    print(f"✅ Found join approved notification: {notif.get('message')}")
                    break
        
        if not join_approved_found:
            print("❌ No join approved notification found for player")
        
        return success and join_notification_found and join_approved_found
    
    def test_reject_join_flow(self):
        """Test rejecting a join request"""
        print("\n" + "="*60)
        print("TESTING REJECT JOIN FLOW")
        print("="*60)
        
        if not self.game_id:
            print("❌ Skipping - no game available")
            return False
        
        # Create another user to test rejection
        test_id = str(uuid.uuid4())[:8]
        sync_data3 = {
            "supabase_id": f"reject_test_{test_id}",
            "email": f"reject_{test_id}@kvitt.com",
            "name": f"Reject Test User {test_id}"
        }
        success, user_data3 = self.run_test("Create Third User", "POST", "auth/sync-user", 200, sync_data3)
        if success:
            user3_id = user_data3.get('user_id')
            # Get cookies for user3
            response = requests.post(f"{self.base_url}/api/auth/sync-user", json=sync_data3)
            cookies3 = {}
            if response.cookies:
                cookies3.update(response.cookies)
            
            # Invite user3 to group and accept
            invite_data = {"email": f"reject_{test_id}@kvitt.com"}
            success, _ = self.run_test("Invite Third User to Group", "POST", f"groups/{self.group_id}/invite", 200, invite_data, self.cookies1)
            
            # Accept invite
            success, invites = self.run_test("Get Third User Invites", "GET", "users/invites", 200, cookies=cookies3)
            if success and invites:
                invite_id = invites[0].get('invite_id')
                if invite_id:
                    accept_data = {"accept": True}
                    success, _ = self.run_test("Accept Group Invite (Third User)", "POST", f"users/invites/{invite_id}/respond", 200, accept_data, cookies3)
            
            # User3 requests to join game
            success, _ = self.run_test("Third User Requests Join", "POST", f"games/{self.game_id}/join", 200, cookies=cookies3)
            
            # Host rejects join
            reject_data = {"user_id": user3_id}
            success, _ = self.run_test("Host Rejects Join", "POST", f"games/{self.game_id}/reject-join", 200, reject_data, self.cookies1)
            
            # Check user3 notifications for rejection
            success, reject_notifications = self.run_test("Check Rejection Notifications", "GET", "notifications", 200, cookies=cookies3)
            reject_found = False
            if success and reject_notifications:
                for notif in reject_notifications:
                    if notif.get('type') == 'join_rejected':
                        reject_found = True
                        print(f"✅ Found join rejected notification: {notif.get('message')}")
                        break
            
            return reject_found
        
        return False
    
    def test_add_player_flow(self):
        """Test the add player endpoints"""
        print("\n" + "="*60)
        print("TESTING ADD PLAYER FLOW")
        print("="*60)
        
        if not self.game_id:
            print("❌ Skipping - no game available")
            return False
        
        # Test 1: Get available players (group members not in game)
        success, available_players = self.run_test("Get Available Players", "GET", f"games/{self.game_id}/available-players", 200, cookies=self.cookies1)
        if success:
            print(f"   Available players: {len(available_players)}")
        
        # Test 2: Host adds player directly
        add_data = {"user_id": self.user2_id}
        success, add_response = self.run_test("Host Adds Player Directly", "POST", f"games/{self.game_id}/add-player", 200, add_data, self.cookies1)
        
        return success
    
    def test_buy_in_flow(self):
        """Test the buy-in flow endpoints"""
        print("\n" + "="*60)
        print("TESTING BUY-IN FLOW")
        print("="*60)
        
        if not self.game_id:
            print("❌ Skipping - no game available")
            return False
        
        # Test 1: Player requests buy-in
        buy_in_request_data = {"amount": 20.0}
        success, buy_in_response = self.run_test("Player Requests Buy-In", "POST", f"games/{self.game_id}/request-buy-in", 200, buy_in_request_data, self.cookies2)
        
        # Test 2: Check host notifications - should see buy-in request
        success, host_notifications = self.run_test("Check Host Buy-In Notifications", "GET", "notifications", 200, cookies=self.cookies1)
        buy_in_notification_found = False
        if success and host_notifications:
            for notif in host_notifications:
                if notif.get('type') == 'buy_in_request':
                    buy_in_notification_found = True
                    print(f"✅ Found buy-in request notification: {notif.get('message')}")
                    break
        
        if not buy_in_notification_found:
            print("❌ No buy-in request notification found for host")
        
        # Test 3: Host approves buy-in
        approve_buy_in_data = {"user_id": self.user2_id, "amount": 20.0}
        success, approve_buy_in_response = self.run_test("Host Approves Buy-In", "POST", f"games/{self.game_id}/approve-buy-in", 200, approve_buy_in_data, self.cookies1)
        
        return success and buy_in_notification_found
    
    def test_notifications_structure(self):
        """Test that notifications have proper structure with type field"""
        print("\n" + "="*60)
        print("TESTING NOTIFICATIONS STRUCTURE")
        print("="*60)
        
        # Get notifications for both users
        success1, host_notifications = self.run_test("Get Host Notifications", "GET", "notifications", 200, cookies=self.cookies1)
        success2, player_notifications = self.run_test("Get Player Notifications", "GET", "notifications", 200, cookies=self.cookies2)
        
        valid_types = ["join_request", "buy_in_request", "join_approved", "join_rejected", "game_invite", "group_invite_request"]
        
        all_notifications = []
        if success1 and host_notifications:
            all_notifications.extend(host_notifications)
        if success2 and player_notifications:
            all_notifications.extend(player_notifications)
        
        structure_valid = True
        for notif in all_notifications:
            # Check required fields
            if 'type' not in notif:
                print(f"❌ Notification missing 'type' field: {notif}")
                structure_valid = False
            elif notif['type'] in valid_types:
                print(f"✅ Valid notification type: {notif['type']}")
            else:
                print(f"⚠️ Unknown notification type: {notif['type']}")
            
            # Check other required fields
            required_fields = ['notification_id', 'user_id', 'title', 'message', 'read', 'created_at']
            for field in required_fields:
                if field not in notif:
                    print(f"❌ Notification missing '{field}' field")
                    structure_valid = False
        
        print(f"\n📊 Total notifications checked: {len(all_notifications)}")
        return structure_valid and len(all_notifications) > 0
    
    def run_complete_test_flow(self):
        """Run the complete test flow as specified in the review request"""
        print("\n" + "="*60)
        print("RUNNING COMPLETE TEST FLOW")
        print("="*60)
        
        # Setup
        setup_success = self.setup_users_and_group()
        if not setup_success:
            print("❌ Setup failed")
            return False
        
        # Test flows
        join_flow_success = self.test_join_game_flow()
        reject_flow_success = self.test_reject_join_flow()
        add_player_success = self.test_add_player_flow()
        buy_in_flow_success = self.test_buy_in_flow()
        notifications_structure_success = self.test_notifications_structure()
        
        overall_success = all([
            setup_success,
            join_flow_success,
            buy_in_flow_success,
            notifications_structure_success
        ])
        
        print(f"\n🎯 Complete Flow Test: {'✅ PASSED' if overall_success else '❌ FAILED'}")
        return overall_success
    
    def run_all_tests(self):
        """Run all notification and game flow tests"""
        print("🚀 Starting Kvitt Notification and Game Flow Test Suite")
        print(f"🔗 Testing against: {self.base_url}")
        
        start_time = datetime.now()
        
        try:
            flow_success = self.run_complete_test_flow()
        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
            flow_success = False
        except Exception as e:
            print(f"\n💥 Unexpected error: {e}")
            flow_success = False
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        print(f"📊 Tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        print(f"⏱️ Duration: {duration:.1f}s")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All notification and game flow tests passed!")
            return 0
        else:
            print("⚠️ Some notification and game flow tests failed")
            return 1

def main():
    """Main test runner"""
    tester = NotificationGameFlowTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())