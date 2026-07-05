from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: str = "operator"
    full_name: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# Sensor Reading Schemas
class SensorReadingBase(BaseModel):
    temperature: float
    pressure: float
    rpm: float
    vibration: float
    voltage: float
    current: float
    humidity: float
    operating_hours: float

class SensorReadingCreate(SensorReadingBase):
    machine_id: int

class SensorReadingResponse(SensorReadingBase):
    id: int
    machine_id: int
    timestamp: datetime
    failure_probability: float
    failure_label: int
    anomaly_label: int
    anomaly_reason: Optional[str] = None

    class Config:
        from_attributes = True

# Machine Schemas
class MachineBase(BaseModel):
    name: str
    type: str  # cnc, robotic_arm, pump
    specifications: Optional[str] = None
    status: Optional[str] = "healthy"
    health_score: Optional[float] = 100.0
    oee: Optional[float] = 85.0
    rul_hours: Optional[float] = 2000.0

class MachineCreate(MachineBase):
    pass

class MachineResponse(MachineBase):
    id: int
    installation_date: datetime

    class Config:
        from_attributes = True

class MachineDetailResponse(MachineResponse):
    recent_readings: List[SensorReadingResponse] = []
    
    class Config:
        from_attributes = True

# Maintenance Task Schemas
class MaintenanceTaskBase(BaseModel):
    machine_id: int
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # critical, high, medium, low
    status: str = "scheduled"  # scheduled, in_progress, completed
    scheduled_date: datetime
    assigned_engineer: Optional[str] = None
    estimated_downtime_hours: Optional[float] = 2.0
    resolution_notes: Optional[str] = None

class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass

class MaintenanceTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    assigned_engineer: Optional[str] = None
    estimated_downtime_hours: Optional[float] = None
    completed_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None

class MaintenanceTaskResponse(MaintenanceTaskBase):
    id: int
    completed_date: Optional[datetime] = None
    machine: Optional[MachineResponse] = None

    class Config:
        from_attributes = True

# Inventory Item Schemas
class InventoryItemBase(BaseModel):
    name: str
    part_number: str
    stock_level: int
    minimum_stock: int
    location: Optional[str] = None
    unit_cost: float
    lead_time_days: int

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    stock_level: Optional[int] = None
    minimum_stock: Optional[int] = None
    unit_cost: Optional[float] = None

class InventoryItemResponse(InventoryItemBase):
    id: int

    class Config:
        from_attributes = True

# Alert Schemas
class AlertBase(BaseModel):
    machine_id: int
    severity: str  # critical, warning, info
    message: str
    acknowledged: bool = False

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    timestamp: datetime
    machine: Optional[MachineResponse] = None

    class Config:
        from_attributes = True

# ML Pipeline Info Schema
class PipelineStatsResponse(BaseModel):
    trained_at: datetime
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: List[List[int]]
    feature_importance: Dict[str, float]
    status: str
