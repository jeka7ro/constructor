import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import WarehouseTransaction, WarehouseItem, User, Admin
from sqlalchemy import desc

db = SessionLocal()
user_id = "31e919c6-6a71-4742-8442-7df8dfa5df0a"
try:
    transactions = db.query(WarehouseTransaction).filter(
        WarehouseTransaction.assigned_to_user_id == user_id
    ).order_by(desc(WarehouseTransaction.created_at)).all()
    
    all_items = {i.id: i for i in db.query(WarehouseItem).all()}
    all_users = {u.id: u for u in db.query(User).all()}
    print("Warehouse transactions:", len(transactions))
except Exception as e:
    import traceback
    traceback.print_exc()

