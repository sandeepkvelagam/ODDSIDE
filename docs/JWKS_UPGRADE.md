# Supabase JWKS Upgrade - No Secret Needed! ✅

## Problem Solved

Your Supabase project uses **new JWT Signing Keys (RS256)**, not the old shared secret method. You were looking for a "JWT Secret" that doesn't exist anymore.

## What Changed in Your Backend

### Old Method (HS256 - Symmetric)
```python
# Required a shared secret string
SUPABASE_JWT_SECRET = "long-secret-string"
jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
```

**Problem:** You don't have this secret because your project uses the new method.

### New Method (RS256 - Asymmetric) ✅
```python
# Automatically fetches public keys from Supabase
jwks_url = "https://your-project.supabase.co/auth/v1/jwks"
jwks_client = PyJWKClient(jwks_url)

# Verify with public key (no secret needed!)
signing_key = jwks_client.get_signing_key_from_jwt(token)
jwt.decode(token, signing_key.key, algorithms=["RS256"])
```

**Benefits:**
- ✅ No secret to manage
- ✅ Automatic key rotation
- ✅ More secure (asymmetric crypto)
- ✅ Can't be compromised if keys leak

---

## Backend Changes Made

### 1. Updated Files

**`/app/backend/server.py`**
- Added `from jwt import PyJWKClient`
- Added `SUPABASE_URL` env var
- Initialized JWKS client
- Updated `verify_supabase_jwt()` to try JWKS first, then legacy secret

**`/app/backend/websocket_manager.py`**
- Same updates as server.py
- Socket.IO auth now verifies JWT properly

**`/app/backend/.env`**
- Added: `SUPABASE_URL="https://hbqngvptbuvocjrozcgw.supabase.co"`

**`/app/backend/requirements.txt`**
- Updated: `PyJWT==2.11.0` (with crypto support)
- Added: `python-jose==3.5.0`

### 2. How It Works Now

**REST API Auth:**
```
Mobile App → Sends JWT in Authorization header
            ↓
Backend    → Fetches public key from Supabase JWKS endpoint
            → Verifies JWT signature with public key
            → Extracts user_id from "sub" claim
            → Returns user data
```

**Socket.IO Auth:**
```
Mobile App → Connects with { auth: { token: jwt } }
            ↓
Backend    → Verifies JWT using JWKS
            → Accepts/rejects connection
            → Maps socket ID to verified user_id
```

---

## Testing

### Check Backend Logs

After restarting backend, you should see:
```
✅ JWKS client initialized: https://hbqngvptbuvocjrozcgw.supabase.co/auth/v1/jwks
```

### Test JWKS Endpoint

```bash
curl https://hbqngvptbuvocjrozcgw.supabase.co/auth/v1/jwks
```

Should return:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "...",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### Verify Mobile App Auth

1. Login on mobile app
2. Check backend logs for:
   ```
   JWT verified using JWKS (RS256)
   ✅ User abc123... connected (sid: xyz)
   ```

---

## Fallback Support

The code still supports **legacy HS256** if you ever need it:

```python
async def verify_supabase_jwt(token: str) -> dict:
    # Try JWKS first (RS256)
    if jwks_client:
        # ... verify with public key

    # Fallback to legacy secret (HS256)
    if SUPABASE_JWT_SECRET:
        # ... verify with shared secret
```

This means:
- ✅ Works with new JWKS (RS256) - **your project**
- ✅ Still works with legacy secret (HS256) - if you ever need it

---

## Why This Matters

### Security Improvement

**Before (user_id spoofing):**
```python
# websocket_manager.py - OLD
user_id = auth.get('user_id')  # ❌ Trust client input
```
Client could send `{ user_id: "anyone" }` and impersonate users.

**After (cryptographic verification):**
```python
# websocket_manager.py - NEW
payload = await verify_supabase_jwt(token)  # ✅ Verify signature
user_id = payload.get("sub")  # Extract verified user_id
```
Impossible to fake without Supabase's private key.

### Key Rotation

With JWKS:
- Supabase can rotate keys anytime (for security)
- Your backend auto-fetches new public keys
- No manual intervention needed

With legacy secret:
- Rotating requires updating `SUPABASE_JWT_SECRET` in all servers
- Downtime or invalid tokens during rotation

---

## Summary

**What you were looking for:** JWT Secret string
**What you actually need:** Nothing! JWKS auto-fetches public keys

**Phase 0 Status:**
- ✅ Backend configured with JWKS
- ✅ Mobile app ready to test
- ✅ No manual secret management needed

**Next:** Run mobile app and verify TestScreen shows all ✅
