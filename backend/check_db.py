import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url:
    engine = create_engine(db_url)
    inspector = inspect(engine)
    print("TABLES:", inspector.get_table_names())
    for col in inspector.get_columns('users'):
        print(f"users col: {col['name']}")
    for col in inspector.get_columns('admins'):
        print(f"admins col: {col['name']}")
