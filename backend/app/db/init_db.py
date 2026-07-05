import datetime
from sqlalchemy.orm import Session
from app.core.db import engine, Base
from app.core.security import get_password_hash
from app.models.models import User, Machine, InventoryItem
from app.services.ml_pipeline import train_ml_models

def seed_db(db: Session):
    # 1. Create Tables
    Base.metadata.create_all(bind=engine)

    # 2. Seed Users if empty
    if db.query(User).count() == 0:
        print("Seeding default users...")
        users = [
            User(
                email="admin@factory.com",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                full_name="System Administrator",
                is_active=True
            ),
            User(
                email="engineer@factory.com",
                hashed_password=get_password_hash("engineer123"),
                role="engineer",
                full_name="Maintenance Engineer",
                is_active=True
            ),
            User(
                email="operator@factory.com",
                hashed_password=get_password_hash("operator123"),
                role="operator",
                full_name="Machine Operator",
                is_active=True
            ),
        ]
        db.add_all(users)
        db.commit()

    # 3. Seed Machines if empty
    if db.query(Machine).count() == 0:
        print("Seeding machines...")
        machines = []
        types_pool = ["cnc", "robotic_arm", "pump"]
        names_pool = {
            "cnc": ["CNC Milling Center A", "Precision CNC Mill B", "CNC Lathe Router C", "5-Axis Milling Machine D", "Heavy Duty CNC Mill E", "CNC Drilling Machine F", "Vertical Machining Center G"],
            "robotic_arm": ["Assembly Robotic Arm A", "Welding Robotic Arm B", "Palletizing Arm C", "Sorting Robotic Arm D", "Precision Picker E", "Material Handler F", "Heavy Loader Arm G"],
            "pump": ["Hydraulic Pump Unit A", "Main Coolant Pump B", "Lubrication Oil Pump C", "Water Circulation Pump D", "High Pressure Pump E", "Fuel Transfer Pump F"]
        }
        
        # We need exactly 20 machines
        for i in range(1, 21):
            m_type = types_pool[(i - 1) % 3]
            # Get list of names for type, retrieve and cycle if needed
            names_list = names_pool[m_type]
            name = names_list[(i - 1) // 3 % len(names_list)]
            if i > len(names_list) * 3:
                name = f"{name} #{i}"
            
            # Different machines have different starting health and OEE
            install_days_ago = (i * 25) + 120
            install_date = datetime.datetime.utcnow() - datetime.timedelta(days=install_days_ago)
            
            machines.append(Machine(
                name=name,
                type=m_type,
                specifications=f'{{"manufacturer": "IndustryCorp", "model": "V{i}-Pro", "voltage_rating": "{"400V" if m_type == "pump" or m_type == "cnc" else "24V"}"}}',
                status="healthy",
                health_score=round(float(92.0 + (i % 8)), 2),
                oee=round(float(80.0 + (i % 15)), 2),
                rul_hours=round(float(1200.0 + (i * 50)), 2),
                installation_date=install_date
            ))
        db.add_all(machines)
        db.commit()

    # 4. Seed Inventory items if empty
    if db.query(InventoryItem).count() == 0:
        print("Seeding inventory items...")
        items = [
            InventoryItem(name="Spindle Spindle Ball Bearing", part_number="BRG-CNC-001", stock_level=12, minimum_stock=4, location="Aisle A - Shelf 3", unit_cost=150.0, lead_time_days=2),
            InventoryItem(name="V-Belt Spindle Drive", part_number="BLT-CNC-022", stock_level=3, minimum_stock=5, location="Aisle A - Shelf 4", unit_cost=45.0, lead_time_days=3),
            InventoryItem(name="High-Performance joint Lubricating Oil", part_number="LUB-ARM-909", stock_level=20, minimum_stock=6, location="Aisle B - Cabinet 1", unit_cost=30.0, lead_time_days=1),
            InventoryItem(name="Joint Servo Controller Card", part_number="CRD-ARM-110", stock_level=2, minimum_stock=2, location="Aisle B - Cabinet 3", unit_cost=850.0, lead_time_days=7),
            InventoryItem(name="Heavy Duty Hydraulic Seal Kit", part_number="SEL-PMP-404", stock_level=15, minimum_stock=5, location="Aisle C - Drawer 2", unit_cost=80.0, lead_time_days=2),
            InventoryItem(name="High-Pressure Valve Relief Fitting", part_number="VAL-PMP-502", stock_level=4, minimum_stock=3, location="Aisle C - Drawer 5", unit_cost=220.0, lead_time_days=4),
            InventoryItem(name="Standard Voltage Regulator Card", part_number="REG-GEN-777", stock_level=6, minimum_stock=2, location="Aisle D - Shelf 1", unit_cost=180.0, lead_time_days=5)
        ]
        db.add_all(items)
        db.commit()
        
    # 5. Pre-train ML Models so files are ready
    print("Pre-training machine learning models...")
    train_ml_models()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    from app.core.db import SessionLocal
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
