#!/usr/bin/env python
"""
scripts/init_db.py
Quick-start script: creates all tables and seeds exercise catalog.
Run once after setting up PostgreSQL:
  python scripts/init_db.py
"""
import asyncio
import sys
import os

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.db import Base
import app.models  # noqa — register all models


EXERCISES_SEED = [
    {
        "slug": "jumping_jack",
        "name": "Jumping Jack",
        "description": "Stand with feet together, arms at sides. Jump while spreading legs and raising arms.",
        "muscle_groups": ["Full Body", "Cardio", "Legs", "Arms"],
        "difficulty": "beginner",
        "counting_type": "reps",
    },
    {
        "slug": "squat",
        "name": "Squat",
        "description": "Stand feet shoulder-width apart. Lower until thighs parallel floor, press back up.",
        "muscle_groups": ["Quads", "Glutes", "Hamstrings", "Core"],
        "difficulty": "beginner",
        "counting_type": "reps",
    },
    {
        "slug": "push_up",
        "name": "Push-up",
        "description": "Plank position, lower chest to floor, push back up.",
        "muscle_groups": ["Chest", "Triceps", "Shoulders", "Core"],
        "difficulty": "intermediate",
        "counting_type": "reps",
    },
    {
        "slug": "plank",
        "name": "Plank",
        "description": "Forearm plank position. Keep body straight from head to heels.",
        "muscle_groups": ["Core", "Shoulders", "Back"],
        "difficulty": "intermediate",
        "counting_type": "duration",
    },
]


async def main():
    print(f"📦 Connecting to: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        print("🔨 Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables created")

        # Enable pgcrypto for gen_random_uuid() — safe to run multiple times
        try:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
        except Exception:
            pass

        print("🌱 Seeding exercises...")
        for ex in EXERCISES_SEED:
            result = await conn.execute(
                text("SELECT id FROM exercises WHERE slug = :slug"),
                {"slug": ex["slug"]},
            )
            if not result.fetchone():
                await conn.execute(
                    text("""
                        INSERT INTO exercises (slug, name, description, muscle_groups, difficulty, counting_type)
                        VALUES (:slug, :name, :description, :muscle_groups, :difficulty, :counting_type)
                    """),
                    {**ex, "muscle_groups": ex["muscle_groups"]},
                )
                print(f"  ✓ {ex['name']}")
            else:
                print(f"  · {ex['name']} (already exists)")

    await engine.dispose()
    print("\n🎉 Database ready! Start the API with:")
    print("   uvicorn main:app --reload --port 8000")


if __name__ == "__main__":
    asyncio.run(main())
