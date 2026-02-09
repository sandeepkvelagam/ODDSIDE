# Mobile App Testing Guide for Emergent

## What Was Built

### Mobile App (React Native + Expo)
**Location:** `/app/mobile/`

**3 Production Screens:**
1. **GroupsScreen** - Lists all user groups with pull-to-refresh
2. **GroupHubScreen** - Shows group members and games
3. **GameNightScreen** - Real-time game view with Socket.IO (most critical screen)

**Security & Hardening:**
- JWT authentication with SecureStore (iOS Keychain / Android Keystore)
- JWKS verification with 12h cache + clean refresh on unknown kid
- Socket.IO auth with join_game authorization (group membership check)
- Resync throttling: 750ms max, in-flight lock, last-write wins
- AppState handling: reconnect + resync on foreground
- Friendly error mapping (no raw error messages to users)
- AuthLoadingScreen with 2s animation + data preload

**Backend Updates:**
- Fixed web socket security hole (JWT token instead of user_id)
- MongoDB indexes for O(1) auth query performance

---

## Prerequisites for Testing

### You CANNOT Test With:
- ❌ Browser (React Native doesn't run in browsers)
- ❌ Expo Go in cloud (requires physical device or emulator)

### You MUST Test With:
- ✅ **iOS Simulator** (macOS only) - Recommended
- ✅ **Android Emulator** (any OS) - Recommended
- ✅ **Physical device** (iOS/Android with Expo Go app)

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd /app/mobile
npm install
```

### 2. Start Backend (Required)

```bash
cd /app/backend
source venv/bin/activate  # or however your venv is set up
python server.py
```

Backend should be running on `http://localhost:8000`

### 3. Create MongoDB Indexes (One-time setup)

```bash
cd /app/backend
python create_indexes.py
```

**Expected output:**
```
Creating indexes for database: oddside
✅ Created index: group_members(group_id, user_id, status)
✅ Created index: players(game_id, user_id)
✅ Created index: game_nights(group_id)
✅ Created index: game_nights(status, created_at)
✅ Created index: users(supabase_id) UNIQUE
✅ All indexes created successfully
```

**If you get errors** about missing packages:
```bash
pip install motor python-dotenv
```

### 4. Configure Environment Variables

Ensure `/app/mobile/.env` exists with:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=https://hbqngvptbuvocjrozcgw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicW5ndnB0YnV2b2Nqcm96Y2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MjEwNjAsImV4cCI6MjA1MDA5NzA2MH0.FIBa7f-mwTHD3g8gkYWUa6S3Vsy7i6H88GJQMdDNvVo
```

**⚠️ IMPORTANT:** If testing on a physical device, change `localhost` to your computer's local IP:
```
EXPO_PUBLIC_API_URL=http://192.168.1.xxx:8000
```

Find your IP:
- macOS: `ifconfig | grep inet`
- Linux: `ip addr show`
- Windows: `ipconfig`

---

## Running the App

### Option A: iOS Simulator (macOS only)

```bash
cd /app/mobile
npx expo start
# Press 'i' to open iOS simulator
```

### Option B: Android Emulator

```bash
cd /app/mobile
npx expo start
# Press 'a' to open Android emulator
```

**If emulator isn't running:**
```bash
# Start Android emulator first
~/Library/Android/sdk/emulator/emulator -avd <your-avd-name> &
```

### Option C: Physical Device

```bash
cd /app/mobile
npx expo start
# Scan QR code with Expo Go app (iOS) or Camera app (Android)
```

---

## Runtime Validation Tests

### Test A: Cold Start Persistence ✅

**What it validates:** Auth tokens persist after killing the app

**Steps:**
1. Login to the app with test credentials
2. Navigate to Groups screen (verify you see groups)
3. **Kill the app** (swipe away, don't just background)
4. Reopen the app

**Expected result:** ✅ PASS
- App opens directly to Groups screen (not login)
- Groups load successfully
- No "Session expired" error

**Failure symptoms:**
- Kicked back to login screen
- Empty groups list
- 401 errors in console

---

### Test B: Token Refresh ✅

**What it validates:** JWT tokens refresh automatically before expiry

**Steps:**
1. Login to the app
2. Navigate to Groups screen
3. **Leave app open (don't close)** for 45-60 minutes
4. After waiting, try to:
   - Pull to refresh on Groups screen
   - Navigate to a group
   - Open a game

**Expected result:** ✅ PASS
- All API calls succeed
- No "Session expired" errors
- App remains functional

**Failure symptoms:**
- 401 Unauthorized errors
- Forced logout
- "Session expired" alerts

**Note:** This is a long test. You can shorten validation by checking token expiry in logs:
```javascript
// In AuthContext.tsx, add logging:
console.log('Token expires at:', session?.expires_at);
```

---

### Test C: Background/Foreground Reconnection ✅

**What it validates:** Socket reconnects + resyncs when app returns to foreground

**Steps:**
1. Login and open a game (GameNightScreen)
2. Verify socket status shows "✅ Connected"
3. **Background the app** (home button, don't kill it)
4. Wait 60 seconds
5. **Foreground the app** (open it again)

**Expected result:** ✅ PASS
- Socket status shows "⏳ Reconnecting..." briefly
- Then changes to "✅ Connected"
- Game state refreshes (you see updated data)
- No errors in console

**Failure symptoms:**
- Socket stays "❌ Disconnected"
- Stale data (doesn't refresh)
- "Failed to sync game state" error

---

### Test D: Network Drop Recovery ✅

**What it validates:** App recovers from temporary network loss

**Steps:**
1. Login and open a game (GameNightScreen)
2. Verify socket shows "✅ Connected"
3. **Turn off Wi-Fi** (device settings or airplane mode)
4. Wait 20 seconds (socket should show "❌ Disconnected")
5. **Turn Wi-Fi back on**

**Expected result:** ✅ PASS
- Socket auto-reconnects (shows "⏳ Reconnecting..." then "✅ Connected")
- Game state resyncs automatically
- No manual refresh needed

**Failure symptoms:**
- Socket stays disconnected
- Need to manually refresh
- App becomes unusable until restart

---

### Test E: join_game Authorization ✅

**What it validates:** Users can't join games they don't have access to

**Setup:**
1. Create 2 test accounts:
   - User A: `testa@example.com` / `password123`
   - User B: `testb@example.com` / `password123`
2. Using User A account:
   - Create a group "Private Group"
   - Create a game in that group
   - Note the game ID (visible in URL or logs)
3. Logout User A

**Test Steps:**
1. Login as User B
2. Manually navigate to User A's game:
   ```
   You'll need to trigger navigation programmatically OR
   use deep link: kvitt://game/{gameId}
   ```
3. Open the game

**Expected result:** ✅ PASS
- Socket join_game fails with error
- Error message: "join_game failed: Not authorized to join this game"
- User B cannot see game data

**Failure symptoms:**
- User B can see User A's private game data
- No authorization error
- Socket joins successfully

**Alternative test (easier):**
- Check backend logs when User B tries to join:
```python
# In websocket_manager.py, you should see:
# "User {user_b_id} not authorized for game {game_id}"
```

---

## Test Results Template

After running all tests, fill this out:

```
Mobile App Runtime Validation Results
Date: ___________
Tester: ___________

[ ] Test A - Cold Start Persistence
    Status: PASS / FAIL
    Notes:

[ ] Test B - Token Refresh (45-60 min)
    Status: PASS / FAIL
    Notes:

[ ] Test C - Background/Foreground
    Status: PASS / FAIL
    Notes:

[ ] Test D - Network Drop Recovery
    Status: PASS / FAIL
    Notes:

[ ] Test E - join_game Authorization
    Status: PASS / FAIL
    Notes:

[ ] MongoDB Indexes Created
    Status: YES / NO
    Notes:
```

---

## Debugging Tips

### View Logs

**Expo logs:**
```bash
cd /app/mobile
npx expo start
# Logs appear in terminal automatically
```

**Backend logs:**
```bash
# Terminal where backend is running
# Look for:
# - "User {user_id} authenticated via JWT" (auth success)
# - "join_game: User authorized" (socket auth success)
# - "join_game: Not authorized" (socket auth failure)
```

**Supabase logs:**
- Go to Supabase dashboard → Auth → Logs
- Check for token refresh events

### Common Issues

**"Network request failed"**
- Backend not running: `cd /app/backend && python server.py`
- Wrong API_URL: Check `.env` file, use local IP if on device
- Firewall blocking: Allow port 8000

**"Unable to resolve host"**
- Backend URL has typo
- Device not on same network as computer (for physical device testing)

**Socket stays disconnected**
- Backend websocket not running
- Check backend logs for errors
- Verify `SUPABASE_URL` and `SUPABASE_JWT_SECRET` in backend `.env`

**Login shows generic "Login failed"**
- Check if friendly error mapping is working
- Look at raw error in console logs
- Common issue: Supabase credentials wrong

---

## What Comes Next (After Tests Pass)

✅ **If all tests pass:**
- ✅ Architecture validated
- ✅ Security hardened
- ✅ Scalability safeguards in place
- **NEXT STEP:** Build buy-in/cash-out actions with idempotency

❌ **If any test fails:**
- Collect error logs (console + backend)
- Note which test failed and exact symptoms
- Debug before proceeding to actions

---

## Quick Test Script (Automated Check)

If you want to verify basic functionality without full manual testing:

```bash
# 1. Start backend
cd /app/backend && python server.py &

# 2. Verify indexes exist
cd /app/backend && python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
async def check():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.getenv('DB_NAME', 'oddside')]
    indexes = await db.group_members.list_indexes().to_list(None)
    print('✅ group_members indexes:', [idx['name'] for idx in indexes])
    client.close()

asyncio.run(check())
"

# 3. Start mobile app
cd /app/mobile && npx expo start
```

---

## Test User Accounts

If you need test accounts with existing data:

**Create via mobile app:** Use signup screen
**OR create via Supabase dashboard:**
1. Go to Supabase → Authentication → Users
2. Add user: `test@example.com` / `password123`
3. Confirm email (bypass email verification)

**Test data setup:**
```bash
# Create a test group and game via API
curl -X POST http://localhost:8000/api/groups \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Group", "description": "For testing"}'
```

---

## Summary: What Makes This Production-Ready

✅ **Security:**
- JWT auth with RS256 (JWKS)
- Socket authorization (group membership check)
- Secure token storage (Keychain/Keystore)

✅ **Scalability:**
- MongoDB indexes on all auth queries (O(1) lookups)
- Resync throttling (750ms max, prevents API hammering)
- In-flight lock (prevents race conditions)

✅ **Reliability:**
- Auto-reconnect on network loss
- Background/foreground handling
- Last-write wins (request ID tracking)
- AppState listener cleanup (no memory leaks)

✅ **UX:**
- Friendly error messages (no raw errors)
- Loading states (pull-to-refresh)
- Reconnecting banner
- AuthLoadingScreen animation

**Remaining risk:** Mobile lifecycle edge cases (cold start, token refresh, background) - **MUST TEST ON DEVICE**

---

## File Checklist

Ensure these files exist before testing:

**Mobile App:**
- [ ] `/app/mobile/src/screens/GroupsScreen.tsx`
- [ ] `/app/mobile/src/screens/GroupHubScreen.tsx`
- [ ] `/app/mobile/src/screens/GameNightScreen.tsx`
- [ ] `/app/mobile/src/screens/AuthLoadingScreen.tsx`
- [ ] `/app/mobile/src/utils/errors.ts`
- [ ] `/app/mobile/src/api/groups.ts`
- [ ] `/app/mobile/src/api/games.ts`
- [ ] `/app/mobile/src/navigation/MainStack.tsx`

**Backend:**
- [ ] `/app/backend/create_indexes.py`
- [ ] `/app/backend/websocket_manager.py` (with JWKS + join_game auth)

**Documentation:**
- [ ] `/app/HARDENING_COMPLETE.md`
- [ ] `/app/TESTING_GUIDE.md` (this file)

---

## Contact for Issues

If tests fail or you encounter blockers:
- Provide full error logs (console + backend)
- Note which test failed (A, B, C, D, or E)
- Include device/simulator info (iOS 17, Android 13, etc.)
- Screenshot any error alerts

**Expected timeline:** Tests A, C, D, E can be done in 30 minutes. Test B requires 45-60 minute wait.
