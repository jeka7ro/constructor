from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.admin_auth import get_current_admin
from app.models import Admin, Client, ConstructionSite, WorkOrder
from typing import List, Dict, Any

router = APIRouter(prefix="/admin/search", tags=["Admin Search"])

@router.get("/global")
def global_search(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
) -> List[Dict[str, Any]]:
    """
    Returns all searchable entities (Clients, Sites, WorkOrders) 
    for the current organization in a flattened format optimized for fuse.js frontend fuzzy search.
    """
    org_id = current_admin.organization_id
    results = []

    # Helper function to apply org filter
    def apply_org_filter(query, model):
        if org_id is not None:
            return query.filter(model.organization_id == org_id)
        return query

    # 1. Fetch Clients
    clients = apply_org_filter(db.query(Client), Client).all()
    for c in clients:
        results.append({
            "id": c.id,
            "type": "client",
            "title": c.name,
            "subtitle": f"{c.address or ''} {c.cui or ''}".strip(),
            "nav_url": f"/admin/clients/{c.id}",
            "raw_data": f"{c.name} {c.cui or ''} {c.address or ''} {c.contact_person or ''} {c.email or ''} {c.phone or ''}"
        })

    # 2. Fetch Construction Sites
    sites = apply_org_filter(db.query(ConstructionSite), ConstructionSite).all()
    for s in sites:
        results.append({
            "id": s.id,
            "type": "chantier",
            "title": s.name,
            "subtitle": s.address or "Fără adresă",
            "nav_url": f"/admin/sites/{s.id}",
            "raw_data": f"{s.name} {s.address or ''} {s.description or ''}"
        })

    # 3. Fetch Work Orders (Devis & Chantiers)
    work_orders = apply_org_filter(db.query(WorkOrder), WorkOrder).all()
    
    # To enrich WorkOrders with Client names, let's create a quick map
    client_map = {c.id: c.name for c in clients}
    
    for w in work_orders:
        w_type = "devis" if w.is_quote else "workorder"
        client_name = client_map.get(w.client_id, "Fără client asociat")
        
        # Build subtitle
        subtitle = f"{client_name} • {w.site_address or 'Fără adresă'}"
        
        results.append({
            "id": w.id,
            "type": w_type,
            "title": w.title or f"Lucrare {w.id[:8]}",
            "subtitle": subtitle,
            "nav_url": f"/admin/work-orders/{w.id}",
            "raw_data": f"{w.title or ''} {client_name} {w.site_address or ''} {w.notes or ''}"
        })

    return results
