"""
Create MongoDB indexes for Kvitt collections
Run once: python create_indexes.py
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'oddside')


async def create_indexes():
    """Create indexes for optimal query performance"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"Creating indexes for database: {DB_NAME}")

    # group_members: Used in join_game authorization
    # Query: find({group_id, user_id, status: 'active'})
    await db.group_members.create_index(
        [("group_id", 1), ("user_id", 1), ("status", 1)],
        name="group_member_lookup"
    )
    print("✅ Created index: group_members(group_id, user_id, status)")

    # players: Used in join_game authorization (invited users)
    # Query: find({game_id, user_id})
    await db.players.create_index(
        [("game_id", 1), ("user_id", 1)],
        name="player_game_lookup"
    )
    print("✅ Created index: players(game_id, user_id)")

    # game_nights: Used in join_game to get game details
    # Query: find({_id})
    # Note: _id is auto-indexed, but adding group_id for other queries
    await db.game_nights.create_index(
        [("group_id", 1)],
        name="game_group_lookup"
    )
    print("✅ Created index: game_nights(group_id)")

    # game_nights: For listing games by status
    await db.game_nights.create_index(
        [("status", 1), ("created_at", -1)],
        name="game_status_created"
    )
    print("✅ Created index: game_nights(status, created_at)")

    # users: For supabase_id lookup (auth)
    # Query: find({supabase_id})
    await db.users.create_index(
        [("supabase_id", 1)],
        unique=True,
        name="user_supabase_id"
    )
    print("✅ Created index: users(supabase_id) UNIQUE")

    # ============== WALLET INDEXES (Critical for payment security) ==============

    # wallets: Unique wallet_id
    await db.wallets.create_index(
        [("wallet_id", 1)],
        unique=True,
        name="wallet_id_unique"
    )
    print("✅ Created index: wallets(wallet_id) UNIQUE")

    # wallets: One wallet per user
    await db.wallets.create_index(
        [("user_id", 1)],
        unique=True,
        name="wallet_user_unique"
    )
    print("✅ Created index: wallets(user_id) UNIQUE")

    # wallet_transactions: Prevent duplicate Stripe deposits
    await db.wallet_transactions.create_index(
        [("stripe_payment_intent_id", 1)],
        unique=True,
        sparse=True,  # Allow null values
        name="wallet_txn_stripe_unique"
    )
    print("✅ Created index: wallet_transactions(stripe_payment_intent_id) UNIQUE SPARSE")

    # wallet_transactions: Prevent duplicate transfers (idempotency)
    await db.wallet_transactions.create_index(
        [("wallet_id", 1), ("idempotency_key", 1)],
        unique=True,
        sparse=True,  # Allow null values for non-transfer transactions
        name="wallet_txn_idempotency_unique"
    )
    print("✅ Created index: wallet_transactions(wallet_id, idempotency_key) UNIQUE SPARSE")

    # wallet_transactions: Query by wallet_id for history
    await db.wallet_transactions.create_index(
        [("wallet_id", 1), ("created_at", -1)],
        name="wallet_txn_history"
    )
    print("✅ Created index: wallet_transactions(wallet_id, created_at)")

    # wallet_audit: Query audit logs by wallet
    await db.wallet_audit.create_index(
        [("wallet_id", 1), ("created_at", -1)],
        name="wallet_audit_lookup"
    )
    print("✅ Created index: wallet_audit(wallet_id, created_at)")

    # ============== RATE LIMITING INDEXES ==============

    # rate_limits: TTL index for automatic cleanup
    await db.rate_limits.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="rate_limit_ttl"
    )
    print("✅ Created index: rate_limits(expires_at) TTL")

    # rate_limits: Fast lookup by key and endpoint
    await db.rate_limits.create_index(
        [("key", 1), ("endpoint", 1)],
        name="rate_limit_lookup"
    )
    print("✅ Created index: rate_limits(key, endpoint)")

    # List all indexes
    print("\n📋 Existing indexes:")
    for collection_name in ['group_members', 'players', 'game_nights', 'users']:
        indexes = await db[collection_name].list_indexes().to_list(None)
        print(f"\n{collection_name}:")
        for idx in indexes:
            print(f"  - {idx['name']}: {idx.get('key', {})}")

    client.close()
    print("\n✅ All indexes created successfully")


if __name__ == "__main__":
    asyncio.run(create_indexes())
