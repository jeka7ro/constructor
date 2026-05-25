from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from app.models import WarehouseItem, WarehouseTransaction, Admin, Site, User
from datetime import datetime

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Mock checkout
item_id = "8718279c-287e-4652-9eab-f399b4b76e27"
admin_id = db.query(Admin).first().id

db_item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id).first()
print(f"Found item: {db_item.name}")

site = db.query(Site).first()
user = db.query(User).first()

print(f"Using site: {site.id}")
print(f"Using user: {user.id}")

try:
    db_item.current_site_id = site.id
    db_item.current_holder_id = user.id
    db_item.checked_out_at = datetime.utcnow()

    tx = WarehouseTransaction(
        item_id=item_id,
        transaction_type="OUT",
        quantity=1.0,
        date=datetime.utcnow().date(),
        operated_by_id=admin_id,
        site_id=site.id,
        assigned_to_user_id=user.id,
        notes="Repartizare"
    )
    db.add(tx)
    db.commit()
    print("Success")
except Exception as e:
    db.rollback()
    import traceback
    traceback.print_exc()

