import os
import sys

# Add the project root to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Organization, VehicleCategory
import app.models

def seed_categories():
    # Ensure the table is created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    DEFAULT_TYPES = [
        {'name': 'car', 'group': 'car', 'icon': 'car'},
        {'name': 'van', 'group': 'car', 'icon': 'truck'},
        {'name': 'pickup_4x4', 'group': 'car', 'icon': 'truck'},
        {'name': 'truck', 'group': 'car', 'icon': 'truck'},
        {'name': 'excavator', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'grader', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'compactor', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'pile_driver', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'concrete_mixer', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'tractor_trailer', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'forklift', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'telehandler', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'cherry_picker', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'crane_truck', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'crane', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'mobile_workshop', 'group': 'equipment', 'icon': 'tractor'},
        {'name': 'generator', 'group': 'equipment', 'icon': 'zap'},
        {'name': 'other', 'group': 'equipment', 'icon': 'circle'},
    ]
    
    orgs = db.query(Organization).all()
    count = 0
    for org in orgs:
        # Check if already seeded
        existing = db.query(VehicleCategory).filter(VehicleCategory.organization_id == org.id).count()
        if existing == 0:
            for vt in DEFAULT_TYPES:
                cat = VehicleCategory(
                    organization_id=org.id,
                    name=vt['name'],
                    group=vt['group'],
                    icon=vt['icon']
                )
                db.add(cat)
            count += 1
            
    db.commit()
    print(f"✅ Seeded vehicle categories for {count} organizations.")
    db.close()

if __name__ == "__main__":
    seed_categories()
