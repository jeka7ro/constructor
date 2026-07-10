import re

# Update models.py
f1 = 'backend/app/models.py'
with open(f1, 'r') as file:
    c1 = file.read()

c1 = c1.replace(
    'actual_surface_m2 = Column(Float, nullable=True)',
    'actual_surface_m2 = Column(Float, nullable=True)\n    actual_thickness_cm = Column(Float, nullable=True)'
)
with open(f1, 'w') as file:
    file.write(c1)

# Update worker_orders.py
f2 = 'backend/app/api/worker_orders.py'
with open(f2, 'r') as file:
    c2 = file.read()

# Add to serialization
c2 = c2.replace(
    '"actual_surface_m2": wo.actual_surface_m2,',
    '"actual_surface_m2": wo.actual_surface_m2,\n        "actual_thickness_cm": wo.actual_thickness_cm,'
)
c2 = c2.replace(
    '"actual_surface_m2": wo.actual_surface_m2,',
    '"actual_surface_m2": wo.actual_surface_m2,\n            "actual_thickness_cm": wo.actual_thickness_cm,'
) # Handle both _serialize_order and _fast_serialize

# Add to payload
c2 = c2.replace(
    'actual_surface_m2: Optional[float] = None',
    'actual_surface_m2: Optional[float] = None\n    actual_thickness_cm: Optional[float] = None'
)

# Add to close_order
c2 = c2.replace(
    'if payload.actual_surface_m2 is not None:\n        wo.actual_surface_m2 = payload.actual_surface_m2',
    'if payload.actual_surface_m2 is not None:\n        wo.actual_surface_m2 = payload.actual_surface_m2\n    if payload.actual_thickness_cm is not None:\n        wo.actual_thickness_cm = payload.actual_thickness_cm'
)

with open(f2, 'w') as file:
    file.write(c2)

# Apply DB schema change locally for testing
# We should probably use alembic, or just alter table directly for speed
import sqlite3
import os
try:
    conn = sqlite3.connect('backend/test_db.sqlite')
    c = conn.cursor()
    c.execute('ALTER TABLE work_orders ADD COLUMN actual_thickness_cm FLOAT;')
    conn.commit()
    conn.close()
except:
    pass

import psycopg2
try:
    # If using postgres
    from app.database import engine
    with engine.connect() as conn:
        conn.execute('ALTER TABLE work_orders ADD COLUMN actual_thickness_cm FLOAT;')
except:
    pass
