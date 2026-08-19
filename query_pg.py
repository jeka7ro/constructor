import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import the models from the backend
import sys
sys.path.append(os.path.abspath('backend'))

from app.models import User, Team, TeamMember, WorkOrder

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- USERS ---")
users = db.query(User).filter(User.full_name.ilike('%Petrea%') | User.full_name.ilike('%Mateo%')).all()
for u in users:
    print(f"User: {u.id} | {u.full_name}")

print("\n--- TEAMS ---")
teams = db.query(Team).filter(Team.name.ilike('%Petrea%') | Team.name.ilike('%Mateo%')).all()
for t in teams:
    print(f"Team: {t.id} | {t.name} | Leader: {t.team_leader_id} | Color: {t.color}")

print("\n--- MEMBERSHIPS FOR PETREA/MATEO ---")
for u in users:
    memberships = db.query(TeamMember).filter(TeamMember.user_id == u.id, TeamMember.is_active==True).all()
    print(f"User {u.full_name} is member of teams: {[m.team_id for m in memberships]}")

print("\n--- WORK ORDERS FOR NATHAN RUHL ---")
wos = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%Nathan%') | WorkOrder.address.ilike('%Nathan%')).all()
for wo in wos:
    print(f"WO: {wo.id} | Client: {wo.client_name} | Assigned Team: {wo.assigned_team_id}")

print("\n--- WORK ORDERS FOR PETER DECOODT ---")
wos = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%Peter Decoodt%')).all()
for wo in wos:
    print(f"WO: {wo.id} | Client: {wo.client_name} | Assigned Team: {wo.assigned_team_id}")
    
