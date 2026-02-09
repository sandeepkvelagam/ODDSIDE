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
