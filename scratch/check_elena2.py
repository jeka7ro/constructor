import asyncio, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

async def main():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    db_url = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
    async_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(async_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("""
            SELECT id, client_name, status, start_date::date, assigned_team_id, surface_m2 
            FROM work_orders 
            WHERE LOWER(client_name) LIKE '%elena%cazmal%' 
            ORDER BY id DESC LIMIT 10
        """))
        rows = r.fetchall()
        for row in rows:
            print(f"ID={row[0]} | client={row[1]} | status={row[2]} | date={row[3]} | team={row[4]} | surface={row[5]}")
        print(f"\nTotal: {len(rows)}")
    await engine.dispose()

asyncio.run(main())
