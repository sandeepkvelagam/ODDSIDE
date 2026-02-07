#!/usr/bin/env python3
"""
Kvitt Poker Game Ledger Backend API Testing Suite
Tests all major API endpoints according to the review request
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class KvittAPITester:
    def __init__(self, base_url: str = "https://repo-test-app-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.group_id = None
        self.game_id = None
        self.cookies = {}
        
    def get_headers(self, auth: bool = True) -> Dict[str, str]:
        """Get headers with auth token"""
        headers = {'Content-Type': 'application/json'}
        if auth and self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'
        return headers
    
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, auth: bool = True) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('/') else f"{self.base_url}{endpoint}"
        headers = self.get_headers(auth)
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, cookies=self.cookies, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, cookies=self.cookies, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, cookies=self.cookies, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, cookies=self.cookies, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"   Status: {response.status_code}")
            
            # Update cookies from response
            if response.cookies:
                self.cookies.update(response.cookies)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 300:
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
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        print("\n" + "="*50)
        print("TESTING HEALTH CHECK & BASIC API")
        print("="*50)
        
        # Test root endpoint
        success, response = self.run_test("Health Check", "GET", "", 200, auth=False)
        return success
    
    def test_auth_flow(self):
        """Test authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTH FLOW")
        print("="*50)
        
        # Generate unique test user data
        test_id = str(uuid.uuid4())[:8]
        
        # Test sync-user endpoint
        sync_data = {
            "supabase_id": f"test_supabase_{test_id}",
            "email": f"testuser_{test_id}@kvitt.com",
            "name": f"Test User {test_id}",
            "picture": "https://example.com/avatar.jpg"
        }
        
        success, user_data = self.run_test("Sync User", "POST", "auth/sync-user", 200, sync_data, auth=False)
        if success and user_data:
            self.user_id = user_data.get('user_id')
            print(f"   Created user: {self.user_id}")
            print(f"   User name: {user_data.get('name')}")
        
        # Test get current user (should work with session cookie)
        success, me_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"   Authenticated as: {me_data.get('name', 'Unknown')}")
        
        # Test logout
        success, logout_data = self.run_test("Logout", "POST", "auth/logout", 200)
        
        return success and self.user_id is not None
    
    def test_groups_api(self):
        """Test Groups API endpoints"""
        print("\n" + "="*50)
        print("TESTING GROUPS API")
        print("="*50)
        
        # Re-authenticate after logout
        test_id = str(uuid.uuid4())[:8]
        sync_data = {
            "supabase_id": f"test_supabase_{test_id}",
            "email": f"testuser_{test_id}@kvitt.com",
            "name": f"Test User {test_id}"
        }
        success, user_data = self.run_test("Re-authenticate", "POST", "auth/sync-user", 200, sync_data, auth=False)
        if success:
            self.user_id = user_data.get('user_id')
        
        # Create group
        group_data = {
            "name": f"Test Poker Group {test_id}",
            "description": "Test group for API testing",
            "default_buy_in": 25.0,
            "chips_per_buy_in": 25,
            "currency": "USD"
        }
        success, response = self.run_test("Create Group", "POST", "groups", 200, group_data)
        if success and 'group_id' in response:
            self.group_id = response['group_id']
            print(f"   Created group: {self.group_id}")
        
        # Get user's groups
        success, groups = self.run_test("Get User Groups", "GET", "groups", 200)
        if success:
            print(f"   Found {len(groups)} groups")
        
        # Get specific group details
        if self.group_id:
            success, group = self.run_test("Get Group Details", "GET", f"groups/{self.group_id}", 200)
            if success:
                print(f"   Group members: {len(group.get('members', []))}")
        
        # Test invite member by email
        if self.group_id:
            invite_data = {"email": f"invited_{test_id}@kvitt.com"}
            success, invite_response = self.run_test("Invite Member", "POST", f"groups/{self.group_id}/invite", 200, invite_data)
            if success:
                print(f"   Invite status: {invite_response.get('status', 'unknown')}")
        
        return self.group_id is not None
    
    def test_games_api(self):
        """Test Games API endpoints"""
        print("\n" + "="*50)
        print("TESTING GAMES API")
        print("="*50)
        
        if not self.group_id:
            print("❌ Skipping game tests - no group available")
            return False
        
        # Create game
        game_data = {
            "group_id": self.group_id,
            "title": "Test Game Night",
            "location": "Test Location",
            "buy_in_amount": 50.0,
            "chips_per_buy_in": 50
        }
        success, response = self.run_test("Create Game", "POST", "games", 200, game_data)
        if success and 'game_id' in response:
            self.game_id = response['game_id']
            print(f"   Created game: {self.game_id}")
        
        # Get games list
        success, games = self.run_test("Get Games", "GET", "games", 200)
        if success:
            print(f"   Found {len(games)} games")
        
        # Get specific game details
        if self.game_id:
            success, game = self.run_test("Get Game Details", "GET", f"games/{self.game_id}", 200)
            if success:
                print(f"   Game status: {game.get('status', 'unknown')}")
                print(f"   Players: {len(game.get('players', []))}")
        
        # Start the game
        if self.game_id:
            success, start_response = self.run_test("Start Game", "POST", f"games/{self.game_id}/start", 200)
            if success:
                print(f"   Game started with {start_response.get('player_count', 0)} players")
        
        # Join game (should already be joined as creator)
        if self.game_id:
            success, join_response = self.run_test("Join Game", "POST", f"games/{self.game_id}/join", 200)
        
        return self.game_id is not None
    
    def test_buy_in_cash_out(self):
        """Test Buy-In and Cash-Out functionality"""
        print("\n" + "="*50)
        print("TESTING BUY-IN/CASH-OUT API")
        print("="*50)
        
        if not self.game_id:
            print("❌ Skipping transaction tests - no game available")
            return False
        
        # Test admin buy-in (host adding buy-in for themselves)
        admin_buy_in_data = {
            "user_id": self.user_id,
            "amount": 50.0
        }
        success, response = self.run_test("Admin Buy-In", "POST", f"games/{self.game_id}/admin-buy-in", 200, admin_buy_in_data)
        if success:
            print(f"   Total buy-in: ${response.get('total_buy_in', 0)}")
            print(f"   Total chips: {response.get('total_chips', 0)}")
        
        # Test request buy-in (player requesting additional buy-in)
        request_buy_in_data = {"amount": 25.0}
        success, response = self.run_test("Request Buy-In", "POST", f"games/{self.game_id}/request-buy-in", 200, request_buy_in_data)
        
        # Test request cash-out
        cash_out_data = {"chips_count": 60}  # Cashing out with some chips
        success, response = self.run_test("Request Cash-Out", "POST", f"games/{self.game_id}/request-cash-out", 200, cash_out_data)
        
        # Test admin cash-out (host processing cash-out)
        admin_cash_out_data = {
            "user_id": self.user_id,
            "chips_count": 60
        }
        success, response = self.run_test("Admin Cash-Out", "POST", f"games/{self.game_id}/admin-cash-out", 200, admin_cash_out_data)
        if success:
            print(f"   Cash-out amount: ${response.get('cash_out_amount', 0)}")
            print(f"   Net result: ${response.get('net_result', 0)}")
        
        return True
    
    def test_settlement(self):
        """Test Settlement functionality"""
        print("\n" + "="*50)
        print("TESTING SETTLEMENT API")
        print("="*50)
        
        if not self.game_id:
            print("❌ Skipping settlement tests - no game available")
            return False
        
        # Generate settlement
        success, settlement_response = self.run_test("Generate Settlement", "POST", f"games/{self.game_id}/settle", 200)
        if success:
            settlements = settlement_response.get('settlements', [])
            print(f"   Generated {len(settlements)} settlement entries")
            if settlements:
                print(f"   Sample settlement: {settlements[0]}")
        
        # Get settlement details
        success, settlement_data = self.run_test("Get Settlement", "GET", f"games/{self.game_id}/settlement", 200)
        if success:
            if isinstance(settlement_data, list):
                print(f"   Found {len(settlement_data)} settlement entries")
            else:
                print(f"   Settlement status: {settlement_data.get('status', 'unknown')}")
        
        return True
    
    def test_notifications(self):
        """Test Notifications API"""
        print("\n" + "="*50)
        print("TESTING NOTIFICATIONS API")
        print("="*50)
        
        # Get user notifications
        success, notifications = self.run_test("Get Notifications", "GET", "notifications", 200)
        if success:
            print(f"   Found {len(notifications)} notifications")
            if notifications:
                print(f"   Latest notification: {notifications[0].get('title', 'No title')}")
        
        return True
    
    def run_complete_flow_test(self):
        """Run the complete flow test as specified in review request"""
        print("\n" + "="*60)
        print("RUNNING COMPLETE FLOW TEST")
        print("="*60)
        
        flow_success = True
        
        # 1. Create a user via sync-user
        test_id = str(uuid.uuid4())[:8]
        sync_data = {
            "supabase_id": f"flow_test_{test_id}",
            "email": f"flowtest_{test_id}@kvitt.com",
            "name": f"Flow Test User {test_id}"
        }
        success, user_data = self.run_test("Flow: Create User", "POST", "auth/sync-user", 200, sync_data, auth=False)
        if success:
            self.user_id = user_data.get('user_id')
        else:
            flow_success = False
        
        # 2. Create a group
        if flow_success:
            group_data = {
                "name": f"Flow Test Group {test_id}",
                "description": "Complete flow test group",
                "default_buy_in": 20.0,
                "chips_per_buy_in": 20
            }
            success, response = self.run_test("Flow: Create Group", "POST", "groups", 200, group_data)
            if success:
                self.group_id = response.get('group_id')
            else:
                flow_success = False
        
        # 3. Create a game in the group
        if flow_success and self.group_id:
            game_data = {
                "group_id": self.group_id,
                "title": "Flow Test Game",
                "buy_in_amount": 20.0,
                "chips_per_buy_in": 20
            }
            success, response = self.run_test("Flow: Create Game", "POST", "games", 200, game_data)
            if success:
                self.game_id = response.get('game_id')
            else:
                flow_success = False
        
        # 4. Start the game
        if flow_success and self.game_id:
            success, _ = self.run_test("Flow: Start Game", "POST", f"games/{self.game_id}/start", 200)
            if not success:
                flow_success = False
        
        # 5. Add buy-in
        if flow_success and self.game_id:
            buy_in_data = {"user_id": self.user_id, "amount": 20.0}
            success, _ = self.run_test("Flow: Add Buy-In", "POST", f"games/{self.game_id}/admin-buy-in", 200, buy_in_data)
            if not success:
                flow_success = False
        
        # 6. Request cash-out
        if flow_success and self.game_id:
            cash_out_data = {"chips_count": 25}  # Winning scenario
            success, _ = self.run_test("Flow: Request Cash-Out", "POST", f"games/{self.game_id}/request-cash-out", 200, cash_out_data)
            if not success:
                flow_success = False
        
        # 7. Generate settlement
        if flow_success and self.game_id:
            success, _ = self.run_test("Flow: Generate Settlement", "POST", f"games/{self.game_id}/settlement", 200)
            if not success:
                flow_success = False
        
        print(f"\n🎯 Complete Flow Test: {'✅ PASSED' if flow_success else '❌ FAILED'}")
        return flow_success
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Kvitt Poker Game Ledger API Test Suite")
        print(f"🔗 Testing against: {self.base_url}")
        
        start_time = datetime.now()
        
        try:
            # Individual component tests
            health_ok = self.test_health_check()
            auth_ok = self.test_auth_flow()
            groups_ok = self.test_groups_api()
            games_ok = self.test_games_api()
            transactions_ok = self.test_buy_in_cash_out()
            settlement_ok = self.test_settlement()
            notifications_ok = self.test_notifications()
            
            # Complete flow test
            flow_ok = self.run_complete_flow_test()
            
        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error: {e}")
        
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
        
        # Component status
        print("\n📋 Component Status:")
        print(f"   Health Check: {'✅' if health_ok else '❌'}")
        print(f"   Auth Flow: {'✅' if auth_ok else '❌'}")
        print(f"   Groups API: {'✅' if groups_ok else '❌'}")
        print(f"   Games API: {'✅' if games_ok else '❌'}")
        print(f"   Transactions: {'✅' if transactions_ok else '❌'}")
        print(f"   Settlement: {'✅' if settlement_ok else '❌'}")
        print(f"   Notifications: {'✅' if notifications_ok else '❌'}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️ Some tests failed")
            return 1

def main():
    """Main test runner"""
    tester = KvittAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())