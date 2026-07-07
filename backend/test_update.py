import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Client

db = SessionLocal()
client = db.query(Client).first()
if client:
    print(f"Before: country={client.country}, lang={client.preferred_language}")
    
    # Try updating manually as the endpoint would
    client.country = "FR"
    client.preferred_language = "fr"
    db.commit()
    db.refresh(client)
    
    print(f"After: country={client.country}, lang={client.preferred_language}")
else:
    print("No clients found")
db.close()
