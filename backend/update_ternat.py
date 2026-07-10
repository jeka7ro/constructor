import psycopg2

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT id, title, site_address, site_latitude, site_longitude FROM work_orders WHERE site_address ILIKE '%Ternat%'")
        rows = cur.fetchall()
        print("Ternat quotes:", rows)
        
        cur.execute("UPDATE work_orders SET site_latitude = '50.8713', site_longitude = '4.1752' WHERE site_address ILIKE '%Ternat%' AND (site_latitude IS NULL OR site_latitude = '')")
        conn.commit()
        print(f"Updated {cur.rowcount} rows for Ternat.")
        
        cur.execute("SELECT id, title, site_address FROM work_orders WHERE (site_latitude IS NULL OR site_latitude = '') AND site_address != '' AND is_quote = true")
        missing = cur.fetchall()
        print("Other quotes missing coords:", missing)
        
        cur.close()
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
