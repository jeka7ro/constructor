import os
import sys
from sqlalchemy import create_engine, text

db_url = os.environ.get('DATABASE_URL')
engine = create_engine(db_url)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, title, client_name, is_quote, status, start_date FROM work_orders WHERE client_name IS NULL ORDER BY created_at DESC LIMIT 5"))
    for row in result:
        print(row)
