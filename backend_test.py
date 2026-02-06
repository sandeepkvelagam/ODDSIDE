#!/usr/bin/env python3
"""
PokerNight Backend API Testing Suite
Tests all major API endpoints with authentication
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PokerNightAPITester:
    def __init__(self, base_url: str = "https://chip-master-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1770331407571"  # From auth setup
        self.user_id = "test-user-1770331407571"
        self.tests_run = 0
        self.tests_passed = 0
        self.group_id = None
        self.game_id = None
        
    def get_headers(self) -> Dict[str, str]:
        """Get headers with auth token"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
    
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, auth: bool = True) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('/') else f"{self.base_url}{endpoint}"
        headers = self.get_headers() if auth else {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
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
    
    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n" + "="*50)
        print("TESTING BASIC ENDPOINTS")
        print("="*50)
        
        # Test root endpoint
        success, _ = self.run_test("Root API", "GET", "", 200, auth=False)
        
        # Test auth endpoint
        success, user_data = self.run_test("Auth Me", "GET", "auth/me", 200)
        if success:
            print(f"   Authenticated as: {user_data.get('name', 'Unknown')}")
    
    def test_group_management(self):
        """Test group creation and management"""
        print("\n" + "="*50)
        print("TESTING GROUP MANAGEMENT")
        print("="*50)
        
        # Create group
        group_data = {
            "name": "Test Poker Group",
            "description": "Test group for API testing",
            "default_buy_in": 25.0,
            "currency": "USD"
        }
        success, response = self.run_test("Create Group", "POST", "groups", 200, group_data)
        if success and 'group_id' in response:
            self.group_id = response['group_id']
            print(f"   Created group: {self.group_id}")
        
        # Get groups
        success, groups = self.run_test("Get Groups", "GET", "groups", 200)
        if success:
            print(f"   Found {len(groups)} groups")
        
        # Get specific group (if we have one)
        if self.group_id:
            success, group = self.run_test("Get Group Details", "GET", f"groups/{self.group_id}", 200)
    
    def test_game_management(self):
        """Test game creation and management"""
        print("\n" + "="*50)
        print("TESTING GAME MANAGEMENT")
        print("="*50)
        
        if not self.group_id:
            print("❌ Skipping game tests - no group available")
            return
        
        # Create game
        game_data = {
            "group_id": self.group_id,
            "title": "Test Game Night",
            "scheduled_at": None  # Start immediately
        }
        success, response = self.run_test("Create Game", "POST", "games", 200, game_data)
        if success and 'game_id' in response:
            self.game_id = response['game_id']
            print(f"   Created game: {self.game_id}")
        
        # Get games
        success, games = self.run_test("Get Games", "GET", "games", 200)
        if success:
            print(f"   Found {len(games)} games")
        
        # Get specific game
        if self.game_id:
            success, game = self.run_test("Get Game Details", "GET", f"games/{self.game_id}", 200)
    
    def test_game_transactions(self):
        """Test buy-in and cash-out functionality"""
        print("\n" + "="*50)
        print("TESTING GAME TRANSACTIONS")
        print("="*50)
        
        if not self.game_id:
            print("❌ Skipping transaction tests - no game available")
            return
        
        # Test buy-in
        buy_in_data = {"amount": 50.0}
        success, response = self.run_test("Buy-in", "POST", f"games/{self.game_id}/buy-in", 200, buy_in_data)
        
        # Test another buy-in
        buy_in_data2 = {"amount": 25.0}
        success, response = self.run_test("Second Buy-in", "POST", f"games/{self.game_id}/buy-in", 200, buy_in_data2)
        
        # Test cash-out
        cash_out_data = {"amount": 90.0}
        success, response = self.run_test("Cash-out", "POST", f"games/{self.game_id}/cash-out", 200, cash_out_data)
        if success:
            print(f"   Net result: ${response.get('net_result', 0)}")
    
    def test_settlement(self):
        """Test settlement generation"""
        print("\n" + "="*50)
        print("TESTING SETTLEMENT")
        print("="*50)
        
        if not self.game_id:
            print("❌ Skipping settlement tests - no game available")
            return
        
        # End game first
        success, _ = self.run_test("End Game", "POST", f"games/{self.game_id}/end", 200)
        
        # Generate settlement
        success, settlements = self.run_test("Generate Settlement", "POST", f"games/{self.game_id}/settle", 200)
        if success:
            print(f"   Generated {len(settlements.get('settlements', []))} settlement entries")
        
        # Get settlement details
        success, settlement_data = self.run_test("Get Settlement", "GET", f"games/{self.game_id}/settlement", 200)
    
    def test_stats_and_notifications(self):
        """Test stats and notifications"""
        print("\n" + "="*50)
        print("TESTING STATS & NOTIFICATIONS")
        print("="*50)
        
        # Get personal stats
        success, stats = self.run_test("Personal Stats", "GET", "stats/me", 200)
        if success:
            print(f"   Total games: {stats.get('total_games', 0)}")
            print(f"   Net profit: ${stats.get('net_profit', 0)}")
        
        # Get notifications
        success, notifications = self.run_test("Notifications", "GET", "notifications", 200)
        if success:
            print(f"   Found {len(notifications)} notifications")
        
        # Get ledger balances
        success, balances = self.run_test("Ledger Balances", "GET", "ledger/balances", 200)
        if success:
            print(f"   Net balance: ${balances.get('net_balance', 0)}")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting PokerNight API Test Suite")
        print(f"🔗 Testing against: {self.base_url}")
        print(f"🔑 Using session token: {self.session_token[:20]}...")
        
        start_time = datetime.now()
        
        try:
            self.test_basic_endpoints()
            self.test_group_management()
            self.test_game_management()
            self.test_game_transactions()
            self.test_settlement()
            self.test_stats_and_notifications()
            
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
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️ Some tests failed")
            return 1

def main():
    """Main test runner"""
    tester = PokerNightAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())