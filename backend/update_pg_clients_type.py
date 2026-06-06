import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set!")
        return None
        
    result = urlparse(db_url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port
    
    conn = psycopg2.connect(
        database=database,
        user=username,
        password=password,
        host=hostname,
        port=port
    )
    return conn

def update_schema():
    conn = get_db_connection()
    if not conn:
        return
        
    try:
        cur = conn.cursor()
        
        # Add client_type
        print("Adding client_type column...")
        cur.execute("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'juridica' NOT NULL;
        """)
        
        # Add bank_name
        print("Adding bank_name column...")
        cur.execute("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
        """)
        
        # Add iban
        print("Adding iban column...")
        cur.execute("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS iban VARCHAR(50);
        """)
        
        # Add swift
        print("Adding swift column...")
        cur.execute("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS swift VARCHAR(20);
        """)
        
        conn.commit()
        print("Successfully updated clients table schema!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    update_schema()
