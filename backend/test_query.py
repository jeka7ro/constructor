import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import WarehouseItem, WarehouseTransaction, User
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
db = Session()

start = time.time()
print("Starting query...")
items = db.query(WarehouseItem, User.full_name.label("holder_name")).outerjoin(User, WarehouseItem.current_holder_id == User.id).all()
print(f"Items query took {time.time() - start:.2f}s")
print(f"Found {len(items)} items")

if items:
    from sqlalchemy import func
    start_stats = time.time()
    stats = db.query(
        WarehouseTransaction.item_id,
        WarehouseTransaction.transaction_type,
        func.sum(WarehouseTransaction.quantity).label('total')
    ).filter(WarehouseTransaction.item_id.in_([i[0].id for i in items])).group_by(WarehouseTransaction.item_id, WarehouseTransaction.transaction_type).all()
    print(f"Stats query took {time.time() - start_stats:.2f}s")
    print(f"Found {len(stats)} stats")
