import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.algorithms.core import insertion_sort, binary_search, linear_search
from backend.ai.parser import parse_natural_language_task

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db_task = models.Task(
        title=task.title, description=task.description, priority=task.priority,
        due_date=task.due_date, status=task.status, project_id=task.project_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("", status_code=status.HTTP_200_OK)
def list_tasks(project_id: int = None, sort_by: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Task)
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    tasks = query.all()
    
    # 1. Sort by Priority (High -> Medium -> Low)
    if sort_by == "priority":
        task_dicts = []
        for t in tasks:
            d = {c.name: getattr(t, c.name) for c in t.__table__.columns}
            # Rank 1 is High, 2 is Medium, 3 is Low
            d["priority_rank"] = {"high": 1, "medium": 2, "low": 3}.get(d["priority"], 2)
            task_dicts.append(d)
        insertion_sort(task_dicts, "priority_rank")
        return task_dicts
        
    # 2. Sort by Due Date (Earliest -> Latest)
    elif sort_by == "due_date":
        task_dicts = []
        for t in tasks:
            d = {c.name: getattr(t, c.name) for c in t.__table__.columns}
            raw_date = d.get("due_date") or "9999-12-31" # Push null dates to the bottom
            # Extract YYYY-MM-DD if bracket format is used, else sort by raw string
            match = re.search(r'\d{4}-\d{2}-\d{2}', raw_date)
            d["date_rank"] = match.group(0) if match else raw_date
            task_dicts.append(d)
        insertion_sort(task_dicts, "date_rank")
        return task_dicts
        
    return tasks

@router.get("/search", response_model=schemas.TaskResponse, status_code=status.HTTP_200_OK)
def search_tasks(title: str = Query(...), algo: str = Query("binary"), db: Session = Depends(get_db)):
    tasks = db.query(models.Task).all()
    index = [{"id": t.id, "title": t.title} for t in tasks]
    
    if algo == "binary":
        insertion_sort(index, "title")
        pos = binary_search(index, title, "title")
    else:
        pos = linear_search(index, title, "title")
        
    if pos == -1:
        raise HTTPException(status_code=404, detail="Task exact title not found")
        
    task_id = index[pos]["id"]
    return db.query(models.Task).filter(models.Task.id == task_id).first()

@router.get("/{task_id}", response_model=schemas.TaskResponse, status_code=status.HTTP_200_OK)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=schemas.TaskResponse, status_code=status.HTTP_200_OK)
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task: raise HTTPException(status_code=404, detail="Task not found")

    for field, value in task_update.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task: raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

@router.post("/quick-add", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def quick_add_task(data: dict, db: Session = Depends(get_db)):
    raw_text = data.get("text", "")
    project_id = data.get("project_id")
    
    if not raw_text or not project_id:
        raise HTTPException(status_code=422, detail="Text and project_id are required")
        
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=422, detail="Invalid project_id")
        
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