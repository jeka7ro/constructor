from app.database import SessionLocal
from app.models import Organization, Client
import json

db = SessionLocal()
org = db.query(Organization).filter(Organization.slug == 'davidechape').first()
client = db.query(Client).filter(Client.organization_id == org.id, Client.name.ilike('%isoflex%')).first()
print(f"Client: {client.name}")
print(f"Is Preferential: {client.is_preferential}")
print(f"Pricing: {json.dumps(client.pricing_settings, indent=2)}")
