import os
import random
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Team, WorkOrder, User

from dotenv import load_dotenv
load_dotenv()

# Adjust based on backend configuration
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/pontaje_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generate_orders():
    db = SessionLocal()
    
    # Get all teams
    teams = db.query(Team).filter(Team.is_active == True).all()
    if not teams:
        print("No teams found.")
        return
        
    org_id = teams[0].organization_id
    
    # Target Date: June 8, 2026
    target_date = date(2026, 6, 8)
    
    # Brussels central coords
    brussels_lat = 50.8503
    brussels_lng = 4.3517
    
    orders_created = 0
    
    for team in teams:
        for i in range(2):
            # Generate random coords around Brussels (+/- 0.1 degrees is roughly 10km)
            lat_offset = random.uniform(-0.1, 0.1)
            lng_offset = random.uniform(-0.15, 0.15)
            
            site_lat = brussels_lat + lat_offset
            site_lng = brussels_lng + lng_offset
            
            # Generate random volumes
            surface = random.randint(50, 2000)
            thickness = random.randint(5, 12)
            
            volumes = [
                {
                    "type": "Sapa",
                    "quantity": surface,
                    "thickness": thickness
                }
            ]
            
            import uuid
            order = WorkOrder(
                organization_id=org_id,
                title=f"Sapa {surface}mp {team.name} #{i+1}",
                status="scheduled",
                start_date=target_date,
                deadline_date=target_date,
                token=str(uuid.uuid4()),
                assigned_team_id=team.id,
                site_latitude=site_lat,
                site_longitude=site_lng,
                site_address="Bruxelles Suburbs",
                volumes=volumes
            )
            
            db.add(order)
            orders_created += 1
            
    db.commit()
    print(f"Created {orders_created} test orders for {len(teams)} teams on 2026-06-08.")
    db.close()

if __name__ == "__main__":
    generate_orders()
