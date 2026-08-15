import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.chdir('backend')
from app import create_app, db
from app.models import WorkOrder

app = create_app()
with app.app_context():
    wos = WorkOrder.query.filter(
        WorkOrder.client_name.ilike('%elena%cazmal%')
    ).order_by(WorkOrder.id.desc()).limit(10).all()
    
    for w in wos:
        print(f"ID={w.id} | client={w.client_name} | status={w.status} | start_date={w.start_date} | team={w.assigned_team_id} | surface={w.surface_m2}")
    
    print(f"\nTotal: {len(wos)} work orders for Elena Cazmal")
