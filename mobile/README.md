# ODDSIDE Mobile - Phase 0

React Native mobile app for ODDSIDE poker ledger.

## Phase 0 Goals

This is a **de-risking** implementation to validate the mobile architecture before building full screens:

1. ✅ Expo boots + Navigation works
2. ✅ Supabase login with SecureStore (session persistence)
3. ✅ Authenticated API calls via axios interceptor
4. ✅ Socket.IO connection with JWT auth
5. ✅ Deep linking support (`oddside://`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_SOCKET_URL` - Backend Socket.IO URL

### 3. Backend Configuration (CRITICAL)

⚠️ **The backend MUST have `SUPABASE_JWT_SECRET` configured for Socket.IO auth to work.**

Get your JWT secret from Supabase:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "JWT Secret" (not the anon key)
4. Add it to `/app/backend/.env`:

```
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

Without this, Socket.IO connections will be rejected.

### 4. Run the App

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

## Testing Phase 0

1. **Login**: Create an account or sign in
2. **TestScreen**: Automatically runs tests and displays status board
3. **Check Results**:
   - ✅ Authentication: Shows your email
   - ✅ API Connection: Shows number of groups fetched
   - ✅ Socket.IO: Shows connection status and last event
   - ✅ Deep Linking: Test with `oddside://test`

## Architecture

### Secure Token Storage

We use **SecureStore** (iOS Keychain / Android Keystore) for storing Supabase session tokens:

```typescript
// src/lib/supabase.ts
const storage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
```

### Authenticated API Calls

Axios interceptor automatically adds auth token:

```typescript
// src/api/client.ts
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  config.headers.Authorization = `Bearer ${data.session?.access_token}`;
  return config;
});
```

### Socket.IO with JWT Auth

Backend verifies JWT on connection (security fix):

```typescript
// Mobile client
const socket = io(url, {
  auth: { token: session.access_token },
  transports: ["websocket"],
});
```

```python
# Backend verification
@sio.event
async def connect(sid, environ, auth):
    token = auth.get('token')
    payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
    # ... verify and allow connection
```

## Next Steps

After Phase 0 validation:
- [ ] Create shared-core package for business logic reuse
- [ ] Implement core screens (Dashboard, Groups, GameNight, Settlement)
- [ ] Add push notifications
- [ ] Platform-specific features
- [ ] App Store / Play Store submission

## Troubleshooting

### Socket.IO connection fails

1. Check backend logs for JWT verification errors
2. Ensure `SUPABASE_JWT_SECRET` is set in backend `.env`
3. Verify token is being passed correctly in `auth` object

### API calls return 401

1. Check if user is logged in
2. Verify Supabase session is valid
3. Check axios interceptor is adding Authorization header

### Deep links don't work

1. For iOS simulator: `xcrun simctl openurl booted oddside://test`
2. For Android: `adb shell am start -W -a android.intent.action.VIEW -d "oddside://test"`
3. Verify `scheme: "oddside"` is in `app.json`
