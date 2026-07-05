from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.models.models import Machine, SensorReading
from app.schemas.schemas import MachineResponse, MachineCreate, MachineDetailResponse
from app.api.deps import get_admin_user, get_operator_user, get_engineer_user
from app.services.simulator import simulator

router = APIRouter()

@router.get("/", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """Fetches list of all machines."""
    return db.query(Machine).all()

@router.get("/{machine_id}", response_model=MachineDetailResponse)
def get_machine_detail(machine_id: int, db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """Fetches details of a specific machine along with its 50 most recent sensor readings."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        
    # Query latest 50 readings in chronological order
    recent_readings = db.query(SensorReading)\
        .filter(SensorReading.machine_id == machine_id)\
        .order_by(SensorReading.timestamp.desc())\
        .limit(50)\
        .all()
        
    # Reverse so the UI receives them chronologically
    recent_readings.reverse()
    
    # Pack into response schema
    detail = MachineDetailResponse.from_orm(machine)
    detail.recent_readings = recent_readings
    return detail

@router.post("/", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(machine_in: MachineCreate, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    """Creates a new industrial machine in the database (Admin only)."""
    machine = Machine(**machine_in.dict())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine

@router.post("/{machine_id}/anomaly", status_code=status.HTTP_200_OK)
def inject_machine_anomaly(machine_id: int, anomaly_type: str, db: Session = Depends(get_db), current_user=Depends(get_engineer_user)):
    """Injects a specific telemetry anomaly (e.g. bearing_wear, temperature_spike) into a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        
    valid_anomalies = ["bearing_wear", "temperature_spike", "pressure_leak", "motor_overload", "sensor_failure", "voltage_fluctuation", "vibration_increase"]
    if anomaly_type not in valid_anomalies:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid anomaly type. Supported: {valid_anomalies}")
        
    simulator.inject_anomaly(machine_id, anomaly_type)
    return {"message": f"Anomaly '{anomaly_type}' successfully injected into machine '{machine.name}'"}

@router.delete("/{machine_id}/anomaly", status_code=status.HTTP_200_OK)
def clear_machine_anomaly(machine_id: int, db: Session = Depends(get_db), current_user=Depends(get_engineer_user)):
    """Clears any active injected anomaly from a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        
    simulator.clear_anomaly(machine_id)
    return {"message": f"Anomalies cleared for machine '{machine.name}'"}
