"""
app/api/stats.py
Aggregated statistics endpoints.

Routes:
  GET /api/stats/summary   — Total sessions, reps, duration, streak
  GET /api/stats/weekly    — Per-day rep data for the last 7 days
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.workout import WorkoutSession, WorkoutSet
from app.schemas.workout import StatsSummary, WeeklyDataset, WeeklyStats

router = APIRouter(prefix="/stats", tags=["stats"])

DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


@router.get("/summary", response_model=StatsSummary, summary="Get overall stats summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Return total sessions, reps, duration and streak."""

    # Total sessions
    total_sessions_result = await db.execute(select(func.count(WorkoutSession.id)))
    total_sessions = total_sessions_result.scalar_one() or 0

    # Total reps
    total_reps_result = await db.execute(select(func.coalesce(func.sum(WorkoutSet.reps), 0)))
    total_reps = total_reps_result.scalar_one() or 0

    # Total duration
    total_duration_result = await db.execute(
        select(func.coalesce(func.sum(WorkoutSession.total_duration_s), 0))
    )
    total_duration = total_duration_result.scalar_one() or 0

    # Streak calculation — fetch all unique session dates
    dates_result = await db.execute(
        select(func.date_trunc("day", WorkoutSession.started_at).label("day"))
        .distinct()
        .order_by(func.date_trunc("day", WorkoutSession.started_at).desc())
    )
    dates = [row.day.date() for row in dates_result]

    current_streak, best_streak = _compute_streaks(dates)

    return StatsSummary(
        total_sessions=total_sessions,
        total_reps=int(total_reps),
        total_duration_s=int(total_duration),
        current_streak_days=current_streak,
        best_streak_days=best_streak,
    )


@router.get("/weekly", response_model=WeeklyStats, summary="Get weekly rep data for chart")
async def get_weekly(db: AsyncSession = Depends(get_db)):
    """Return per-day rep totals for the last 7 days."""

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=6)
    week_ago_start = week_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    # Sum reps grouped by calendar day
    result = await db.execute(
        select(
            func.date_trunc("day", WorkoutSession.started_at).label("day"),
            func.coalesce(func.sum(WorkoutSet.reps), 0).label("total_reps"),
        )
        .join(WorkoutSet, WorkoutSet.session_id == WorkoutSession.id, isouter=True)
        .where(WorkoutSession.started_at >= week_ago_start)
        .group_by(func.date_trunc("day", WorkoutSession.started_at))
        .order_by(func.date_trunc("day", WorkoutSession.started_at))
    )
    rows = {row.day.date(): int(row.total_reps) for row in result}

    labels = []
    data = []
    for i in range(7):
        day = (week_ago + timedelta(days=i)).date()
        labels.append(DAY_LABELS[day.weekday() + 1 if day.weekday() < 6 else 0]
                       if False else DAY_LABELS[day.isoweekday() % 7])
        data.append(rows.get(day, 0))

    return WeeklyStats(
        labels=labels,
        datasets=[WeeklyDataset(exercise="All Exercises", data=data)],
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_streaks(dates: list) -> tuple[int, int]:
    """Compute current and best consecutive-day streaks from a sorted-desc list of dates."""
    if not dates:
        return 0, 0

    today = datetime.now(timezone.utc).date()

    # Current streak
    current = 0
    check = today
    for d in dates:
        if d == check:
            current += 1
            check -= timedelta(days=1)
        elif d < check:
            # Gap found — stop if it wasn't just yesterday
            break

    # Best streak
    best = 1
    run = 1
    for i in range(1, len(dates)):
        if (dates[i - 1] - dates[i]).days == 1:
            run += 1
            best = max(best, run)
        else:
            run = 1

    return current, max(best, current)
