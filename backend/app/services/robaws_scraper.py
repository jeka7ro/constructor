import os
import requests
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Team, WorkOrder, Client, RobawsWorkOrderCache, WorkOrderDocument
from app.storage import upload_file, get_content_type

load_dotenv()
ROBAWS_API_KEY = os.getenv("ROBAWS_API_KEY")
ROBAWS_API_SECRET = os.getenv("ROBAWS_API_SECRET")

def geocode_address_for_scraper(address: str):
    # Dezactivat complet la cererea utilizatorului — nu se mai consumă Google Geocoding API
    return None, None

def run_api_sync_for_team(team: Team, db: Session):
    # Sincronizare Robaws oprită complet
    return
    api_key = team.robaws_email or ROBAWS_API_KEY
    api_secret = team.robaws_password or ROBAWS_API_SECRET
    
    if not api_key or not api_secret:
        print(f"[Robaws API] Sărit {team.name}: Lipsesc cheile API pentru echipă și din .env.")
        return

    print(f"[Robaws API] Se începe sincronizarea pentru echipa {team.name}")
    
    page = 0
    total_pages = 1
    limit = 50
    inserted_count = 0
    updated_count = 0

    try:
        while page < total_pages:
            offset = page * limit
            url = f"https://app.robaws.com/api/v2/work-orders?limit={limit}&offset={offset}&include=lineItems"
            r = requests.get(url, auth=(api_key, api_secret), headers={"Accept": "application/json"}, timeout=15)
            if r.status_code != 200:
                print(f"[Robaws API] Eroare API: {r.status_code} - {r.text}")
                break
                
            data = r.json()
            total_pages = data.get('totalPages', 1)
            items = data.get('items', [])
            
            for item in items:
                ext_id = str(item.get("id"))
                if not ext_id: continue
            
                existing = db.query(WorkOrder).filter(
                    WorkOrder.external_id == ext_id,
                    WorkOrder.organization_id == team.organization_id
                ).first()
            
                # Extract details
                raw_date = item.get("date")
                title = item.get("title") or ""
            
                # Client logic
                client_obj = item.get("client") or {}
                client_name = client_obj.get("name") if isinstance(client_obj, dict) else ""
            
                # Address logic
                addr_obj = item.get("address") or {}
                address_parts = []
                if addr_obj.get("addressLine1"): address_parts.append(addr_obj["addressLine1"])
                if addr_obj.get("postalCode"): address_parts.append(addr_obj["postalCode"])
                if addr_obj.get("city"): address_parts.append(addr_obj["city"])
                address = ", ".join(address_parts)
            
                lat = addr_obj.get("latitude")
                lon = addr_obj.get("longitude")
                if lat is None or lon is None:
                    lat, lon = geocode_address_for_scraper(address)
                
                full_title = f"[{client_name}] {title}" if client_name else title
            
                # Extract Materials and Volumes from lineItems
                line_items = item.get("lineItems", [])
                total_volume = 0.0
                found_fibre = False
                found_duramit = False
            
                for line in line_items:
                    qty = float(line.get("quantity") or 0)
                    unit = (line.get("unitType") or "").lower()
                    desc = (line.get("description") or "").lower()
                
                    # Check volumes
                    if unit in ['m2', 'm²', 'm3', 'm³']:
                        total_volume += qty
                    
                    # Check materials in description
                    if "vezel" in desc or "fibr" in desc:
                        found_fibre = True
                    if "duramit" in desc:
                        found_duramit = True
            
                # Build JSON structures
                volumes_json = []
                if total_volume > 0:
                    volumes_json.append({"label": "Suprafață", "quantity": str(total_volume), "unit": "m²", "price": "0"})
                
                is_isoflex = "isoflex" in (client_name or "").lower() or "isolteam" in (client_name or "").lower()

                materials_json = []
                if not is_isoflex:
                    if found_fibre:
                        materials_json.append({"name": "Fibre", "quantity": str(round(total_volume, 2)), "unit": "buc"})
                    if found_duramit:
                        materials_json.append({"name": "Duramit", "quantity": str(round(total_volume, 2)), "unit": "buc"})
            
                # Try to link to an existing client
                matched_client_id = None
                if client_name:
                    matched_client = db.query(Client).filter(
                        Client.organization_id == team.organization_id,
                        Client.name.ilike(f"%{client_name}%")
                    ).first()
                    if matched_client:
                        matched_client_id = matched_client.id

                # Save to DB
                if not existing:
                    new_wo = WorkOrder(
                        organization_id=team.organization_id,
                        token=uuid.uuid4().hex,
                        title=full_title[:255],
                        client_id=matched_client_id,
                        client_name=client_name,
                        site_address=address,
                        site_latitude=lat,
                        site_longitude=lon,
                        start_date=raw_date,
                        start_time="08:00",
                        assigned_team_id=team.id,
                        status="isoflex",
                        external_id=ext_id,
                        source_system="robaws",
                        created_by=None,
                        volumes=volumes_json,
                        materials=materials_json
                    )
                    db.add(new_wo)
                    db.flush()
                    wo_db_id = new_wo.id
                    inserted_count += 1
                    print(f"[Robaws API] Comandă nouă: {ext_id} (Fibre: {found_fibre}, Duramit: {found_duramit})")
                
                    # Fetch Documents
                    try:
                        docs_url = f"https://app.robaws.com/api/v2/work-orders/{ext_id}/documents"
                        d_res = requests.get(docs_url, auth=(api_key, api_secret), headers={"Accept": "application/json"}, timeout=10)
                        if d_res.status_code == 200:
                            docs_data = d_res.json()
                            for doc in docs_data:
                                doc_name = doc.get("name", "document.pdf")
                                doc_url = doc.get("url")
                                if doc_url:
                                    file_req = requests.get(doc_url, auth=(api_key, api_secret), timeout=15)
                                    if file_req.status_code == 200:
                                        safe_filename = f"{uuid.uuid4().hex[:8]}_{doc_name}"
                                        storage_path = f"work_orders/{wo_db_id}/documents/{safe_filename}"
                                        content_type = get_content_type(safe_filename)
                                    
                                        file_url_internal = upload_file(file_req.content, storage_path, content_type)
                                    
                                        wo_doc = WorkOrderDocument(
                                            work_order_id=wo_db_id,
                                            filename=doc_name,
                                            file_path=storage_path,
                                            file_size=len(file_req.content),
                                            content_type=content_type
                                        )
                                        db.add(wo_doc)
                    except Exception as e:
                        print(f"[Robaws API] Eroare descărcare doc pt {ext_id}: {e}")
                    
                else:
                    # Update existing order with precise volumes and materials if empty
                    updated = False
                    if (not existing.volumes or existing.volumes == []) and total_volume > 0:
                        existing.volumes = volumes_json
                        updated = True
                
                    if (not existing.materials or existing.materials == []) and (found_fibre or found_duramit):
                        existing.materials = materials_json
                        updated = True
                    
                    if updated:
                        updated_count += 1
            db.commit()
            
            page += 1
            
        print(f"[Robaws API] Sincronizare gata pt {team.name}. Noi: {inserted_count}, Actualizate: {updated_count}")

    except Exception as e:
        print(f"[Robaws API] Eroare neașteptată pt echipa {team.name}: {e}")

def run_all_scrapers():
    # Dezactivat definitiv la cererea utilizatorului
    return
