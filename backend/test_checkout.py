from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from app.models import WarehouseItem, WarehouseTransaction, Admin
from datetime import datetime
import uuid

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Mock checkout
item_id = "8718279c-287e-4652-9eab-f399b4b76e27"
admin_id = db.query(Admin).first().id

db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id).first()
print(f"Found item: {db_item.name}")

site_id_val = "f2a24c7f-9ed3-4ff0-bde6-cdca67f334a1" # Just a fake UUID
user_id_val = "5e022f18-6205-4c59-bfd0-1a735602484f" # Just a fake UUID

try:
    db_item.current_site_id = site_id_val
    db_item.current_holder_id = user_id_val
    db_item.checked_out_at = datetime.utcnow()

    tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type="OUT",
        quantity=1.0,
        date=datetime.utcnow().date(),
        operated_by_id=admin_id,
        site_id=site_id_val,
        assigned_to_user_id=user_id_val,
        notes="Repartizare"
    )
    db.add(tx)
    db.commit()
    print("Success")
except Exception as e:
    db.rollback()
    import traceback
    traceback.print_exc()

