from app.database import SessionLocal
from app.models import WorkOrder, TimesheetSegment, WorkOrderCheckin, WorkOrderPhoto, WorkOrderDocument, WorkOrderAcknowledgement

db = SessionLocal()
try:
    wo = db.query(WorkOrder).filter(WorkOrder.title == 'Eugen Ternat 100mp2').first()
    if wo:
        print(f"Deleting WorkOrder {wo.id} - {wo.title}")
        
        # Delete related to avoid foreign key constraints if no cascade
        db.query(TimesheetSegment).filter(TimesheetSegment.work_order_id == wo.id).delete()
        db.query(WorkOrderCheckin).filter(WorkOrderCheckin.work_order_id == wo.id).delete()
        db.query(WorkOrderPhoto).filter(WorkOrderPhoto.work_order_id == wo.id).delete()
        db.query(WorkOrderDocument).filter(WorkOrderDocument.work_order_id == wo.id).delete()
        db.query(WorkOrderAcknowledgement).filter(WorkOrderAcknowledgement.work_order_id == wo.id).delete()
        
        db.delete(wo)
        db.commit()
        print("Successfully deleted.")
    else:
        print("WorkOrder not found.")
finally:
    db.close()
