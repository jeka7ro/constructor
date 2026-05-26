from app.database import engine
from sqlalchemy import text

def add_columns():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE material_requests ADD COLUMN items_json TEXT;"))
            print("Added items_json column")
        except Exception as e:
            print("items_json column might already exist:", e)
            
        try:
            conn.execute(text("ALTER TABLE material_requests ADD COLUMN is_fulfilled BOOLEAN NOT NULL DEFAULT FALSE;"))
            print("Added is_fulfilled column")
        except Exception as e:
            print("is_fulfilled column might already exist:", e)

if __name__ == "__main__":
    add_columns()
    print("Database update complete!")
