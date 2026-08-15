import asyncio

async def main():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    db_url = "postgresql+asyncpg://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        # Check schema
        r = await conn.execute(text("SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'work_orders'"))
        schema_rows = r.fetchall()
        print("Schema info:", schema_rows)
        
        schema = schema_rows[0][0] if schema_rows else 'public'
        
        r = await conn.execute(text(f"""
            SELECT id, client_name, status, start_date, assigned_team_id, surface_m2 
            FROM {schema}.work_orders 
            WHERE LOWER(client_name) LIKE '%elena%cazmal%' 
            ORDER BY id DESC LIMIT 10
        """))
        rows = r.fetchall()
        for row in rows:
            print(f"ID={row[0]} | client={row[1]} | status={row[2]} | date={row[3]} | team={row[4]} | surface={row[5]}")
        print(f"\nTotal: {len(rows)}")
    await engine.dispose()

asyncio.run(main())
