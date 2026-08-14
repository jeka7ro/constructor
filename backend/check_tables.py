import os, sys
from dotenv import load_dotenv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
from sqlalchemy import create_engine, inspect
database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)
inspector = inspect(engine)
print(inspector.get_table_names())
