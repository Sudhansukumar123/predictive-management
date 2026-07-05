import io
import pandas as pd
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.models import Machine, SensorReading
from app.api.deps import get_engineer_user
from app.services.ml_pipeline import clean_and_preprocess, train_ml_models, run_inference

router = APIRouter()

@router.post("/upload-csv", status_code=status.HTTP_201_CREATED)
async def upload_csv_sensor_data(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user=Depends(get_engineer_user)
):
    """
    Accepts CSV sensor data upload. Cleans, parses, and populates the database
    with telemetry logs, and triggers a model retrain.
    CSV format required: Timestamp, Machine_ID, Temperature, Pressure, RPM, Vibration, Voltage, Current, Humidity, Operating_Hours, Failure_Label
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file format. Please upload a .csv file."
        )
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading CSV file: {e}"
        )
        
    required_cols = [
        "Timestamp", "Machine_ID", "Temperature", "Pressure", 
        "RPM", "Vibration", "Voltage", "Current", "Humidity", "Operating_Hours", "Failure_Label"
    ]
    
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns in CSV: {missing_cols}"
        )
        
    # Clean data using ML pipeline preprocessor
    df, features = clean_and_preprocess(df)
    
    records_added = 0
    
    try:
        # Get list of valid machines in database
        valid_machine_ids = {m.id: m for m in db.query(Machine).all()}
        
        for _, row in df.iterrows():
            m_id = int(row["Machine_ID"])
            
            # Skip rows pointing to non-existent machine IDs
            if m_id not in valid_machine_ids:
                continue
                
            machine = valid_machine_ids[m_id]
            
            # Format timestamp
            try:
                ts = pd.to_datetime(row["Timestamp"])
            except Exception:
                ts = datetime.datetime.utcnow()
                
            # Perform inference on row features
            sensor_dict = {feat: float(row[feat]) for feat in features}
            inference_result = run_inference(sensor_dict)
            
            # Add reading to db
            db_reading = SensorReading(
                machine_id=m_id,
                timestamp=ts,
                temperature=sensor_dict["Temperature"],
                pressure=sensor_dict["Pressure"],
                rpm=sensor_dict["RPM"],
                vibration=sensor_dict["Vibration"],
                voltage=sensor_dict["Voltage"],
                current=sensor_dict["Current"],
                humidity=sensor_dict["Humidity"],
                operating_hours=sensor_dict["Operating_Hours"],
                failure_probability=round(inference_result["failure_probability"], 4),
                failure_label=int(row["Failure_Label"]),
                anomaly_label=1 if inference_result["is_anomaly"] else 0,
                anomaly_reason="ML Model flagged anomaly" if inference_result["is_anomaly"] else None
            )
            db.add(db_reading)
            records_added += 1
            
            # Periodically flush
            if records_added % 250 == 0:
                db.commit()
                
        db.commit()
        
        # Trigger model retraining as new data is present
        print("CSV upload completed. Retraining models with new data...")
        train_ml_models()
        
        return {
            "message": f"Successfully processed and loaded {records_added} telemetry records.",
            "records_imported": records_added,
            "models_retrained": True
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database load error: {e}"
        )
