import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Add columns to the table
    cur.execute("""
        ALTER TABLE saas_app.teams
        ADD COLUMN IF NOT EXISTS robaws_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS robaws_password VARCHAR(255);
    """)

    conn.commit()
    print("Columns robaws_email and robaws_password added to saas_app.teams successfully.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        cur.close()
        conn.close()
