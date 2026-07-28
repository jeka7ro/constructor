import os
import psycopg2

def check_db():
    conn = psycopg2.connect("postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres")
    cur = conn.cursor()
    cur.execute("SELECT id, quote_number, source_system, created_at, is_quote, status, created_by, external_id FROM saas_app.work_orders WHERE quote_number IN ('EST0846', 'EST0845');")
    rows = cur.fetchall()
    for r in rows:
        print(f"ID: {r[0]}, Quote: {r[1]}, Source: {r[2]}, Created: {r[3]}, IsQuote: {r[4]}, Status: {r[5]}, CreatedBy: {r[6]}, ExternalID: {r[7]}")
    cur.close()
    conn.close()

if __name__ == '__main__':
    check_db()
