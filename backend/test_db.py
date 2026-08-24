from app.database import SessionLocal
from app.models import WorkOrderDocument

db = SessionLocal()
doc = db.query(WorkOrderDocument).order_by(WorkOrderDocument.id.desc()).first()
print(f"File path: {doc.file_path}")
print(f"Filename: {doc.filename}")
print(f"Source: {doc.source}")
