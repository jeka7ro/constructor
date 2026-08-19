from backend.app.database import SessionLocal
from backend.app.models import User, Team, TeamMember

db = SessionLocal()

print("--- USERS ---")
users = db.query(User).filter(User.full_name.ilike('%Petrea%') | User.full_name.ilike('%Mateo%')).all()
for u in users:
    print(f"User: {u.id} | {u.full_name} | {u.role.name if u.role else 'None'}")

print("\n--- TEAMS ---")
teams = db.query(Team).all()
for t in teams:
    print(f"Team: {t.id} | {t.name} | Leader: {t.team_leader_id} | Color: {t.color}")

print("\n--- PETREA TEAM MEMBERSHIPS ---")
for u in users:
    memberships = db.query(TeamMember).filter(TeamMember.user_id == u.id, TeamMember.is_active==True).all()
    print(f"User {u.full_name} is member of teams: {[m.team_id for m in memberships]}")

