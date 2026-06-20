"""
app/schemas/exercise.py
Pydantic v2 schemas for the Exercise resource.
"""
from pydantic import BaseModel, ConfigDict


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str | None = None
    muscle_groups: list[str] | None = None
    difficulty: str
    counting_type: str
