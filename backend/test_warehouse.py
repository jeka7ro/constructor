import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import WarehouseTransaction, WarehouseItem
from sqlalchemy import desc

db = SessionLocal()
user_id = "31e919c6-6a71-4742-8442-7df8dfa5df0a"
try:
    txs = db.query(WarehouseTransaction).join(WarehouseItem).filter(
        WarehouseTransaction.assigned_to_user_id == user_id
    ).order_by(desc(WarehouseTransaction.created_at)).limit(50).all()
    print("Warehouse transactions:", len(txs))
except Exception as e:
    import traceback
    traceback.print_exc()

