from app.database import SessionLocal
from app.models import WorkOrderDocument

db = SessionLocal()
docs = db.query(WorkOrderDocument).all()
print(f"Total documents in DB: {len(docs)}")
for d in docs[:5]:
    print(f" - {d.filename} ({d.file_size} bytes)")
db.close()
