from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    result = conn.execute("SELECT id, name, code FROM roles LIMIT 10")
    for row in result:
        print(row)
