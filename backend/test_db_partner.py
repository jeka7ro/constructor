from app.database import SessionLocal
from app.models import WorkOrderDocument

db = SessionLocal()
doc = db.query(WorkOrderDocument).filter(WorkOrderDocument.source == 'partner').order_by(WorkOrderDocument.id.desc()).first()
if doc:
    print(f"File path: {doc.file_path}")
    print(f"Filename: {doc.filename}")
else:
    print("No partner doc found")
