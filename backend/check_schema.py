from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'work_order_messages';"))
    for row in res:
        print(f"{row[0]}: {row[1]}")
