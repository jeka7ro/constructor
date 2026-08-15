import asyncio

async def main():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    db_url = "postgresql+asyncpg://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("""
            SELECT id, client_name, client_language, client_id
            FROM saas_app.work_orders 
            WHERE id = '503f34e8-a8c1-4cb0-b2ca-1c848af7100c'
        """))
        row = r.fetchone()
        if row:
            print(f"client_language={repr(row[2])}")
            print(f"client_id={row[3]}")
    await engine.dispose()

asyncio.run(main())
