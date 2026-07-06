import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT schema_name FROM information_schema.schemata;"))
    print("Schemas:", [r[0] for r in res])
    
    res = conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'organizations';"))
    print("Organizations tables:", [r for r in res])
