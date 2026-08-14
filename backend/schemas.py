from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List
from datetime import datetime

# ----------------- USER SCHEMAS -----------------
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- PROJECT SCHEMAS -----------------
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: int

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int

    class Config:
        from_attributes = True

class ProjectStatsResponse(BaseModel):
    project_id: int
    project_name: str
    total_tasks: int
    todo_count: int
    in_progress_count: int
    done_count: int

# ----------------- TASK SCHEMAS -----------------
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Literal["low", "medium", "high"] = Field(default="medium")
    due_date: Optional[str] = None
    status: Literal["todo", "in_progress", "done"] = "todo"
    project_id: int

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Task title cannot be blank or whitespace-only")
        return trimmed

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    due_date: Optional[str] = None
    status: Optional[Literal["todo", "in_progress", "done"]] = None

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Task title cannot be blank or whitespace-only")
            return trimmed
        return v

class TaskResponse(TaskBase):
    id: int

    class Config:
        from_attributes = True