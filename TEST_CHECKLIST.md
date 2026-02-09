# Mobile App Test Checklist

**Date:** _______________
**Tester:** _______________
**Environment:** iOS Simulator / Android Emulator / Physical Device (circle one)
**Device/OS:** _______________

---

## Pre-Test Setup

- [ ] Backend running (`cd /app/backend && python server.py`)
- [ ] MongoDB indexes created (`python create_indexes.py`)
- [ ] Mobile dependencies installed (`cd /app/mobile && npm install`)
- [ ] App running on device/simulator (`npx expo start`)
- [ ] Test account created: `_______________@example.com`

---

## Basic Functionality Check (5 minutes)

- [ ] **Login** - Can login with test account
- [ ] **Groups Screen** - See list of groups
- [ ] **GroupHub Screen** - Tap group → see members + games
- [ ] **GameNight Screen** - Tap game → see players + socket status
- [ ] **Socket Connected** - Status shows "✅ Connected"

**If any fail, stop here and debug.**

---

## Runtime Validation Tests

### Test A: Cold Start Persistence
**Time:** 2 minutes
**Status:** ⬜ PASS | ⬜ FAIL | ⬜ SKIP

**Steps:**
1. [ ] Login to app
2. [ ] Navigate to Groups screen
3. [ ] Kill app completely (swipe away)
4. [ ] Reopen app

**Result:**
- [ ] ✅ Opens directly to Groups screen (not login)
- [ ] ✅ Groups load successfully
- [ ] ✅ No errors

**Notes:**
```


```

---

### Test B: Token Refresh
**Time:** 45-60 minutes
**Status:** ⬜ PASS | ⬜ FAIL | ⬜ SKIP

**Steps:**
1. [ ] Login to app
2. [ ] Leave app OPEN for 45-60 minutes
3. [ ] After waiting, pull to refresh on Groups screen
4. [ ] Try navigating to a group

**Result:**
- [ ] ✅ API calls succeed
- [ ] ✅ No "Session expired" errors
- [ ] ✅ App remains functional

**Notes:**
```


```

---

### Test C: Background/Foreground Reconnection
**Time:** 3 minutes
**Status:** ⬜ PASS | ⬜ FAIL | ⬜ SKIP

**Steps:**
1. [ ] Login and open GameNightScreen
2. [ ] Verify socket shows "✅ Connected"
3. [ ] Background app (home button) for 60 seconds
4. [ ] Foreground app (reopen)

**Result:**
- [ ] ✅ Socket shows "⏳ Reconnecting..." briefly
- [ ] ✅ Then shows "✅ Connected"
- [ ] ✅ Game state refreshes automatically
- [ ] ✅ No errors

**Notes:**
```


```

---

### Test D: Network Drop Recovery
**Time:** 3 minutes
**Status:** ⬜ PASS | ⬜ FAIL | ⬜ SKIP

**Steps:**
1. [ ] Login and open GameNightScreen
2. [ ] Verify socket shows "✅ Connected"
3. [ ] Turn off Wi-Fi (airplane mode)
4. [ ] Wait 20 seconds (socket should disconnect)
5. [ ] Turn Wi-Fi back on

**Result:**
- [ ] ✅ Socket auto-reconnects
- [ ] ✅ Game state resyncs automatically
- [ ] ✅ No manual refresh needed

**Notes:**
```


```

---

### Test E: join_game Authorization
**Time:** 5 minutes (+ setup time)
**Status:** ⬜ PASS | ⬜ FAIL | ⬜ SKIP

**Setup:**
1. [ ] Create User A: `testa@example.com`
2. [ ] User A creates group "Private Group"
3. [ ] User A creates game in that group
4. [ ] Note game ID: `_______________`
5. [ ] Logout User A

**Steps:**
1. [ ] Login as User B: `testb@example.com`
2. [ ] Try to open User A's game (game ID: `_______________`)
3. [ ] Check error message

**Result:**
- [ ] ✅ Error shown: "Not authorized to join this game"
- [ ] ✅ User B cannot see game data
- [ ] ✅ Backend logs show authorization failure

**Notes:**
```


```

---

## Additional Checks

### Error Handling
- [ ] **Friendly errors** - Login with wrong password shows "Incorrect email or password" (not raw error)
- [ ] **Network errors** - Turn off Wi-Fi during API call shows friendly message
- [ ] **Server errors** - Simulate 500 error shows "Server error. Try again in a moment."

### UX Polish
- [ ] **AuthLoadingScreen** - After login, see logo animation for ~2 seconds
- [ ] **Pull to refresh** - Works on Groups screen
- [ ] **Loading states** - Shows spinner while loading data
- [ ] **Reconnecting banner** - Shows yellow banner when socket disconnects

### Navigation
- [ ] **Groups → GroupHub** - Tap group navigates correctly
- [ ] **GroupHub → GameNight** - Tap game navigates correctly
- [ ] **Back button** - Works on all screens
- [ ] **Deep linking** - `kvitt://game/{gameId}` works (optional)

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| A - Cold Start | ⬜ PASS / ⬜ FAIL | |
| B - Token Refresh | ⬜ PASS / ⬜ FAIL | |
| C - Background/Foreground | ⬜ PASS / ⬜ FAIL | |
| D - Network Drop | ⬜ PASS / ⬜ FAIL | |
| E - Authorization | ⬜ PASS / ⬜ FAIL | |

**Overall Status:** ⬜ ALL PASS | ⬜ SOME FAIL

---

## Issues Found

**Issue #1:**
- **Test:** _______________
- **Symptom:** _______________
- **Error logs:**
```


```

**Issue #2:**
- **Test:** _______________
- **Symptom:** _______________
- **Error logs:**
```


```

---

## Next Steps

✅ **If all tests pass:**
- [ ] Document test results
- [ ] Mark Phase 0 as complete
- [ ] Proceed to buy-in/cash-out actions

❌ **If any test fails:**
- [ ] Document which test failed
- [ ] Collect error logs (console + backend)
- [ ] Debug before proceeding

---

## Sign-off

**Tests completed by:** _______________
**Date:** _______________
**Approved for production:** ⬜ YES | ⬜ NO (needs fixes)

**Comments:**
```



```
