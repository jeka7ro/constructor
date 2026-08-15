import asyncio

async def main():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    db_url = "postgresql+asyncpg://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("""
            SELECT id, client_name, route_distance_km, route_segments, 
                   prices->>'distance_km' as prices_dist,
                   site_latitude, site_longitude
            FROM saas_app.work_orders 
            WHERE is_quote = true AND status IN ('draft', 'pending', 'confirmed')
            AND start_date IS NULL
            ORDER BY created_at DESC LIMIT 10
        """))
        rows = r.fetchall()
        for row in rows:
            print(f"ID={str(row[0])[:8]}.. | {row[1]:<20} | route_km={row[2]} | prices_dist={row[4]} | lat={row[5]} | lng={row[6]} | segments={'Yes' if row[3] else 'No'}")
    await engine.dispose()

asyncio.run(main())
