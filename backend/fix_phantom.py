import os
import sys
from app.database import SessionLocal
from app.models import WorkOrder, Team

def run():
    db = SessionLocal()
    try:
        # The user says "Client Necunoscut" with address Zavelstraat 22, Lennik
        orders = db.query(WorkOrder).filter(
            WorkOrder.site_address.ilike('%Zavelstraat 22%Lennik%')
        ).all()
        
        for o in orders:
            if not o.client_name:
                print(f"Deleting Phantom Order: '{o.title}', Status: {o.status}")
                db.delete(o)
                
        db.commit()
        print("Phantom orders deleted.")
    finally:
        db.close()

if __name__ == "__main__":
    run()
