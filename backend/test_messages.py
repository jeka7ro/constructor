from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Append backend directory to path
sys.path.append('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend')
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import WorkOrder, WorkOrderMessage

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

wos_null_created = db.query(WorkOrder).filter(WorkOrder.created_at == None).count()
print(f"WOs with null created_at: {wos_null_created}")

wos_null_updated = db.query(WorkOrder).filter(WorkOrder.updated_at == None).count()
print(f"WOs with null updated_at: {wos_null_updated}")

msgs_null_created = db.query(WorkOrderMessage).filter(WorkOrderMessage.created_at == None).count()
print(f"Messages with null created_at: {msgs_null_created}")

