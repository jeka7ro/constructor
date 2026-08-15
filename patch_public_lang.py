import re

file_path = "backend/app/api/public_work_orders.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure Optional is imported if we use it
if "from typing import " in content and "Optional" not in content:
    content = content.replace("from typing import ", "from typing import Optional, ")
elif "from typing import Optional" not in content:
    content = "from typing import Optional\n" + content

# Replace the signature and add the logic
old_func = """@router.get("/public/work-orders/{token}")
def get_public_work_order(token: str, db: Session = Depends(get_db)):
    \"\"\"
    Returnează datele publice ale comenzii de lucru pe baza tokenului unic.
    Utilizat de pagina de confirmare a clientului.
    \"\"\"
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo or wo.status == 'deleted':
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită sau link-ul este invalid.")"""

new_func = """@router.get("/public/work-orders/{token}")
def get_public_work_order(token: str, lang: Optional[str] = None, db: Session = Depends(get_db)):
    \"\"\"
    Returnează datele publice ale comenzii de lucru pe baza tokenului unic.
    Utilizat de pagina de confirmare a clientului.
    \"\"\"
    wo = db.query(WorkOrder).filter(WorkOrder.token == token).first()
    if not wo or wo.status == 'deleted':
        raise HTTPException(status_code=404, detail="Comanda nu a fost găsită sau link-ul este invalid.")
        
    if lang and lang.lower() in ['fr', 'en', 'nl', 'ro', 'de']:
        if not wo.client_language or wo.client_language.lower() != lang.lower():
            wo.client_language = lang.lower()
            db.commit()"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched get_public_work_order successfully.")
else:
    print("Could not find get_public_work_order to patch.")
