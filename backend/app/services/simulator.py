import asyncio
import datetime
import random
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.models import Machine, SensorReading, Alert, MaintenanceTask
from app.services.ml_pipeline import run_inference, MACHINE_PROFILES
from app.core.websocket_manager import manager

class TelemetrySimulator:
    def __init__(self):
        # Maps machine_id (int) -> anomaly_type (str)
        self.active_anomalies: Dict[int, str] = {}
        self.is_running = False
        self._task = None

    def inject_anomaly(self, machine_id: int, anomaly_type: str):
        """Injects a specific anomaly type into a machine's telemetry stream."""
        self.active_anomalies[machine_id] = anomaly_type
        print(f"Anomaly '{anomaly_type}' injected into Machine ID {machine_id}")

    def clear_anomaly(self, machine_id: int):
        """Clears all active anomalies for a machine."""
        if machine_id in self.active_anomalies:
            del self.active_anomalies[machine_id]
            print(f"Anomalies cleared for Machine ID {machine_id}")

    async def start(self):
        """Starts the background simulation loop."""
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            print("Telemetry simulation background task started.")

    async def stop(self):
        """Stops the background simulation loop."""
        if self.is_running:
            self.is_running = False
            if self._task:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            print("Telemetry simulation background task stopped.")

    async def _run_loop(self):
        """Main simulation execution loop."""
        while self.is_running:
            try:
                db: Session = SessionLocal()
                try:
                    machines = db.query(Machine).all()
                    for machine in machines:
                        # 1. Generate base sensor values
                        reading_dict = self._generate_telemetry(machine, db)
                        
                        # 2. Perform ML pipeline inference
                        inference_result = run_inference(reading_dict)
                        
                        # 3. Check for threshold-based anomalies
                        anomaly_reason = None
                        is_anomaly = inference_result["is_anomaly"]
                        
                        # Custom hard-limit rules
                        profile = MACHINE_PROFILES[machine.type]
                        if reading_dict["Temperature"] > profile["temp_range"][1] + 15:
                            is_anomaly = True
                            anomaly_reason = "Critical temperature threshold exceeded"
                        elif reading_dict["Vibration"] > profile["vib_range"][1] + 3:
                            is_anomaly = True
                            anomaly_reason = "Vibration levels exceeding safety limits"
                        elif machine.type == "pump" and reading_dict["Pressure"] < profile["press_range"][0] - 25:
                            is_anomaly = True
                            anomaly_reason = "Hydraulic pressure drop (leak suspected)"
                        elif reading_dict["Current"] > profile["curr_range"][1] + 5:
                            is_anomaly = True
                            anomaly_reason = "Motor electrical overload current detected"
                        elif reading_dict["Temperature"] < 5.0 and reading_dict["Vibration"] < 0.1:
                            is_anomaly = True
                            anomaly_reason = "Sensor malfunction or zero telemetry"
                            
                        if is_anomaly and not anomaly_reason:
                            anomaly_reason = "ML Anomaly Detector flagged abnormal operating condition"

                        # 4. Save Sensor Reading
                        db_reading = SensorReading(
                            machine_id=machine.id,
                            timestamp=datetime.datetime.utcnow(),
                            temperature=reading_dict["Temperature"],
                            pressure=reading_dict["Pressure"],
                            rpm=reading_dict["RPM"],
                            vibration=reading_dict["Vibration"],
                            voltage=reading_dict["Voltage"],
                            current=reading_dict["Current"],
                            humidity=reading_dict["Humidity"],
                            operating_hours=reading_dict["Operating_Hours"],
                            failure_probability=round(inference_result["failure_probability"], 4),
                            failure_label=1 if inference_result["failure_probability"] > 0.75 else 0,
                            anomaly_label=1 if is_anomaly else 0,
                            anomaly_reason=anomaly_reason
                        )
                        db.add(db_reading)
                        
                        # 5. Update Machine Health stats
                        base_health = 100.0 - (inference_result["failure_probability"] * 80.0)
                        if is_anomaly:
                            base_health -= 15.0
                        machine.health_score = max(5.0, round(base_health, 2))
                        machine.rul_hours = round(inference_result["predicted_rul"], 1)
                        
                        if machine.health_score < 40.0:
                            machine.status = "critical"
                            machine.oee = round(random.uniform(40.0, 55.0), 2)
                        elif machine.health_score < 75.0:
                            machine.status = "warning"
                            machine.oee = round(random.uniform(65.0, 78.0), 2)
                        else:
                            machine.status = "healthy"
                            machine.oee = round(random.uniform(82.0, 96.0), 2)
                            
                        # 6. Trigger Alerts and Automatic Scheduling
                        if machine.status in ["warning", "critical"] or is_anomaly:
                            severity = "critical" if machine.status == "critical" else "warning"
                            
                            existing_alert = db.query(Alert).filter(
                                Alert.machine_id == machine.id,
                                Alert.acknowledged == False,
                                Alert.timestamp >= datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
                            ).first()
                            
                            if not existing_alert:
                                alert_msg = f"{machine.name}: {anomaly_reason or 'Predictive failure warning'}. (Probability: {round(inference_result['failure_probability'] * 100, 1)}%, RUL: {machine.rul_hours} hrs)"
                                db_alert = Alert(
                                    machine_id=machine.id,
                                    severity=severity,
                                    message=alert_msg,
                                    timestamp=datetime.datetime.utcnow()
                                )
                                db.add(db_alert)
                                
                                print(f"[SMS ALERT] Sent to technician: {alert_msg}")
                                print(f"[EMAIL ALERT] Sent to maintenance@factory.com: {alert_msg}")

                            existing_task = db.query(MaintenanceTask).filter(
                                MaintenanceTask.machine_id == machine.id,
                                MaintenanceTask.status.in_(["scheduled", "in_progress"])
                            ).first()
                            
                            if not existing_task:
                                reco_title, reco_desc = self._get_ai_recommendation(machine.type, anomaly_reason, inference_result)
                                db_task = MaintenanceTask(
                                    machine_id=machine.id,
                                    title=reco_title,
                                    description=reco_desc,
                                    priority=severity,
                                    status="scheduled",
                                    scheduled_date=datetime.datetime.utcnow() + datetime.timedelta(hours=min(24, int(machine.rul_hours * 0.8) + 1)),
                                    assigned_engineer=random.choice(["Alex Rivera", "Elena Rostova", "Marcus Chen", "Sarah Jenkins"]),
                                    estimated_downtime_hours=round(random.uniform(1.5, 4.0), 1)
                                )
                                db.add(db_task)
                                print(f"[SCHEDULER] Automatically scheduled task '{reco_title}' for {machine.name}")
                        
                        db.commit()
                        
                        # 7. Broadcast telemetry via WebSocket
                        payload = {
                            "type": "telemetry",
                            "machine_id": machine.id,
                            "machine_name": machine.name,
                            "machine_type": machine.type,
                            "status": machine.status,
                            "health_score": machine.health_score,
                            "oee": machine.oee,
                            "rul_hours": machine.rul_hours,
                            "sensors": {
                                "temperature": db_reading.temperature,
                                "pressure": db_reading.pressure,
                                "rpm": db_reading.rpm,
                                "vibration": db_reading.vibration,
                                "voltage": db_reading.voltage,
                                "current": db_reading.current,
                                "humidity": db_reading.humidity,
                                "operating_hours": db_reading.operating_hours
                            },
                            "failure_probability": db_reading.failure_probability,
                            "anomaly_label": db_reading.anomaly_label,
                            "anomaly_reason": db_reading.anomaly_reason,
                            "explanations": inference_result["explanations"]
                        }
                        await manager.broadcast(payload)
                        
                except Exception as e:
                    print(f"Error in simulator loop processing machines: {e}")
                    db.rollback()
                finally:
                    db.close()
                    
                await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in simulator execution loop: {e}")
                await asyncio.sleep(5.0)

    def _generate_telemetry(self, machine: Machine, db: Session) -> Dict[str, float]:
        """Generates random telemetry, altered by active anomaly injections."""
        profile = MACHINE_PROFILES[machine.type]
        t_min, t_max = profile["temp_range"]
        p_min, p_max = profile["press_range"]
        r_min, r_max = profile["rpm_range"]
        v_min, v_max = profile["vib_range"]
        vt_min, vt_max = profile["volt_range"]
        c_min, c_max = profile["curr_range"]
        h_min, h_max = profile["hum_range"]

        # Base sensors with normal gaussian fluctuation
        temp = random.uniform(t_min + 5, t_max - 5)
        press = random.uniform(p_min + 0.2, p_max - 0.2)
        rpm = random.uniform(r_min + 200, r_max - 200)
        vib = random.uniform(v_min + 0.2, v_max - 0.2)
        volt = random.uniform(vt_min + 2, vt_max - 2)
        current_val = random.uniform(c_min + 1, c_max - 1)
        hum = random.uniform(h_min + 2, h_max - 2)
        
        machine.rul_hours = max(0.0, machine.rul_hours - 0.5)
        
        # Ingest active injected anomalies
        anomaly = self.active_anomalies.get(machine.id)
        if anomaly:
            if anomaly == "bearing_wear":
                vib = v_max + random.uniform(2.5, 5.0)
                temp = t_max + random.uniform(5.0, 15.0)
                rpm = rpm * 0.95
            elif anomaly == "temperature_spike":
                temp = t_max + random.uniform(20.0, 45.0)
                vib = vib * 1.15
            elif anomaly == "pressure_leak":
                press = max(0.2, press - (press * 0.6))
                temp = temp + 10.0
            elif anomaly == "motor_overload":
                current_val = c_max + random.uniform(8.0, 15.0)
                temp = t_max + random.uniform(12.0, 22.0)
                rpm = rpm * 0.8
            elif anomaly == "sensor_failure":
                temp, press, rpm, vib, volt, current_val, hum = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
            elif anomaly == "voltage_fluctuation":
                volt = volt + random.choice([-1.0, 1.0]) * random.uniform(8.0, 16.0)
                current_val = current_val * (volt / (volt + 0.1))
            elif anomaly == "vibration_increase":
                vib = v_max + random.uniform(4.0, 8.0)
                rpm = rpm * 0.9

        # Fetch last reading using direct query
        last_reading = db.query(SensorReading)\
            .filter(SensorReading.machine_id == machine.id)\
            .order_by(SensorReading.timestamp.desc())\
            .first()
            
        op_hours = float(last_reading.operating_hours + 0.5) if last_reading else 1500.0

        return {
            "Temperature": round(temp, 2),
            "Pressure": round(press, 2),
            "RPM": round(rpm, 2),
            "Vibration": round(vib, 2),
            "Voltage": round(volt, 2),
            "Current": round(current_val, 2),
            "Humidity": round(hum, 2),
            "Operating_Hours": round(op_hours, 2)
        }

    def _get_ai_recommendation(self, m_type: str, reason: str, inference: Dict[str, Any]) -> Tuple[str, str]:
        """AI Recommendation rule engine based on failure patterns."""
        if not reason:
            reason = ""
            
        r_lower = reason.lower()
        
        if "bearing" in r_lower or "vibration" in r_lower:
            return (
                "Spindle Bearing Inspection & Lubrication",
                "Anomaly: Severe vibration detected. Recommended Actions:\n1. Lock out machine spindle.\n2. Inspect bearing races for wear or micro-cracks.\n3. Replenish spindle lubricant.\n4. Replace bearing within 20 operating hours."
            )
        elif "temperature" in r_lower or "heat" in r_lower:
            return (
                "Cooling System Flushing & Radiator Cleanse",
                "Anomaly: Thermal threshold violation. Recommended Actions:\n1. Verify coolant pump operation and pressure.\n2. Inspect heat exchanger/radiator fins for build-up.\n3. Clean air filters and top off cooling fluid levels."
            )
        elif "pressure" in r_lower or "leak" in r_lower:
            return (
                "Hydraulic Seal Replacement & Leak Test",
                "Anomaly: Sudden pressure drop. Recommended Actions:\n1. Trace hydraulic feed and return lines.\n2. Check cylinder seals and joint couplers for signs of leakage.\n3. Tighten or replace blown O-rings immediately."
            )
        elif "overload" in r_lower or "current" in r_lower:
            return (
                "Servo Spindle Driver Calibration",
                "Anomaly: High current draw. Recommended Actions:\n1. Inspect tooling/joint mechanics for binding.\n2. Calibrate spindle amplifier / servo driver electrical limits.\n3. Lubricate slide guides."
            )
        elif "malfunction" in r_lower or "sensor" in r_lower:
            return (
                "Transducer Calibration & Connection Verification",
                "Anomaly: Loss of telemetry sensor streams. Recommended Actions:\n1. Check physical transducer cabling and bus couplings.\n2. Test connector voltage lines.\n3. Replace malfunctioning sensor module."
            )
        
        # Default recommendation based on machine type
        if m_type == "cnc":
            return (
                "Standard CNC Spindle Diagnostic Run",
                "Issue: Declining machine health indicators. Action: Schedule detailed vibration analysis and recalibrate tool-holder alignment."
            )
        elif m_type == "robotic_arm":
            return (
                "Servo Joint Backlash Adjustment",
                "Issue: Unstable motion profile. Action: Inspect joint motor encoders, tighten gear belts, and update servo parameters."
            )
        else:
            return (
                "Hydraulic Pump Maintenance",
                "Issue: Fluid power instability. Action: Run clean oil test, flush pump filter screens, and check relief valve activation limits."
            )

simulator = TelemetrySimulator()
