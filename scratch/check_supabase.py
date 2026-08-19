import sys
import os
import json
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, client_name, proforma_data, volumes FROM saas_app.work_orders WHERE client_name = 'Eugeniu Cazmal' ORDER BY created_at DESC LIMIT 20"))
    for row in result:
        proforma = row[2] if row[2] else {}
        if type(proforma) == str:
            proforma = json.loads(proforma)
        
        saved_net = proforma.get('totals', {}).get('net', 0)
        print(f"WO {row[0]}: Saved Net = {saved_net}")
        if abs(saved_net - 8035.0) < 1.0:
            print("FOUND IT!!!")
            print("Volumes:", json.dumps(row[3], indent=2))
            print("Proforma Items:", json.dumps(proforma.get('items', []), indent=2))
            break
