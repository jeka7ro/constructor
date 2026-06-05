import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Timesheet, TimesheetSegment, EquipmentDailyLog, AccommodationAssignment, Accommodation, ConstructionSite, WarehouseTransaction, WarehouseItem
from sqlalchemy import func, desc
import datetime

db = SessionLocal()
user_id = "31e919c6-6a71-4742-8442-7df8dfa5df0a"
user = db.query(User).filter(User.id == user_id).first()
print("User found:", user is not None)

today = datetime.date.today()
first_day_of_month = today.replace(day=1)

site_id = user.site_id
site_avg_hours = 0
site_avg_fuel = 0

if site_id:
    site_users = db.query(User).filter(User.site_id == site_id, User.is_active == True).all()
    site_user_ids = [u.id for u in site_users]
    num_users = len(site_user_ids)
    print("Site users:", num_users)
    if num_users > 0:
        site_equipment_fuel = db.query(func.sum(EquipmentDailyLog.refuel_liters)).filter(
            EquipmentDailyLog.operator_id.in_(site_user_ids),
            EquipmentDailyLog.date >= first_day_of_month,
            EquipmentDailyLog.date <= today
        ).scalar() or 0
        
        site_warehouse_fuel = db.query(func.sum(WarehouseTransaction.quantity)).join(WarehouseItem).filter(
            WarehouseTransaction.assigned_to_user_id.in_(site_user_ids),
            WarehouseTransaction.transaction_type == "CONSUME",
            WarehouseItem.category == "COMBUSTIBIL",
            WarehouseTransaction.date >= first_day_of_month,
            WarehouseTransaction.date <= today
        ).scalar() or 0
        
        site_avg_fuel = (float(site_equipment_fuel) + float(site_warehouse_fuel)) / num_users

user_segments = db.query(TimesheetSegment).join(Timesheet).filter(
    Timesheet.owner_user_id == user_id,
    Timesheet.date >= first_day_of_month,
    Timesheet.date <= today
).all()
print("User segments:", len(user_segments))

equipment_fuel = db.query(func.sum(EquipmentDailyLog.refuel_liters)).filter(
    EquipmentDailyLog.operator_id == user_id,
    EquipmentDailyLog.date >= first_day_of_month,
    EquipmentDailyLog.date <= today
).scalar() or 0
print("Equipment fuel:", equipment_fuel)

warehouse_fuel = db.query(func.sum(WarehouseTransaction.quantity)).join(WarehouseItem).filter(
    WarehouseTransaction.assigned_to_user_id == user_id,
    WarehouseTransaction.transaction_type == "CONSUME",
    WarehouseItem.category == "COMBUSTIBIL",
    WarehouseTransaction.date >= first_day_of_month,
    WarehouseTransaction.date <= today
).scalar() or 0
print("Warehouse fuel:", warehouse_fuel)

print("Done successfully")
