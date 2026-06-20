"""
app/schemas/workout.py
Pydantic v2 schemas for WorkoutSession and WorkoutSet.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ── WorkoutSet ────────────────────────────────────────────────────────────────

class WorkoutSetCreate(BaseModel):
    exercise_id: int | None = None
    exercise_slug: str = "jumping_jack"
    set_number: int = Field(ge=1)
    reps: int | None = Field(default=None, ge=0)
    duration_s: int | None = Field(default=None, ge=0)


class WorkoutSetUpdate(BaseModel):
    reps: int | None = Field(default=None, ge=0)
    duration_s: int | None = Field(default=None, ge=0)


class WorkoutSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: uuid.UUID
    exercise_id: int | None
    exercise_slug: str
    set_number: int
    reps: int | None
    duration_s: int | None
    created_at: datetime


# ── WorkoutSession ────────────────────────────────────────────────────────────

class WorkoutSessionCreate(BaseModel):
    notes: str | None = None


class WorkoutSessionUpdate(BaseModel):
    ended_at: datetime | None = None
    total_duration_s: int | None = Field(default=None, ge=0)
    notes: str | None = None


class WorkoutSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    total_duration_s: int | None
    notes: str | None
    created_at: datetime
    sets: list[WorkoutSetOut] = []


class WorkoutSessionListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    total_duration_s: int | None
    notes: str | None
    sets: list[WorkoutSetOut] = []


# ── Pagination wrapper ────────────────────────────────────────────────────────

class PaginatedSessions(BaseModel):
    items: list[WorkoutSessionListOut]
    total: int
    page: int
    limit: int


# ── Stats ─────────────────────────────────────────────────────────────────────

class StatsSummary(BaseModel):
    total_sessions: int
    total_reps: int
    total_duration_s: int
    current_streak_days: int
    best_streak_days: int


class WeeklyDataset(BaseModel):
    exercise: str
    data: list[int]


class WeeklyStats(BaseModel):
    labels: list[str]
    datasets: list[WeeklyDataset]
