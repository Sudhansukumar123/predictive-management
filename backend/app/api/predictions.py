from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.api.deps import get_engineer_user, get_operator_user
from app.models.models import Machine
from app.schemas.schemas import PipelineStatsResponse
from app.services.ml_pipeline import train_ml_models, load_ml_pipeline, run_inference

router = APIRouter()

@router.get("/stats", response_model=PipelineStatsResponse)
def get_ml_stats(current_user=Depends(get_operator_user)):
    """Retrieves metrics and evaluation stats for the active machine learning models."""
    try:
        pipeline = load_ml_pipeline()
        return pipeline["stats"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Model metrics not available. Ensure models are trained. Error: {e}"
        )

@router.post("/retrain", response_model=PipelineStatsResponse)
def trigger_retraining(current_user=Depends(get_engineer_user)):
    """Forces execution of the machine learning preprocessing, training, and evaluation pipeline."""
    try:
        stats = train_ml_models()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training pipeline failed: {e}"
        )

@router.get("/explain/{machine_id}")
def get_prediction_explanation(machine_id: int, db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """
    Returns explainable AI (SHAP approximation) detailing sensor contributions
    to the latest failure prediction for the specified machine.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        
    recent_reading = machine.sensor_readings[-1] if machine.sensor_readings else None
    if not recent_reading:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No sensor telemetry readings available for this machine yet."
        )
        
    sensor_dict = {
        "Temperature": recent_reading.temperature,
        "Pressure": recent_reading.pressure,
        "RPM": recent_reading.rpm,
        "Vibration": recent_reading.vibration,
        "Voltage": recent_reading.voltage,
        "Current": recent_reading.current,
        "Humidity": recent_reading.humidity,
        "Operating_Hours": recent_reading.operating_hours
    }
    
    # Run inference to generate feature contributions
    result = run_inference(sensor_dict)
    
    return {
        "machine_id": machine_id,
        "machine_name": machine.name,
        "failure_probability": result["failure_probability"],
        "predicted_rul_hours": result["predicted_rul"],
        "is_anomaly": result["is_anomaly"],
        "explanations": result["explanations"]
    }
