import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

db_url = os.environ.get('DATABASE_URL')
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    result = db.execute(text("SELECT id, token, prices, client_type, work_type FROM work_orders WHERE token = '878b322e-322c-4dd8-aa15-3fecf8d68f56' OR id = '878b322e-322c-4dd8-aa15-3fecf8d68f56'")).fetchone()
    if result:
        print(f"prices: {result[2]}")
        print(f"client_type: {result[3]}")
        print(f"work_type: {result[4]}")
    else:
        print("Not found")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
