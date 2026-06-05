import sys
import sqlalchemy
from app.database import engine

def run():
    print("Migrating saas_app.work_orders...")
    with engine.begin() as conn:
        try:
            conn.execute(sqlalchemy.text("ALTER TABLE saas_app.work_orders ADD COLUMN ai_sand_kg FLOAT;"))
            print("Added ai_sand_kg")
        except Exception as e:
            print(e)
            
        try:
            conn.execute(sqlalchemy.text("ALTER TABLE saas_app.work_orders ADD COLUMN ai_cement_kg FLOAT;"))
            print("Added ai_cement_kg")
        except Exception as e:
            print(e)
            
if __name__ == "__main__":
    run()
