from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import (
    Base, ConstructionSite, VehicleSiteAssignment, Vehicle, 
    WarehouseTransaction, WarehouseItem, User, Team, TeamMember,
    TimesheetSegment, Timesheet, SitePhoto
)
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

site_id = "395a3c02-a5bf-4d6a-ae7f-d35875fa2972"

print("Querying warehouse...")
wh_query = db.query(WarehouseTransaction, WarehouseItem, User).join(
    WarehouseItem, WarehouseTransaction.item_id == WarehouseItem.id
).outerjoin(
    User, WarehouseTransaction.assigned_to_user_id == User.id
).filter(WarehouseTransaction.site_id == site_id)

wh_transactions = wh_query.order_by(WarehouseTransaction.created_at.desc()).all()

warehouse_list = [
    {
        "id": t.id,
        "tx_type": t.transaction_type,
        "quantity": t.quantity,
        "created_at": str(t.created_at),
        "item_name": item.name,
        "item_sku": item.category,
        "user_name": u.full_name if u else "N/A"
    }
    for t, item, u in wh_transactions
]
print("Warehouse:", len(warehouse_list))

print("Done")
