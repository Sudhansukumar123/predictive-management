from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.models.models import InventoryItem, Machine
from app.schemas.schemas import InventoryItemResponse, InventoryItemUpdate
from app.api.deps import get_operator_user, get_engineer_user

router = APIRouter()

@router.get("/", response_model=List[InventoryItemResponse])
def get_inventory(db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """Fetches list of all spare parts inventory items."""
    return db.query(InventoryItem).all()

@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: int,
    item_in: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_engineer_user)
):
    """Updates stock levels, cost, or minimum threshold of a spare parts item (Engineer or Admin)."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
        
    update_data = item_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
        
    db.commit()
    db.refresh(item)
    return item

@router.get("/recommendations")
def get_predictive_inventory_recommendations(db: Session = Depends(get_db), current_user=Depends(get_operator_user)):
    """
    Correlates machine Remaining Useful Life (RUL) predictions with spare-part stock levels.
    Generates intelligent reordering recommendations based on lead times and imminent failures.
    """
    machines = db.query(Machine).all()
    inventory = db.query(InventoryItem).all()
    
    recommendations = []
    
    # Simple keyword mapper to associate inventory spare parts to machines
    # Spindle Ball Bearing -> cnc, hydraulic seals -> pump, grease/oil -> robotic_arm
    for m in machines:
        # Only look at machines with warning/critical statuses or lower RUL
        if m.rul_hours < 100.0 or m.status in ["warning", "critical"]:
            associated_part = None
            if m.type == "cnc":
                associated_part = next((item for item in inventory if "bearing" in item.name.lower()), None)
            elif m.type == "pump":
                associated_part = next((item for item in inventory if "seal" in item.name.lower()), None)
            elif m.type == "robotic_arm":
                associated_part = next((item for item in inventory if "lubricat" in item.name.lower() or "servo" in item.name.lower()), None)
                
            if associated_part:
                # Estimate if parts will arrive in time
                # Convert RUL operating hours to calendar days assuming 18 operating hours per day
                rul_days = m.rul_hours / 18.0
                lead_time = associated_part.lead_time_days
                
                stock_risk = False
                action_required = "None"
                
                if associated_part.stock_level == 0:
                    stock_risk = True
                    action_required = "ORDER IMMEDIATELY (Out of Stock)"
                elif associated_part.stock_level < associated_part.minimum_stock:
                    stock_risk = True
                    action_required = "REORDER STOCK (Below minimum safety levels)"
                elif rul_days < lead_time:
                    stock_risk = True
                    action_required = f"EXPEDITE ORDER (Lead time {lead_time} days exceeds RUL {round(rul_days, 1)} days)"
                    
                recommendations.append({
                    "machine_id": m.id,
                    "machine_name": m.name,
                    "machine_status": m.status,
                    "predicted_rul_hours": m.rul_hours,
                    "associated_part_id": associated_part.id,
                    "part_name": associated_part.name,
                    "part_number": associated_part.part_number,
                    "current_stock": associated_part.stock_level,
                    "minimum_safety_stock": associated_part.minimum_stock,
                    "part_lead_time_days": lead_time,
                    "estimated_rul_days": round(rul_days, 1),
                    "stock_risk": stock_risk,
                    "action_required": action_required,
                    "unit_cost": associated_part.unit_cost
                })
                
    return recommendations
