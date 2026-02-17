# Migration Plan: Emergent to AWS Lightsail + Supabase

## Context

The Kvitt backend on Emergent keeps failing with limited access to troubleshoot. This migration consolidates everything on **Supabase** (auth + database) with **AWS Lightsail** for compute. Benefits:
- Single platform for auth and database
- Built-in real-time subscriptions
- Row-Level Security (RLS) for authorization
- Mobile SDKs for iOS/Android
- Multi-region support for international launch

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         AWS Lightsail ($10/mo)                  │
│  ┌─────────────┐    ┌────────────────────────┐  │
│  │   Nginx     │───▶│  FastAPI + Socket.IO   │  │
│  │  (SSL/TLS)  │    │  (Uvicorn)             │  │
│  └─────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Supabase   │   │   Stripe     │   │   OpenAI     │
│ Auth + DB    │   │  Payments    │   │  Whisper/GPT │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## Part 1: Remove Emergent Dependencies

### 1.1 Files to Modify

| File | Line(s) | Current | Action |
|------|---------|---------|--------|
| `backend/requirements.txt` | 21 | `emergentintegrations==0.1.0` | Remove |
| `backend/ai_assistant.py` | 7 | `from emergentintegrations.llm.chat` | Replace with OpenAI SDK |
| `backend/server.py` | 3783 | `from emergentintegrations.llm.openai` | Replace with OpenAI SDK |
| `backend/stripe_service.py` | 75,148,290,511 | `from emergentintegrations.payments.stripe` | Replace with native Stripe |
| `backend/server.py` | 4818,4907 | Emergent Stripe wrapper | Replace with native Stripe |
| `frontend/public/index.html` | 25,34 | Emergent monitoring scripts | Remove entirely |

### 1.2 Environment Variable Changes

**Remove:**
```bash
AUTH_SERVICE_URL=https://demobackend.emergentagent.com
EMERGENT_LLM_KEY=sk-emergent-xxx
```

**Add:**
```bash
OPENAI_API_KEY=sk-xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_DB_URL=postgresql://...
```

**Update:**
```bash
APP_URL=https://{YOUR_DOMAIN}
REACT_APP_BACKEND_URL=https://{YOUR_DOMAIN}
EXPO_PUBLIC_API_URL=https://{YOUR_DOMAIN}/api
EXPO_PUBLIC_SOCKET_URL=https://{YOUR_DOMAIN}
```

---

## Part 2: Database Migration (MongoDB → Supabase PostgreSQL)

### 2.1 Migration Complexity by Collection

| Collection | Complexity | Time Estimate | Priority |
|------------|------------|---------------|----------|
| users | Low | 1-2 hrs | P0 |
| groups | Low | 1-2 hrs | P0 |
| group_members | Low | 1-2 hrs | P0 |
| game_nights | Medium | 3-4 hrs | P1 |
| players | Medium | 3-4 hrs | P1 |
| transactions | Medium | 2-3 hrs | P1 |
| **wallets** | **High** | 6-8 hrs | P2 |
| **wallet_transactions** | **High** | 8-10 hrs | P2 |
| ledger_entries | High | 6-8 hrs | P3 |
| notifications | Low | 1-2 hrs | P3 |

**Total: ~35-45 hours of development work**

### 2.2 PostgreSQL Schema (Key Tables)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(32) UNIQUE NOT NULL,
    supabase_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    level VARCHAR(20) DEFAULT 'Rookie',
    total_games INT DEFAULT 0,
    total_profit DECIMAL(10, 2) DEFAULT 0,
    badges TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by VARCHAR(32) REFERENCES users(user_id),
    default_buy_in DECIMAL(10, 2) DEFAULT 20.0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Nights
CREATE TABLE game_nights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(32) UNIQUE NOT NULL,
    group_id VARCHAR(32) REFERENCES groups(group_id),
    host_id VARCHAR(32) REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'scheduled',
    chip_value DECIMAL(10, 2),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets (Payment Critical)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id VARCHAR(32) UNIQUE NOT NULL,
    user_id VARCHAR(32) UNIQUE REFERENCES users(user_id),
    balance_cents BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    pin_hash VARCHAR(60),
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT balance_non_negative CHECK (balance_cents >= 0)
);

-- Wallet Transactions (Immutable Ledger)
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(32) UNIQUE NOT NULL,
    wallet_id VARCHAR(32) REFERENCES wallets(wallet_id),
    type VARCHAR(30) NOT NULL,
    amount_cents BIGINT NOT NULL,
    direction VARCHAR(10) NOT NULL,
    balance_before_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount_cents > 0)
);

-- Players
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id VARCHAR(32) UNIQUE NOT NULL,
    game_id VARCHAR(32) NOT NULL REFERENCES game_nights(game_id) ON DELETE CASCADE,
    user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
    total_buy_in DECIMAL(10, 2) DEFAULT 0,
    total_chips INT DEFAULT 0,
    chips_returned INT,
    cash_out DECIMAL(10, 2),
    net_result DECIMAL(10, 2) GENERATED ALWAYS AS (cash_out - total_buy_in) STORED,
    rsvp_status VARCHAR(20) DEFAULT 'pending',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    cashed_out_at TIMESTAMPTZ,
    UNIQUE(game_id, user_id)
);

-- Group Members
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id VARCHAR(32) UNIQUE NOT NULL,
    group_id VARCHAR(32) NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    nickname VARCHAR(255),
    UNIQUE(group_id, user_id)
);

-- Transactions (Game Buy-ins/Cash-outs)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(32) UNIQUE NOT NULL,
    game_id VARCHAR(32) NOT NULL REFERENCES game_nights(game_id),
    user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2),
    chips INT,
    chip_value DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger Entries (Settlement)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id VARCHAR(32) UNIQUE NOT NULL,
    group_id VARCHAR(32) NOT NULL REFERENCES groups(group_id),
    game_id VARCHAR(32) NOT NULL REFERENCES game_nights(game_id),
    from_user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
    to_user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    is_locked BOOLEAN DEFAULT FALSE,
    CONSTRAINT from_to_different CHECK (from_user_id != to_user_id),
    CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id VARCHAR(32) UNIQUE NOT NULL,
    user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Audit (Compliance)
CREATE TABLE wallet_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(32) UNIQUE NOT NULL,
    wallet_id VARCHAR(32) NOT NULL REFERENCES wallets(wallet_id),
    user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    risk_score SMALLINT CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Query Migration Patterns

**MongoDB aggregation → PostgreSQL:**
```python
# Before (MongoDB)
pipeline = [
    {"$match": {"game_id": {"$in": game_ids}}},
    {"$group": {"_id": "$user_id", "total_profit": {"$sum": "$net_result"}}}
]
result = await db.players.aggregate(pipeline)

# After (PostgreSQL/Supabase)
result = await supabase.rpc('get_leaderboard', {'game_ids': game_ids})

# Or with SQL:
SELECT user_id, SUM(net_result) as total_profit
FROM players WHERE game_id = ANY($1)
GROUP BY user_id ORDER BY total_profit DESC
```

**MongoDB find_one → Supabase:**
```python
# Before (MongoDB)
user = await db.users.find_one({"user_id": user_id})

# After (Supabase)
result = supabase.table('users').select('*').eq('user_id', user_id).single().execute()
user = result.data
```

**MongoDB update_one → Supabase:**
```python
# Before (MongoDB)
await db.users.update_one(
    {"user_id": user_id},
    {"$set": {"name": new_name}, "$inc": {"total_games": 1}}
)

# After (Supabase)
supabase.table('users').update({
    'name': new_name,
    'total_games': user['total_games'] + 1
}).eq('user_id', user_id).execute()
```

### 2.4 Supabase Features to Leverage

| MongoDB Feature | Supabase Replacement |
|-----------------|---------------------|
| Change Streams | Supabase Realtime |
| Manual auth checks | Row-Level Security (RLS) |
| TTL indexes | PostgreSQL scheduled jobs |
| Aggregation pipelines | SQL + stored procedures |
| $in operator | PostgreSQL `= ANY(array)` |
| ObjectId | UUID |

---

## Part 3: Code Changes Required

### 3.1 Database Layer Rewrite

**Current:** Motor (MongoDB async driver)
```python
from motor.motor_asyncio import AsyncIOMotorClient
db = client['oddside']
user = await db.users.find_one({"user_id": user_id})
```

**New:** Supabase Python client
```python
from supabase import create_client
supabase = create_client(url, key)
user = supabase.table('users').select('*').eq('user_id', user_id).single().execute()
```

### 3.2 Files Requiring Database Changes

| File | Changes Needed |
|------|----------------|
| `backend/server.py` | All 122 endpoints - replace Motor with Supabase client |
| `backend/stripe_service.py` | Payment queries |
| `backend/ai_service/*.py` | AI orchestrator queries |
| `backend/websocket_manager.py` | Game room lookups |
| `backend/create_indexes.py` | Remove (use Supabase migrations) |

### 3.3 Emergent Package Replacements

**AI Assistant (`ai_assistant.py`):**
```python
from openai import AsyncOpenAI

async def get_ai_response(user_message: str, session_id: str) -> str:
    client = AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'])
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]
    )
    return response.choices[0].message.content
```

**Voice Transcription (`server.py:3783`):**
```python
from openai import AsyncOpenAI

async def transcribe_voice(file: UploadFile):
    client = AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'])
    response = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_content
    )
    return response.text
```

**Stripe Checkout (`stripe_service.py`):**
```python
import stripe

stripe.api_key = os.environ['STRIPE_API_KEY']
session = stripe.checkout.Session.create(
    payment_method_types=['card'],
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'product_data': {'name': plan["name"]},
            'unit_amount': int(plan["price"] * 100),
        },
        'quantity': 1,
    }],
    mode='payment',
    success_url=f"{origin}/success?session_id={{CHECKOUT_SESSION_ID}}",
    cancel_url=f"{origin}/cancel",
    metadata={
        "plan_id": plan_id,
        "user_id": user_id
    }
)
```

---

## Part 4: Mobile Compatibility

### 4.1 Supabase Mobile SDKs

**iOS (Swift):**
```swift
import Supabase
let client = SupabaseClient(supabaseURL: URL, supabaseKey: KEY)
```

**Android (Kotlin):**
```kotlin
val client = createSupabaseClient(supabaseUrl, supabaseKey)
```

**React Native (current app):**
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
```

### 4.2 Mobile Changes Required

The mobile app (`/app/mobile/`) currently calls the backend API. No direct database calls needed - just update environment variables:

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=https://{YOUR_DOMAIN}/api
EXPO_PUBLIC_SOCKET_URL=https://{YOUR_DOMAIN}
```

---

## Part 5: International Launch Support

### 5.1 Supabase Regions

Supabase supports multiple regions:
- **US East** (default)
- **EU West** (Frankfurt)
- **Asia Pacific** (Singapore, Sydney)
- **South America** (Sao Paulo)

### 5.2 Multi-Region Considerations

| Concern | Solution |
|---------|----------|
| Data residency (GDPR) | Deploy to EU region for European users |
| Latency | Choose region closest to users |
| Currency | Already supports multiple currencies in code |
| Localization | Frontend i18n (separate effort) |

### 5.3 Recommended Approach

1. **Phase 1:** Single region (US or EU based on primary users)
2. **Phase 2:** Add read replicas for other regions if needed
3. **Phase 3:** Full multi-region with regional databases (if required by regulations)

---

## Part 6: AWS Lightsail Setup

### 6.1 Instance Configuration

- **Plan:** $10/month (2GB RAM, 1 vCPU)
- **OS:** Ubuntu 22.04 LTS
- **Static IP:** Required for DNS
- **Ports:** 22, 80, 443

### 6.2 Deployment Stack

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install python3.11 python3.11-venv python3.11-dev -y

# Install Node.js 20 (for frontend build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Install Nginx
sudo apt install nginx -y

# SSL with Let's Encrypt
sudo snap install certbot --classic
sudo certbot --nginx -d yourdomain.com

# Process management
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/kvitt
sudo chown -R ubuntu:ubuntu /var/www/kvitt
```

### 6.3 Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/kvitt/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 6.4 PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'kvitt-api',
    cwd: '/var/www/kvitt/backend',
    script: 'uvicorn',
    args: 'server:app --host 0.0.0.0 --port 8000 --workers 2',
    interpreter: '/var/www/kvitt/venv/bin/python',
    env: {
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://xxx.supabase.co',
      SUPABASE_KEY: 'xxx',
      STRIPE_API_KEY: 'sk_live_xxx',
      OPENAI_API_KEY: 'sk-xxx'
    }
  }]
}
```

---

## Part 7: Migration Timeline

### Week 1: Foundation
- [ ] Set up Supabase project in chosen region
- [ ] Create PostgreSQL schema (users, groups, group_members)
- [ ] Write data migration scripts (MongoDB → PostgreSQL)
- [ ] Remove `emergentintegrations` from requirements.txt
- [ ] Replace AI assistant with OpenAI SDK
- [ ] Replace voice transcription with OpenAI SDK

### Week 2: Game Operations
- [ ] Migrate game_nights, players, transactions tables
- [ ] Rewrite game-related endpoints to use Supabase
- [ ] Replace Stripe integrations with native SDK
- [ ] Test game creation/joining flow

### Week 3: Payments (High Risk)
- [ ] Migrate wallets table with constraints
- [ ] Migrate wallet_transactions (immutable ledger)
- [ ] Verify balance reconciliation (every wallet.balance_cents = SUM of transactions)
- [ ] Test Stripe webhook handling
- [ ] Test wallet deposits and transfers

### Week 4: Infrastructure & Launch
- [ ] Set up AWS Lightsail instance
- [ ] Configure Nginx and SSL
- [ ] Deploy backend
- [ ] Build and deploy frontend
- [ ] Update frontend/mobile environment variables
- [ ] Full end-to-end testing
- [ ] DNS cutover

---

## Part 8: Verification Checklist

### Critical Path Testing
- [ ] User can sign up/login (Supabase Auth)
- [ ] User can create a group
- [ ] User can invite members to group
- [ ] User can start a game
- [ ] Players can join a game
- [ ] Buy-in/cash-out transactions work
- [ ] Real-time updates work (Socket.IO)
- [ ] Voice transcription works
- [ ] AI assistant responds
- [ ] Stripe premium checkout completes
- [ ] Wallet deposit works
- [ ] Wallet transfer works
- [ ] Settlement calculation correct
- [ ] Leaderboard aggregations correct

### Mobile Testing
- [ ] iOS app connects to new backend
- [ ] Android app connects to new backend
- [ ] Push notifications work
- [ ] Deep links work

### Performance Testing
```bash
# Load test with wrk
wrk -t12 -c400 -d30s https://api.yourdomain.com/api/health

# Expected: >1000 req/sec on 2GB instance
```

---

## Part 9: Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| AWS Lightsail (2GB) | $10 |
| Supabase Pro | $25 |
| **Total** | **$35/month** |

(vs MongoDB Atlas at ~$57/month)

---

## Part 10: Data Migration Scripts

### 10.1 Export from MongoDB

```python
# export_mongodb.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json

async def export_collection(db, collection_name, output_file):
    cursor = db[collection_name].find({})
    documents = await cursor.to_list(length=None)

    # Convert ObjectId to string
    for doc in documents:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])

    with open(output_file, 'w') as f:
        json.dump(documents, f, default=str, indent=2)

    print(f"Exported {len(documents)} documents from {collection_name}")

async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client['oddside']

    collections = [
        'users', 'groups', 'group_members', 'game_nights',
        'players', 'transactions', 'wallets', 'wallet_transactions',
        'ledger_entries', 'notifications'
    ]

    for collection in collections:
        await export_collection(db, collection, f'export/{collection}.json')

asyncio.run(main())
```

### 10.2 Import to Supabase

```python
# import_supabase.py
import json
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def import_collection(table_name, json_file):
    with open(json_file, 'r') as f:
        documents = json.load(f)

    # Remove MongoDB _id field
    for doc in documents:
        doc.pop('_id', None)

    # Batch insert (Supabase has limits)
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        supabase.table(table_name).insert(batch).execute()

    print(f"Imported {len(documents)} records to {table_name}")

# Import in order (respecting foreign keys)
import_collection('users', 'export/users.json')
import_collection('groups', 'export/groups.json')
import_collection('group_members', 'export/group_members.json')
import_collection('game_nights', 'export/game_nights.json')
import_collection('players', 'export/players.json')
import_collection('transactions', 'export/transactions.json')
import_collection('wallets', 'export/wallets.json')
import_collection('wallet_transactions', 'export/wallet_transactions.json')
import_collection('ledger_entries', 'export/ledger_entries.json')
import_collection('notifications', 'export/notifications.json')
```

---

## Rollback Strategy

1. **Keep MongoDB running** during entire migration
2. **Feature flag** to switch between database backends
3. **DNS rollback** to Emergent (< 1 hour if needed)
4. **Supabase point-in-time recovery** for database issues

### Quick Rollback Steps

```bash
# 1. Update DNS to point back to Emergent
# (done in your DNS provider)

# 2. Or switch backend to MongoDB
# In .env:
DATABASE_BACKEND=mongodb  # instead of supabase

# 3. Restart server
pm2 restart kvitt-api
```

---

## Questions to Answer Before Starting

1. **Domain name:** What domain will you use? (e.g., kvitt.app, kvitt.io)
2. **Supabase region:** US East or EU West?
3. **Stripe mode:** Are you using test or live keys?
4. **Current user count:** How many users/games to migrate?

---

## Summary

This migration moves Kvitt from Emergent to a self-managed AWS Lightsail + Supabase stack. The main work involves:

1. **Remove Emergent dependencies** (~1-2 days)
   - Replace `emergentintegrations` with native SDKs
   - Remove monitoring scripts
   - Update environment variables

2. **Migrate database** (~2-3 weeks)
   - Convert 30+ MongoDB collections to PostgreSQL
   - Rewrite all database queries
   - Migrate existing data

3. **Set up infrastructure** (~1-2 days)
   - AWS Lightsail instance
   - Nginx + SSL
   - PM2 process management

4. **Deploy and test** (~2-3 days)
   - Full end-to-end testing
   - Mobile app verification
   - DNS cutover

**Total estimated time: ~4 weeks**
**Monthly cost: ~$35/month** (down from potential $67+ with MongoDB Atlas)
