from app.database import SessionLocal
from app.models import WorkOrderDocument

db = SessionLocal()
docs = db.query(WorkOrderDocument).filter(WorkOrderDocument.file_path.like('uploads/%')).all()
print(f"Found {len(docs)} documents starting with 'uploads/'")
for d in docs[:5]:
    print(d.file_path)
