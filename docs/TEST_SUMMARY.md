# Test Summary for Emergent

## What We Built

### Mobile App (React Native + Expo)
- **3 screens:** Groups → GroupHub → GameNight (full navigation)
- **Real-time:** Socket.IO with JWT auth + reconnection handling
- **Hardened:** Resync throttling (750ms), error mapping, AppState handling
- **Security:** JWKS auth, join_game authorization, SecureStore for tokens

### Backend Updates
- Fixed web socket security (JWT instead of user_id)
- MongoDB indexes for scalability (O(1) auth queries)

## Quick Start (5 minutes)

### 1. Install & Setup
```bash
# Backend
cd /app/backend
python create_indexes.py  # One-time: creates MongoDB indexes

# Start backend
python server.py          # Keep running in one terminal

# Mobile
cd /app/mobile
npm install               # If first time
npx expo start            # Press 'i' for iOS or 'a' for Android
```

### 2. Verify Basic Functionality (5 min)
1. Login with test account
2. See groups list → tap a group
3. See games list → tap a game
4. See game screen with socket status "✅ Connected"

**If this works:** Basic functionality ✅

## Critical Tests (30 min + 60 min wait)

### Test A: Cold Start (2 min)
1. Login → see groups
2. **Kill app** (swipe away)
3. Reopen app

**PASS:** Opens to groups (not login)
**FAIL:** Forced to login again

---

### Test B: Token Refresh (60 min)
1. Login → leave app **open**
2. Wait 45-60 minutes
3. Pull to refresh

**PASS:** Still works, no errors
**FAIL:** "Session expired" error

---

### Test C: Background/Foreground (2 min)
1. Open game screen → socket "✅ Connected"
2. **Background app** 60 seconds
3. **Foreground app**

**PASS:** Reconnects, shows "✅ Connected"
**FAIL:** Stays "❌ Disconnected"

---

### Test D: Network Drop (2 min)
1. Open game → "✅ Connected"
2. **Turn off Wi-Fi** 20 seconds
3. **Turn on Wi-Fi**

**PASS:** Auto-reconnects
**FAIL:** Stays disconnected

---

### Test E: Authorization (5 min)
1. Create game as User A
2. Login as User B
3. Try to open User A's game

**PASS:** Error "Not authorized to join this game"
**FAIL:** User B sees User A's data

---

## If You Can't Test (No Device/Emulator)

**Minimum validation:**
```bash
# 1. Check MongoDB indexes exist
cd /app/backend
python create_indexes.py

# 2. Start backend and mobile build
cd /app/backend && python server.py &
cd /app/mobile && npm install && npx expo build:ios --release-channel production
```

**Then:** Send build to someone with iOS/Android device

---

## Expected Test Results

✅ **All tests pass:** Architecture validated, ready for buy-in/cash-out actions
❌ **Any test fails:** Need to debug before proceeding

---

## Files Modified/Created

### Mobile (Created)
- `/app/mobile/src/screens/GroupsScreen.tsx`
- `/app/mobile/src/screens/GroupHubScreen.tsx`
- `/app/mobile/src/screens/GameNightScreen.tsx`
- `/app/mobile/src/screens/AuthLoadingScreen.tsx`
- `/app/mobile/src/utils/errors.ts`
- `/app/mobile/src/api/groups.ts`
- `/app/mobile/src/api/games.ts`
- `/app/mobile/src/navigation/MainStack.tsx`

### Backend (Created/Modified)
- `/app/backend/create_indexes.py` (created)
- `/app/backend/websocket_manager.py` (modified - JWKS + auth)

### Docs (Created)
- `/app/HARDENING_COMPLETE.md` (full documentation)
- `/app/TESTING_GUIDE.md` (detailed test instructions)
- `/app/TEST_SUMMARY.md` (this file)

---

## Common Issues

**"Network request failed"**
→ Start backend: `cd /app/backend && python server.py`

**Socket won't connect**
→ Check backend logs for JWT errors

**Can't run on device**
→ Change `.env`: `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000`

---

## Next Steps After Testing

✅ **Tests pass:** Build buy-in/cash-out actions
❌ **Tests fail:** Share error logs + which test failed
