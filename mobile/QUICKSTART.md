# Kvitt Mobile - Quick Start

## 1. Configure Environment

Create `/app/mobile/.env`:

```bash
# Supabase (from frontend/.env)
EXPO_PUBLIC_SUPABASE_URL=https://hbqngvptbuvocjrozcgw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_7QRLcLUP1gucdsenXw780w_FMrmmQw0

# Backend API
EXPO_PUBLIC_API_URL=https://glass-ui-refactor.preview.emergentagent.com/api
EXPO_PUBLIC_SOCKET_URL=https://glass-ui-refactor.preview.emergentagent.com
```

## 2. Install & Run

```bash
npm install
npm start

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator  
# - Scan QR with Expo Go on device
```

## 3. Test Phase 0

Login and check TestScreen shows all ✅:
- Authentication: Your email
- API Connection: X groups fetched
- Socket.IO: Connected (socket_id)
- Deep Link: `kvitt://test`

## Troubleshooting

### Backend not configured?

Backend needs `SUPABASE_URL` in `/app/backend/.env`:
```bash
SUPABASE_URL="https://hbqngvptbuvocjrozcgw.supabase.co"
```

Then restart: `cd /app/backend && python server.py`

### Socket.IO fails?

Check backend logs for:
```
✅ JWKS client initialized: https://...
```

If missing, SUPABASE_URL is not set.

---

**Phase 0 validates architecture before building screens.**

See `README.md` for full docs.
