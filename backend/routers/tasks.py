from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from backend.database import get_db
from backend import models, schemas
import re

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Priority weight mapping for custom sorting algorithm
PRIORITY_WEIGHTS = {"high": 1, "medium": 2, "low": 3}

@router.post("", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db_task = models.Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        status=task.status,
        project_id=task.project_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("", response_model=List[schemas.TaskResponse], status_code=status.HTTP_200_OK)
def list_tasks(project_id: int = None, sort_by: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Task)
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    
    tasks = query.all()
    
    # Custom Algorithmic Sorting Engine O(N log N)
    if sort_by == "priority":
        tasks.sort(key=lambda t: PRIORITY_WEIGHTS.get(t.priority, 4))
    elif sort_by == "due_date":
        tasks.sort(key=lambda t: t.due_date if t.due_date else "9999-12-31")
        
    return tasks

@router.get("/{task_id}", response_model=schemas.TaskResponse, status_code=status.HTTP_200_OK)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=schemas.TaskResponse, status_code=status.HTTP_200_OK)
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

# --- Natural Language Processing Helper for AI Quick-Add ---
def parse_natural_language_task(text: str):
    priority = "medium"
    due_date = None
    
    lower_text = text.lower()
    if "high" in lower_text or "urgent" in lower_text or "asap" in lower_text:
        priority = "high"
        text = re.sub(r'\b(high|urgent|asap)\b', '', text, flags=re.IGNORECASE)
    elif "low" in lower_text:
        priority = "low"
        text = re.sub(r'\b(low)\b', '', text, flags=re.IGNORECASE)
        
    today = datetime.now()
    if "tomorrow" in lower_text:
        due_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        text = re.sub(r'\b(tomorrow)\b', '', text, flags=re.IGNORECASE)
    elif "today" in lower_text:
        due_date = today.strftime("%Y-%m-%d")
        text = re.sub(r'\b(today)\b', '', text, flags=re.IGNORECASE)
    elif "next week" in lower_text:
        due_date = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        text = re.sub(r'\b(next week)\b', '', text, flags=re.IGNORECASE)

    clean_title = re.sub(r'\s+', ' ', text).strip()
    
    return {
        "title": clean_title or "Quick Task",
        "priority": priority,
        "due_date": due_date,
        "status": "todo"
    }

@router.post("/quick-add", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def quick_add_task(data: dict, db: Session = Depends(get_db)):
    raw_text = data.get("text", "")
    project_id = data.get("project_id")
    
    if not raw_text or not project_id:
        raise HTTPException(status_code=400, detail="Text and project_id are required")
        
    parsed_data = parse_natural_language_task(raw_text)
    
    new_task = models.Task(
        title=parsed_data["title"],
        priority=parsed_data["priority"],
        due_date=parsed_data["due_date"],
        status=parsed_data["status"],
        project_id=project_id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task