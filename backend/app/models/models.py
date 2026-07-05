import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="operator")  # admin, engineer, operator
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  # cnc, robotic_arm, pump
    specifications = Column(String, nullable=True)  # JSON-formatted string
    status = Column(String, default="healthy")  # healthy, warning, critical
    installation_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Live stats
    health_score = Column(Float, default=100.0)
    oee = Column(Float, default=85.0)  # Overall Equipment Effectiveness (%)
    rul_hours = Column(Float, default=2000.0)  # Remaining Useful Life in operating hours
    
    sensor_readings = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    rpm = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    voltage = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    operating_hours = Column(Float, nullable=False)
    
    # ML model labels
    failure_probability = Column(Float, default=0.0)
    failure_label = Column(Integer, default=0)  # 0: normal, 1: failure predicted
    anomaly_label = Column(Integer, default=0)  # 0: normal, 1: anomaly detected
    anomaly_reason = Column(String, nullable=True)

    machine = relationship("Machine", back_populates="sensor_readings")

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    priority = Column(String, default="medium")  # critical, high, medium, low
    status = Column(String, default="scheduled")  # scheduled, in_progress, completed
    scheduled_date = Column(DateTime, nullable=False)
    assigned_engineer = Column(String, nullable=True)
    estimated_downtime_hours = Column(Float, default=2.0)
    completed_date = Column(DateTime, nullable=True)
    resolution_notes = Column(String, nullable=True)

    machine = relationship("Machine", back_populates="maintenance_tasks")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    part_number = Column(String, unique=True, nullable=False)
    stock_level = Column(Integer, default=0)
    minimum_stock = Column(Integer, default=5)
    location = Column(String, nullable=True)  # warehouse aisle, etc.
    unit_cost = Column(Float, default=0.0)
    lead_time_days = Column(Integer, default=3)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String, nullable=False)  # critical, warning, info
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)

    machine = relationship("Machine", back_populates="alerts")
