from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List

from backend.database import get_db
from backend import models, schemas

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    # Verify owner exists
    owner = db.query(models.User).filter(models.User.id == project.owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Project owner not found")

    db_project = models.Project(
        name=project.name,
        description=project.description,
        owner_id=project.owner_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("", response_model=List[schemas.ProjectResponse], status_code=status.HTTP_200_OK)
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()

@router.get("/{project_id}/stats", response_model=schemas.ProjectStatsResponse, status_code=status.HTTP_200_OK)
def get_project_stats(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # SQL aggregate query executed in DB using JOIN and COUNT
    stats_query = (
        db.query(
            func.count(models.Task.id).label("total_tasks"),
            func.sum(case((models.Task.status == "todo", 1), else_=0)).label("todo_count"),
            func.sum(case((models.Task.status == "in_progress", 1), else_=0)).label("in_progress_count"),
            func.sum(case((models.Task.status == "done", 1), else_=0)).label("done_count")
        )
        .filter(models.Task.project_id == project_id)
        .first()
    )

    return schemas.ProjectStatsResponse(
        project_id=project.id,
        project_name=project.name,
        total_tasks=stats_query.total_tasks or 0,
        todo_count=stats_query.todo_count or 0,
        in_progress_count=stats_query.in_progress_count or 0,
        done_count=stats_query.done_count or 0
    )