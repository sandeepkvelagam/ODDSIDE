#!/usr/bin/env python3
"""
Focused test for the specific NEW endpoints mentioned in the review request
"""

import requests
import json
import uuid

def test_specific_endpoints():
    base_url = "https://poker-app-upgrade.preview.emergentagent.com"
    test_id = str(uuid.uuid4())[:8]
    
    print("🚀 Testing Specific NEW Endpoints for Kvitt")
    print("="*60)
    
    # Step 1: Create user1 (host) via sync-user
    print("\n1. Creating host user...")
    sync_data1 = {
        "supabase_id": f"host_{test_id}",
        "email": f"host_{test_id}@kvitt.com",
        "name": f"Host User {test_id}"
    }
    response1 = requests.post(f"{base_url}/api/auth/sync-user", json=sync_data1)
    print(f"   Status: {response1.status_code}")
    user1_data = response1.json()
    user1_id = user1_data.get('user_id')
    cookies1 = response1.cookies
    
    # Step 2: Create user2 (player) via sync-user
    print("\n2. Creating player user...")
    sync_data2 = {
        "supabase_id": f"player_{test_id}",
        "email": f"player_{test_id}@kvitt.com",
        "name": f"Player User {test_id}"
    }
    response2 = requests.post(f"{base_url}/api/auth/sync-user", json=sync_data2)
    print(f"   Status: {response2.status_code}")
    user2_data = response2.json()
    user2_id = user2_data.get('user_id')
    cookies2 = response2.cookies
    
    # Step 3: Create a group with user1
    print("\n3. Creating group...")
    group_data = {
        "name": f"Test Group {test_id}",
        "default_buy_in": 20.0,
        "chips_per_buy_in": 20
    }
    response = requests.post(f"{base_url}/api/groups", json=group_data, cookies=cookies1)
    print(f"   Status: {response.status_code}")
    group_id = response.json().get('group_id')
    
    # Step 4: Invite user2 to group
    print("\n4. Inviting user2 to group...")
    invite_data = {"email": f"player_{test_id}@kvitt.com"}
    response = requests.post(f"{base_url}/api/groups/{group_id}/invite", json=invite_data, cookies=cookies1)
    print(f"   Status: {response.status_code}")
    
    # Step 5: Accept invite as user2
    print("\n5. Accepting group invite...")
    response = requests.get(f"{base_url}/api/users/invites", cookies=cookies2)
    invites = response.json()
    if invites:
        invite_id = invites[0]['invite_id']
        accept_data = {"accept": True}
        response = requests.post(f"{base_url}/api/users/invites/{invite_id}/respond", json=accept_data, cookies=cookies2)
        print(f"   Status: {response.status_code}")
    
    # Step 6: Create a game with user1
    print("\n6. Creating game...")
    game_data = {
        "group_id": group_id,
        "title": "Test Game",
        "buy_in_amount": 20.0,
        "chips_per_buy_in": 20
    }
    response = requests.post(f"{base_url}/api/games", json=game_data, cookies=cookies1)
    print(f"   Status: {response.status_code}")
    game_id = response.json().get('game_id')
    
    print(f"\n🎯 Testing NEW Endpoints with game_id: {game_id}")
    
    # NEW ENDPOINT 1: POST /api/games/{game_id}/join - Should create pending join request
    print("\n7. Testing JOIN GAME (should be pending)...")
    response = requests.post(f"{base_url}/api/games/{game_id}/join", cookies=cookies2)
    print(f"   Status: {response.status_code}")
    join_response = response.json()
    print(f"   Response: {join_response}")
    if join_response.get('status') == 'pending':
        print("   ✅ Join request correctly created as PENDING")
    else:
        print(f"   ❌ Expected 'pending', got '{join_response.get('status')}'")
    
    # NEW ENDPOINT 2: GET /api/notifications - Check if notifications are created
    print("\n8. Testing NOTIFICATIONS for host (should see join request)...")
    response = requests.get(f"{base_url}/api/notifications", cookies=cookies1)
    print(f"   Status: {response.status_code}")
    notifications = response.json()
    join_request_found = False
    for notif in notifications:
        if notif.get('type') == 'join_request':
            join_request_found = True
            print(f"   ✅ Found join_request notification: {notif.get('message')}")
            break
    if not join_request_found:
        print("   ❌ No join_request notification found")
    
    # NEW ENDPOINT 3: POST /api/games/{game_id}/approve-join - Host approves join
    print("\n9. Testing APPROVE JOIN...")
    approve_data = {"user_id": user2_id}
    response = requests.post(f"{base_url}/api/games/{game_id}/approve-join", json=approve_data, cookies=cookies1)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # NEW ENDPOINT 4: POST /api/games/{game_id}/reject-join - Test with another user
    print("\n10. Testing REJECT JOIN (creating new user)...")
    sync_data3 = {
        "supabase_id": f"reject_{test_id}",
        "email": f"reject_{test_id}@kvitt.com",
        "name": f"Reject User {test_id}"
    }
    response3 = requests.post(f"{base_url}/api/auth/sync-user", json=sync_data3)
    user3_id = response3.json().get('user_id')
    cookies3 = response3.cookies
    
    # Invite and accept for user3
    invite_data = {"email": f"reject_{test_id}@kvitt.com"}
    requests.post(f"{base_url}/api/groups/{group_id}/invite", json=invite_data, cookies=cookies1)
    invites_resp = requests.get(f"{base_url}/api/users/invites", cookies=cookies3)
    if invites_resp.json():
        invite_id = invites_resp.json()[0]['invite_id']
        requests.post(f"{base_url}/api/users/invites/{invite_id}/respond", json={"accept": True}, cookies=cookies3)
    
    # User3 requests to join
    requests.post(f"{base_url}/api/games/{game_id}/join", cookies=cookies3)
    
    # Host rejects
    reject_data = {"user_id": user3_id}
    response = requests.post(f"{base_url}/api/games/{game_id}/reject-join", json=reject_data, cookies=cookies1)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # NEW ENDPOINT 5: GET /api/games/{game_id}/available-players - Get group members not in game
    print("\n11. Testing GET AVAILABLE PLAYERS...")
    response = requests.get(f"{base_url}/api/games/{game_id}/available-players", cookies=cookies1)
    print(f"   Status: {response.status_code}")
    available = response.json()
    print(f"   Available players: {len(available)}")
    
    # NEW ENDPOINT 6: POST /api/games/{game_id}/add-player - Host adds player directly
    print("\n12. Testing ADD PLAYER DIRECTLY...")
    if available:
        add_data = {"user_id": available[0]['user_id']}
        response = requests.post(f"{base_url}/api/games/{game_id}/add-player", json=add_data, cookies=cookies1)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    else:
        print("   No available players to add")
    
    # NEW ENDPOINT 7: POST /api/games/{game_id}/request-buy-in - Player requests buy-in
    print("\n13. Testing REQUEST BUY-IN...")
    buy_in_data = {"amount": 20.0}
    response = requests.post(f"{base_url}/api/games/{game_id}/request-buy-in", json=buy_in_data, cookies=cookies2)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Check host notifications for buy-in request
    print("\n14. Testing NOTIFICATIONS for buy-in request...")
    response = requests.get(f"{base_url}/api/notifications", cookies=cookies1)
    notifications = response.json()
    buy_in_request_found = False
    for notif in notifications:
        if notif.get('type') == 'buy_in_request':
            buy_in_request_found = True
            print(f"   ✅ Found buy_in_request notification: {notif.get('message')}")
            break
    if not buy_in_request_found:
        print("   ❌ No buy_in_request notification found")
    
    # NEW ENDPOINT 8: POST /api/games/{game_id}/approve-buy-in - Host approves buy-in
    print("\n15. Testing APPROVE BUY-IN...")
    approve_buy_in_data = {"user_id": user2_id, "amount": 20.0}
    response = requests.post(f"{base_url}/api/games/{game_id}/approve-buy-in", json=approve_buy_in_data, cookies=cookies1)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Final check: Verify notification types
    print("\n16. Final NOTIFICATION TYPE CHECK...")
    response1 = requests.get(f"{base_url}/api/notifications", cookies=cookies1)
    response2 = requests.get(f"{base_url}/api/notifications", cookies=cookies2)
    
    all_notifications = response1.json() + response2.json()
    notification_types = set()
    for notif in all_notifications:
        notification_types.add(notif.get('type'))
    
    expected_types = ["join_request", "buy_in_request", "join_approved", "join_rejected"]
    found_types = [t for t in expected_types if t in notification_types]
    
    print(f"   Expected notification types: {expected_types}")
    print(f"   Found notification types: {list(notification_types)}")
    print(f"   ✅ Found {len(found_types)}/{len(expected_types)} expected types")
    
    print("\n🎉 NEW Endpoints Testing Complete!")
    return True

if __name__ == "__main__":
    test_specific_endpoints()