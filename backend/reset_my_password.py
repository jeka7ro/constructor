import bcrypt
import os
import getpass
from sqlalchemy import create_engine, text

# Conectarea la baza de date
db_url = os.environ.get("DATABASE_URL", "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres")
engine = create_engine(db_url)

print("=== Resetare Parolă Admin (jeka7ro@gmail.com) ===")
new_password = getpass.getpass("Introdu parola dorită: ")
confirm_password = getpass.getpass("Confirmă parola dorită: ")

if new_password != confirm_password:
    print("Eroare: Parolele nu coincid. Încearcă din nou.")
    exit(1)

# Generăm hash-ul nou (criptat)
new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

try:
    with engine.connect() as conn:
        conn.execute(text("UPDATE saas_app.admins SET password_hash = :h WHERE lower(email) = 'jeka7ro@gmail.com'"), {"h": new_hash})
        conn.commit()
    print("✅ Parola a fost salvată cu succes în baza de date! Acum te poți loga.")
except Exception as e:
    print(f"❌ A apărut o eroare la salvare: {e}")
