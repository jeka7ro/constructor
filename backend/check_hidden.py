from app.database import engine
from sqlalchemy import text
import json

def check():
    with engine.begin() as conn:
        res = conn.execute(text("SELECT id, sender, message, is_hidden FROM saas_app.work_order_messages WHERE message LIKE '%Data intervenției%'")).fetchall()
        for row in res:
            print(f"ID: {row.id}, SENDER: {row.sender}, IS_HIDDEN: {row.is_hidden}, MESSAGE: {row.message}")

if __name__ == "__main__":
    check()
