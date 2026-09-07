"""
app/models/workout.py
WorkoutSession and WorkoutSet ORM models.
"""
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    started_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
    )
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)
    total_duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
    )

    # Relationship → sets (lazy="selectin" avoids N+1 by default)
    sets: Mapped[list["WorkoutSet"]] = relationship(
        "WorkoutSet",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.set_number",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<WorkoutSession id={self.id} started={self.started_at}>"


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("exercises.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Slug cached for display when exercise is deleted
    exercise_slug: Mapped[str] = mapped_column(String(64), nullable=False, default="jumping_jack")
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
    )

    session: Mapped["WorkoutSession"] = relationship("WorkoutSession", back_populates="sets")

    def __repr__(self) -> str:
        return f"<WorkoutSet session={self.session_id} set={self.set_number} reps={self.reps}>"
