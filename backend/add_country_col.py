import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def main():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'RO' NOT NULL;"))
        conn.commit()
        print("Column added successfully.")

if __name__ == "__main__":
    main()
