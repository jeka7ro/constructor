import os
from sqlalchemy import create_engine, text

passw = "30Martie2026!"
project = "ltxbghtnygnguoegtgfo"
user1 = f"postgres.{project}"
user2 = "postgres"

urls = [
    # Supavisor pooler Session
    f"postgresql://{user1}:{passw}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres",
    # Supavisor pooler Transaction
    f"postgresql://{user1}:{passw}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres",
    # New format transaction
    f"postgresql://{user2}:{passw}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?options=-c%20supa_tenant%3D{project}",
    f"postgresql://{user2}:{passw}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?options=-c%20supa_tenant%3D{project}",
]

for url in urls:
    try:
        print(f"Testing: {url.replace(passw, '***')}")
        engine = create_engine(url, connect_args={'connect_timeout': 3})
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1"))
            print("  SUCCESS!")
            with open("working_url.txt", "w") as f:
                f.write(url)
            break
    except Exception as e:
        print(f"  FAIL: {str(e).split('FATAL:')[-1].strip()}")
