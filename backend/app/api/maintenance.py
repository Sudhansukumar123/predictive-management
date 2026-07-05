import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.models.models import MaintenanceTask, Machine
from app.schemas.schemas import MaintenanceTaskResponse, MaintenanceTaskCreate, MaintenanceTaskUpdate
from app.api.deps import get_engineer_user, get_operator_user

router = APIRouter()

@router.get("/", response_model=List[MaintenanceTaskResponse])
def get_maintenance_tasks(db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """Fetches list of all maintenance tickets."""
    return db.query(MaintenanceTask).order_by(MaintenanceTask.scheduled_date.asc()).all()

@router.post("/", response_model=MaintenanceTaskResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_task(
    task_in: MaintenanceTaskCreate, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_engineer_user)
):
    """Creates a new maintenance ticket (Engineer or Admin)."""
    machine = db.query(Machine).filter(Machine.id == task_in.machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        
    db_task = MaintenanceTask(**task_in.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/{task_id}", response_model=MaintenanceTaskResponse)
def update_maintenance_task(
    task_id: int,
    task_in: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_engineer_user)
):
    """Updates a maintenance ticket status, notes, or assigned technician (Engineer or Admin)."""
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance task not found")
        
    update_data = task_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
        
    # If status is set to completed, record completed date
    if task_in.status == "completed":
        task.completed_date = datetime.datetime.utcnow()
        # Also restore machine health back to 100% and clear critical status
        machine = db.query(Machine).filter(Machine.id == task.machine_id).first()
        if machine:
            machine.status = "healthy"
            machine.health_score = 100.0
            machine.rul_hours = 2500.0 # reset remaining useful life hours context
            
    db.commit()
    db.refresh(task)
    return task
