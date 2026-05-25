import sys
import os

# Adăugăm backend-ul în calea de sistem pentru import
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models import Role, MaterialRequest, Emergency

# Creează tabelele noi
Base.metadata.create_all(bind=engine)

with Session(engine) as session:
    # 1. Redenumire rol Sef echipa
    roles = session.query(Role).all()
    found = False
    for role in roles:
        if role.name.lower() in ["sef echipa", "sef de echipa", "șef echipă", "șef de echipă"]:
            print(f"Redenumire rol din '{role.name}' in 'Responsabil (Sef de echipa)'")
            role.name = "Responsabil (Sef de echipa)"
            found = True
            
    if not found:
        print("Nu s-a gasit rolul Sef echipa pentru redenumire. Cautare cod = TEAM_LEADER")
        team_leader = session.query(Role).filter_by(code="TEAM_LEADER").first()
        if team_leader:
            print(f"Redenumire rol (dupa cod) din '{team_leader.name}' in 'Responsabil (Sef de echipa)'")
            team_leader.name = "Responsabil (Sef de echipa)"
    
    session.commit()
    print("Migrare si update roluri cu succes.")
