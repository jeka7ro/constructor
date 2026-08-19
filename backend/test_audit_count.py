from app.database import SessionLocal
from app.models import WorkOrder
from sqlalchemy.orm import joinedload
from sqlalchemy import or_

db = SessionLocal()
# The exact query from list_work_orders for audit mode
q = db.query(WorkOrder)
# Wait, for ignore_quote_filter=True, it skips the is_quote filter!
# In PricingAnalytics, it calls: { limit: 2000, ignore_quote_filter: true, audit_mode: true }
q = q.filter(WorkOrder.status != 'isoflex')
# For audit_mode it DOES NOT filter 'deleted'
wos = q.all()
print("Total wos ignoring quote filter:", len(wos))

wos_audit = [wo for wo in wos if wo.source_system != 'we-r']
print("Total after we-r filter:", len(wos_audit))

quotes = [wo for wo in wos_audit if wo.is_quote]
print("Total devises (is_quote) remaining:", len(quotes))
