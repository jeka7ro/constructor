import sys
import os

sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import WarehouseItem, WarehouseTransaction, User, Site

engine = create_engine('sqlite:///pontaj.db')
Session = sessionmaker(bind=engine)
db = Session()

motorina = db.query(WarehouseItem).filter(WarehouseItem.name.ilike('%motorina%')).first()
if not motorina:
    print("Nu s-a gasit motorina")
    sys.exit(0)

print(f"Item: {motorina.name} (ID: {motorina.id})")

txs = db.query(WarehouseTransaction).filter(WarehouseTransaction.item_id == motorina.id).all()
print("Transactions:")
for t in txs:
    user_name = db.query(User).filter(User.id == t.assigned_to_user_id).first().full_name if t.assigned_to_user_id else "N/A"
    site_name = db.query(Site).filter(Site.id == t.site_id).first().name if t.site_id else "N/A"
    print(f"- ID: {t.id} | TYPE: {t.transaction_type} | QTY: {t.quantity} | USER: {user_name} | SITE: {site_name} | NOTES: {t.notes}")
