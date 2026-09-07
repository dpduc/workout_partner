"""
app/api/workouts.py
Full CRUD for WorkoutSession and WorkoutSet resources.

Routes:
  POST   /api/sessions              Create session
  GET    /api/sessions              List sessions (paginated)
  GET    /api/sessions/{id}         Get session detail
  PATCH  /api/sessions/{id}         Update session (end, notes)
  DELETE /api/sessions/{id}         Delete session

  POST   /api/sessions/{id}/sets    Add set to session
  PATCH  /api/sets/{id}             Update a set
  DELETE /api/sets/{id}             Delete a set
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.workout import WorkoutSession, WorkoutSet
from app.schemas.workout import (
    PaginatedSessions,
    WorkoutSessionCreate,
    WorkoutSessionOut,
    WorkoutSessionUpdate,
    WorkoutSetCreate,
    WorkoutSetOut,
    WorkoutSetUpdate,
)

router = APIRouter(tags=["workouts"])


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=WorkoutSessionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workout session",
)
async def create_session(
    body: WorkoutSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    session = WorkoutSession(
        started_at=datetime.now(timezone.utc),
        notes=body.notes,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get(
    "/sessions",
    response_model=PaginatedSessions,
    summary="List workout sessions (newest first)",
)
async def list_sessions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit

    total_result = await db.execute(select(func.count(WorkoutSession.id)))
    total = total_result.scalar_one()

    result = await db.execute(
        select(WorkoutSession)
        .order_by(WorkoutSession.started_at.desc())
        .offset(offset)
        .limit(limit)
    )
    sessions = result.scalars().all()

    return PaginatedSessions(items=sessions, total=total, page=page, limit=limit)


@router.get(
    "/sessions/{session_id}",
    response_model=WorkoutSessionOut,
    summary="Get a session by ID",
)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(WorkoutSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch(
    "/sessions/{session_id}",
    response_model=WorkoutSessionOut,
    summary="Update session (end it, add notes)",
)
async def update_session(
    session_id: uuid.UUID,
    body: WorkoutSessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(WorkoutSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)

    await db.flush()
    await db.refresh(session)
    return session


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workout session and all its sets",
)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(WorkoutSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)


# ── Sets ──────────────────────────────────────────────────────────────────────

@router.post(
    "/sessions/{session_id}/sets",
    response_model=WorkoutSetOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a set to a session",
)
async def add_set(
    session_id: uuid.UUID,
    body: WorkoutSetCreate,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(WorkoutSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workout_set = WorkoutSet(
        session_id=session_id,
        exercise_id=body.exercise_id,
        exercise_slug=body.exercise_slug,
        set_number=body.set_number,
        reps=body.reps,
        duration_s=body.duration_s,
    )
    db.add(workout_set)
    await db.flush()
    await db.refresh(workout_set)
    return workout_set


@router.patch(
    "/sets/{set_id}",
    response_model=WorkoutSetOut,
    summary="Update a workout set",
)
async def update_set(
    set_id: int,
    body: WorkoutSetUpdate,
    db: AsyncSession = Depends(get_db),
):
    workout_set = await db.get(WorkoutSet, set_id)
    if not workout_set:
        raise HTTPException(status_code=404, detail="Set not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout_set, field, value)

    await db.flush()
    await db.refresh(workout_set)
    return workout_set


@router.delete(
    "/sets/{set_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workout set",
)
async def delete_set(
    set_id: int,
    db: AsyncSession = Depends(get_db),
):
    workout_set = await db.get(WorkoutSet, set_id)
    if not workout_set:
        raise HTTPException(status_code=404, detail="Set not found")
    await db.delete(workout_set)
