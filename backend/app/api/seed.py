"""
app/api/seed.py
Internal endpoint to seed the exercise catalog.
Only available in development mode.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models.exercise import Exercise

router = APIRouter(prefix="/seed", tags=["dev"])

EXERCISES_SEED = [
    {
        "slug": "jumping_jack",
        "name": "Jumping Jack",
        "description": "Stand with feet together, arms at sides. Jump while spreading legs and raising arms overhead. Return to start.",
        "muscle_groups": ["Full Body", "Cardio", "Legs", "Arms"],
        "difficulty": "beginner",
        "counting_type": "reps",
    },
    {
        "slug": "squat",
        "name": "Squat",
        "description": "Stand with feet shoulder-width apart. Lower your body until thighs are parallel to the floor, then press back up.",
        "muscle_groups": ["Quads", "Glutes", "Hamstrings", "Core"],
        "difficulty": "beginner",
        "counting_type": "reps",
    },
    {
        "slug": "push_up",
        "name": "Push-up",
        "description": "Start in plank position. Lower your chest to the floor while keeping your body straight, then push back up.",
        "muscle_groups": ["Chest", "Triceps", "Shoulders", "Core"],
        "difficulty": "intermediate",
        "counting_type": "reps",
    },
    {
        "slug": "plank",
        "name": "Plank",
        "description": "Hold a forearm plank position. Keep body in a straight line from head to heels. Hold as long as possible.",
        "muscle_groups": ["Core", "Shoulders", "Back"],
        "difficulty": "intermediate",
        "counting_type": "duration",
    },
]


@router.post("/exercises", summary="[DEV] Seed exercise catalog")
async def seed_exercises(db: AsyncSession = Depends(get_db)):
    """Idempotent seed for exercise catalog. Only runs in development."""
    if settings.APP_ENV != "development":
        raise HTTPException(status_code=403, detail="Only available in development")

    seeded = []
    for data in EXERCISES_SEED:
        existing = await db.execute(select(Exercise).where(Exercise.slug == data["slug"]))
        if not existing.scalar_one_or_none():
            ex = Exercise(**data)
            db.add(ex)
            seeded.append(data["slug"])

    await db.flush()
    return {"seeded": seeded, "message": f"Seeded {len(seeded)} exercises"}
