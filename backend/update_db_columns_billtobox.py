import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def upgrade():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN billtobox_status VARCHAR(50) DEFAULT 'none';"))
            print("Added billtobox_status")
        except Exception as e:
            print(e)
            
        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN billtobox_sent_at TIMESTAMP;"))
            print("Added billtobox_sent_at")
        except Exception as e:
            print(e)
            
        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN billtobox_error TEXT;"))
            print("Added billtobox_error")
        except Exception as e:
            print(e)
            
        conn.commit()
        print("Done")

if __name__ == "__main__":
    upgrade()
