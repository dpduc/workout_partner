"""
app/api/exercises.py
GET /api/exercises — Exercise catalog endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseOut], summary="List all exercises")
async def list_exercises(db: AsyncSession = Depends(get_db)):
    """Return the full exercise catalog."""
    result = await db.execute(select(Exercise).order_by(Exercise.id))
    return result.scalars().all()
