"""
app/models/__init__.py
Export all ORM models so Alembic can auto-detect them.
"""
from app.models.exercise import Exercise
from app.models.workout import WorkoutSession, WorkoutSet

__all__ = ["Exercise", "WorkoutSession", "WorkoutSet"]
