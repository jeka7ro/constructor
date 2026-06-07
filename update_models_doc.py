import re

with open('backend/app/models.py', 'r') as f:
    content = f.read()

# Add the new table
new_model = """
class WorkOrderDocument(Base):
    \"\"\"Documents and plans attached to a work order, downloaded from Robaws or uploaded manually\"\"\"
    __tablename__ = "work_order_documents"

    id              = Column(String(36), primary_key=True, default=generate_uuid)
    work_order_id   = Column(String(36), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    
    filename        = Column(String(500), nullable=False)
    file_path       = Column(String(1000), nullable=False)
    file_size       = Column(Integer, nullable=True)  # in bytes
    content_type    = Column(String(100), nullable=True) # e.g. application/pdf, image/png
    
    uploaded_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
"""

if "WorkOrderDocument" not in content:
    # insert before WorkOrderPhoto
    content = content.replace('class WorkOrderPhoto(Base):', new_model + '\nclass WorkOrderPhoto(Base):')
    
    with open('backend/app/models.py', 'w') as f:
        f.write(content)
    print("Added WorkOrderDocument to models.py")
else:
    print("WorkOrderDocument already in models.py")
