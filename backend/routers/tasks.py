from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.models import Task
from pydantic import BaseModel

router = APIRouter(tags=["Tasks"])

class TaskCreate(BaseModel):
    title: str
    priority: str = "medium"
    due_date: Optional[str] = None
    status: str = "todo"
    project_id: int

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

# Priority weight mapping for custom sorting algorithm
PRIORITY_WEIGHTS = {"high": 1, "medium": 2, "low": 3}

@router.get("/tasks")
def list_tasks(project_id: int, sort_by: str = None, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    
    if sort_by == "priority":
        # Sort tasks using custom priority weights: O(N log N) time complexity
        tasks.sort(key=lambda t: PRIORITY_WEIGHTS.get(t.priority, 4))
    elif sort_by == "due_date":
        # Sort tasks by due date, pushing items without a due date to the end
        tasks.sort(key=lambda t: t.due_date if t.due_date else "9999-12-31")
        
    return tasks

@router.post("/tasks")
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    new_task = Task(
        title=task_data.title,
        priority=task_data.priority,
        due_date=task_data.due_date,
        status=task_data.status,
        project_id=task_data.project_id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.put("/tasks/{task_id}")
def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task_data.title is not None:
        task.title = task_data.title
    if task_data.priority is not None:
        task.priority = task_data.priority
    if task_data.due_date is not None:
        task.due_date = task_data.due_date
    if task_data.status is not None:
        task.status = task_data.status
        
    db.commit()
    db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return {"detail": "Task deleted successfully"}