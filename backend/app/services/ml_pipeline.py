import os
import pickle
import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from typing import Dict, List, Tuple, Any

# Target paths for model artifacts and data
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
MODEL_PATH = os.path.join(DATA_DIR, "models.pkl")
CSV_PATH = os.path.join(DATA_DIR, "sensor_dataset.csv")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)

# Sensor ranges per machine type
MACHINE_PROFILES = {
    "cnc": {
        "temp_range": (35.0, 75.0),       # °C
        "press_range": (1.0, 4.0),        # bar (coolant)
        "rpm_range": (4000.0, 10000.0),    # RPM
        "vib_range": (1.0, 3.5),          # mm/s
        "volt_range": (380.0, 415.0),     # V
        "curr_range": (8.0, 22.0),        # A
        "hum_range": (30.0, 50.0),        # %
        "rul_max": 2500.0                 # operating hours max
    },
    "robotic_arm": {
        "temp_range": (30.0, 65.0),       # °C
        "press_range": (0.8, 1.5),        # bar (ambient/hydraulic gripper)
        "rpm_range": (20.0, 120.0),       # Joint RPM equivalents
        "vib_range": (0.5, 2.5),          # mm/s
        "volt_range": (24.0, 48.0),       # V
        "curr_range": (2.0, 12.0),        # A
        "hum_range": (30.0, 50.0),        # %
        "rul_max": 3000.0
    },
    "pump": {
        "temp_range": (40.0, 85.0),       # °C
        "press_range": (60.0, 220.0),     # bar (hydraulic pressure)
        "rpm_range": (1200.0, 2800.0),    # RPM
        "vib_range": (2.0, 6.0),          # mm/s
        "volt_range": (400.0, 480.0),     # V
        "curr_range": (15.0, 38.0),       # A
        "hum_range": (40.0, 65.0),        # %
        "rul_max": 2000.0
    }
}

def generate_synthetic_data(num_machines: int = 20, days: int = 365) -> pd.DataFrame:
    """
    Generates 1 year of realistic synthetic sensor logs for 20 machines.
    Every machine runs, accumulating operating hours and occasionally failing.
    """
    print(f"Generating synthetic sensor dataset for {num_machines} machines over {days} days...")
    
    np.random.seed(42)
    records = []
    
    # Define our 20 machines
    machines = []
    types_pool = ["cnc", "robotic_arm", "pump"]
    for i in range(1, num_machines + 1):
        m_type = types_pool[(i - 1) % 3]
        machines.append({
            "id": i,
            "type": m_type,
            "install_date": datetime.datetime.now() - datetime.timedelta(days=np.random.randint(100, 700)),
            "accumulated_hours": float(np.random.randint(500, 5000)),
            # Tracks when the next failure will occur (hours until failure)
            "hours_to_failure": float(np.random.randint(300, MACHINE_PROFILES[m_type]["rul_max"]))
        })
    
    start_time = datetime.datetime.now() - datetime.timedelta(days=days)
    
    # We log data every 12 hours to keep the synthetic file size manageable but rich (2 readings per day per machine)
    steps = days * 2
    
    for step in range(steps):
        current_time = start_time + datetime.timedelta(hours=step * 12)
        
        for m in machines:
            m_type = m["type"]
            profile = MACHINE_PROFILES[m_type]
            
            # Increment hours run
            hours_increment = float(np.random.uniform(8.0, 11.5))
            m["accumulated_hours"] += hours_increment
            m["hours_to_failure"] -= hours_increment
            
            # Reset machine if it failed
            failed_this_step = False
            if m["hours_to_failure"] <= 0:
                failed_this_step = True
                m["hours_to_failure"] = float(np.random.randint(800, profile["rul_max"]))
                # Simulate repair downtime: subtract some operating hours context or just reset
            
            # Determine health status based on hours to failure
            rul = max(0.0, m["hours_to_failure"])
            rul_ratio = rul / profile["rul_max"]
            
            # Normal sensor telemetry generation
            t_min, t_max = profile["temp_range"]
            p_min, p_max = profile["press_range"]
            r_min, r_max = profile["rpm_range"]
            v_min, v_max = profile["vib_range"]
            vt_min, vt_max = profile["volt_range"]
            c_min, c_max = profile["curr_range"]
            h_min, h_max = profile["hum_range"]
            
            # Build baseline sensors with random noise
            temp = np.random.uniform(t_min, t_max)
            press = np.random.uniform(p_min, p_max)
            rpm = np.random.uniform(r_min, r_max)
            vib = np.random.uniform(v_min, v_max)
            volt = np.random.uniform(vt_min, vt_max)
            curr = np.random.uniform(c_min, c_max)
            hum = np.random.uniform(h_min, h_max)
            
            # If machine is nearing failure (RUL < 15% of max), sensors degrade (anomaly starts showing)
            failure_imminent = rul_ratio < 0.15
            failure_label = 1 if (rul_ratio < 0.05 or failed_this_step) else 0
            
            if failure_imminent:
                # Add failure-related drift based on machine type
                if m_type == "cnc":
                    # Spindle spindle friction: higher vib, higher temperature, higher current draw
                    vib += np.random.uniform(1.5, 4.0)
                    temp += np.random.uniform(10.0, 25.0)
                    curr += np.random.uniform(4.0, 10.0)
                elif m_type == "robotic_arm":
                    # Joint friction / lubrication breakdown: temperature spike, current spikes, voltage drops
                    temp += np.random.uniform(8.0, 20.0)
                    curr += np.random.uniform(3.0, 8.0)
                    volt -= np.random.uniform(2.0, 5.0)
                    vib += np.random.uniform(1.0, 3.0)
                elif m_type == "pump":
                    # Hydraulic leakage or cavitation: pressure drops significantly, vibration surges, temperature surges
                    press -= np.random.uniform(20.0, 50.0)
                    vib += np.random.uniform(2.5, 5.5)
                    temp += np.random.uniform(12.0, 22.0)
            
            # Basic validation to ensure ranges don't drop below 0
            press = max(0.1, press)
            vib = max(0.1, vib)
            curr = max(0.1, curr)
            volt = max(0.1, volt)
            
            records.append({
                "Timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "Machine_ID": m["id"],
                "Machine_Type": m_type,
                "Temperature": round(temp, 2),
                "Pressure": round(press, 2),
                "RPM": round(rpm, 2),
                "Vibration": round(vib, 2),
                "Voltage": round(volt, 2),
                "Current": round(curr, 2),
                "Humidity": round(hum, 2),
                "Operating_Hours": round(m["accumulated_hours"], 2),
                "Remaining_Useful_Life": round(rul, 2),
                "Failure_Label": failure_label
            })
            
    df = pd.DataFrame(records)
    df.to_csv(CSV_PATH, index=False)
    print(f"Synthetic dataset saved to {CSV_PATH} ({len(df)} rows).")
    return df

def clean_and_preprocess(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    Cleans missing values and prepares feature columns for training.
    """
    # Fill numeric NaNs with median, categorical with mode
    for col in df.columns:
        if df[col].dtype in [np.float64, np.float32, np.int64, np.int32]:
            df[col] = df[col].fillna(df[col].median())
        else:
            df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "")
            
    # Feature columns
    feature_cols = [
        "Temperature", "Pressure", "RPM", "Vibration", 
        "Voltage", "Current", "Humidity", "Operating_Hours"
    ]
    return df, feature_cols

def train_ml_models() -> Dict[str, Any]:
    """
    Executes the complete machine learning training pipeline:
    1. Loads dataset (generates if missing).
    2. Cleans & preprocesses.
    3. Normalizes features.
    4. Trains Isolation Forest (Anomaly Detection).
    5. Trains Random Forest Classifier (Failure Risk Probability).
    6. Trains Random Forest Regressor (RUL Prediction).
    7. Evaluates models and saves artifacts.
    """
    if not os.path.exists(CSV_PATH):
        df = generate_synthetic_data()
    else:
        df = pd.read_csv(CSV_PATH)
        
    df, features = clean_and_preprocess(df)
    
    X = df[features]
    y_class = df["Failure_Label"]
    y_reg = df["Remaining_Useful_Life"]
    
    # Train-test split (80/20)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_class_train, y_class_test = y_class.iloc[:split_idx], y_class.iloc[split_idx:]
    y_reg_train, y_reg_test = y_reg.iloc[:split_idx], y_reg.iloc[split_idx:]
    
    # Feature Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 1. Anomaly Detector (Isolation Forest)
    anomaly_detector = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    anomaly_detector.fit(X_train_scaled)
    
    # 2. Failure Risk Classifier (Random Forest Classifier)
    classifier = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    classifier.fit(X_train_scaled, y_class_train)
    
    # 3. RUL Regressor (Random Forest Regressor)
    regressor = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    regressor.fit(X_train_scaled, y_reg_train)
    
    # Evaluate Classifier
    y_class_pred = classifier.predict(X_test_scaled)
    y_class_prob = classifier.predict_proba(X_test_scaled)[:, 1]
    
    accuracy = float(accuracy_score(y_class_test, y_class_pred))
    precision = float(precision_score(y_class_test, y_class_pred, zero_division=0))
    recall = float(recall_score(y_class_test, y_class_pred, zero_division=0))
    f1 = float(f1_score(y_class_test, y_class_pred, zero_division=0))
    
    try:
        roc_auc = float(roc_auc_score(y_class_test, y_class_prob))
    except Exception:
        roc_auc = 0.5
        
    cm = confusion_matrix(y_class_test, y_class_pred).tolist()
    
    # Calculate Feature Importances (used for SHAP approximation on frontend)
    importances = classifier.feature_importances_
    feature_importance_dict = {feat: float(imp) for feat, imp in zip(features, importances)}
    
    # Package models and configuration
    pipeline_data = {
        "scaler": scaler,
        "classifier": classifier,
        "regressor": regressor,
        "anomaly_detector": anomaly_detector,
        "features": features,
        "stats": {
            "trained_at": datetime.datetime.utcnow().isoformat(),
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "roc_auc": roc_auc,
            "confusion_matrix": cm,
            "feature_importance": feature_importance_dict,
            "status": "active"
        }
    }
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline_data, f)
        
    print("ML Models successfully trained and persisted.")
    return pipeline_data["stats"]

def load_ml_pipeline() -> Dict[str, Any]:
    """
    Loads saved model artifacts. If missing, runs training first.
    """
    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Running training pipeline...")
        train_ml_models()
        
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

def run_inference(sensor_dict: Dict[str, float]) -> Dict[str, Any]:
    """
    Performs inference on a single live sensor reading.
    Returns:
      - failure_probability (float)
      - predicted_rul (float)
      - is_anomaly (bool)
      - explanation (dict of features and their contributions/SHAP approximations)
    """
    pipeline = load_ml_pipeline()
    scaler = pipeline["scaler"]
    classifier = pipeline["classifier"]
    regressor = pipeline["regressor"]
    anomaly_detector = pipeline["anomaly_detector"]
    features = pipeline["features"]
    
    # Convert input dict to array
    input_data = [sensor_dict[feat] for feat in features]
    input_df = pd.DataFrame([input_data], columns=features)
    
    # Scale input
    input_scaled = scaler.transform(input_df)
    
    # 1. Failure Probability
    prob = float(classifier.predict_proba(input_scaled)[0][1])
    
    # 2. Predicted RUL (in hours)
    predicted_rul = float(regressor.predict(input_scaled)[0])
    
    # 3. Anomaly Detection
    anomaly_score = anomaly_detector.predict(input_scaled)[0]
    is_anomaly = anomaly_score == -1
    
    # 4. Custom Explainable AI (SHAP-value approximation)
    # We calculate the deviation of each feature from the training scale mean, weighted by the model feature importances
    # to show which features pushed the model towards a failure prediction.
    explanation = {}
    means = scaler.mean_
    scales = scaler.scale_
    importances = classifier.feature_importances_
    
    for i, feat in enumerate(features):
        val = sensor_dict[feat]
        scaled_val = (val - means[i]) / scales[i]
        
        # Approximate impact: sign is direction (+ if abnormally high/low based on typical failure patterns)
        # Weight by feature importance
        impact = scaled_val * importances[i]
        explanation[feat] = {
            "value": val,
            "deviation": float(scaled_val),
            "impact": float(impact),
            "importance": float(importances[i])
        }
        
    return {
        "failure_probability": prob,
        "predicted_rul": max(0.0, predicted_rul),
        "is_anomaly": is_anomaly,
        "explanations": explanation
    }
