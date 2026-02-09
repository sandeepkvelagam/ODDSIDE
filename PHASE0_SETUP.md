# Phase 0 Mobile App - Critical Setup

## ⚠️ MUST DO: Configure Supabase JWT Secret

The Socket.IO auth fix **requires** the backend to verify JWT tokens. This means you MUST configure the JWT secret.

### Steps:

1. **Get your Supabase JWT Secret:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings > API
   - Under "JWT Settings", copy the **JWT Secret** (starts with a long string of characters)

2. **Update Backend Environment:**

   Edit `/app/backend/.env`:
   ```bash
   SUPABASE_JWT_SECRET=your-actual-jwt-secret-here
   ```

3. **Restart Backend:**
   ```bash
   cd /app/backend
   # Kill existing process and restart
   python server.py
   ```

4. **Verify:**
   - Backend logs should NOT show "SUPABASE_JWT_SECRET not configured"
   - Socket connections should succeed with "User {id} connected"

## Quick Test

After setup, run the mobile app:

```bash
cd /app/mobile
npm start
```

Login and check the TestScreen:
- ✅ API Connection: Should show group count
- ✅ Socket.IO: Should show "Connected ({socket_id})"

If Socket.IO shows an error, check backend logs for JWT verification failures.

## What Changed (Backend Security Fix)

**Before:** Clients could fake `user_id` - security hole
**After:** Backend verifies JWT, extracts real `user_id` from token

This fix applies to **both web and mobile** apps, making Socket.IO authentication secure.

## Files Modified

### Mobile App (Created):
- `/app/mobile/` - Complete Expo app
- Supabase client with SecureStore
- API client with auth interceptor
- Socket.IO client with JWT auth
- LoginScreen + TestScreen
- Deep linking configured

### Backend (Security Fix):
- `/app/backend/websocket_manager.py`
  - Now verifies JWT on `connect` event
  - Rejects connections without valid tokens
  - Tracks sid → user_id mapping securely

## 48-Hour Checklist

- [ ] Configure `SUPABASE_JWT_SECRET` in backend
- [ ] Start mobile app (`npm start`)
- [ ] Login with test account
- [ ] Verify all ✅ on TestScreen:
  - [ ] Authentication: Shows email
  - [ ] API: Shows group count
  - [ ] Socket.IO: Shows connected
  - [ ] Deep Link: Test `oddside://test`

If any test fails, see `mobile/README.md` troubleshooting section.
