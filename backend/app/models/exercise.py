"""
app/models/exercise.py
Exercise catalog — static reference data for available exercises.
"""
from sqlalchemy import ARRAY, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    muscle_groups: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(32), nullable=False, default="beginner")
    # 'reps' | 'duration'
    counting_type: Mapped[str] = mapped_column(String(16), nullable=False, default="reps")

    def __repr__(self) -> str:
        return f"<Exercise slug={self.slug!r}>"
