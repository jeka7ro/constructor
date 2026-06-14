from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import math
import requests
import time

from app.database import get_db
from app.models import LogisticBase, LogisticSandStation, Team, WorkOrder, ConstructionSite, LogisticsDailyPlan
from app.api.admin_auth import get_current_admin

# ── Geocoding cache (in-memory per process) ────────────────────────────────
_geocode_cache = {}

def _normalize_address(address: str) -> str:
    import unicodedata, re
    # Remove diacritics (ă→a, î→i, etc.)
    nfkd = unicodedata.normalize('NFD', address)
    without_dia = ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')
    # Add space between letter and digit (Voorstehoeve64 → Voorstehoeve 64)
    spaced = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', without_dia)
    # Normalize commas to ", "
    normalized = re.sub(r',\s*', ', ', spaced)
    return normalized.strip()

def _nominatim_query(q: str):
    import requests
    try:
        resp = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'be,nl,fr,de,lu'},
            headers={'User-Agent': 'DaveChape-Logistics/1.0', 'Accept-Language': 'fr'},
            timeout=6
        )
        results = resp.json()
        if results:
            return float(results[0]['lat']), float(results[0]['lon'])
    except Exception:
        pass
    return None

def geocode_address(address: str):
    """Geocode an address using Nominatim. Returns (lat, lng) or None."""
    if not address or len(address.strip()) < 5:
        return None
    key = address.strip().lower()
    if key in _geocode_cache:
        return _geocode_cache[key]

    normalized = _normalize_address(address)

    # Attempt 1: full normalized address
    result = _nominatim_query(normalized)

    # Attempt 2: fallback — try just first segment (city/postal part before comma)
    if not result and ',' in normalized:
        first_part = normalized.split(',')[0].strip()
        if len(first_part) > 3:
            result = _nominatim_query(first_part)

    _geocode_cache[key] = result
    return result

router = APIRouter(prefix="/admin/logistics", tags=["admin-logistics"])

# ── Pydantic Schemas ────────────────────────────────────────────────────────
class LogisticBaseSchema(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    team_ids: Optional[List[str]] = []

class LogisticBaseResponse(LogisticBaseSchema):
    id: str
    class Config:
        from_attributes = True

class LogisticSandStationSchema(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LogisticSandStationResponse(LogisticSandStationSchema):
    id: str
    class Config:
        from_attributes = True

# ── Utility: Haversine Distance ─────────────────────────────────────────────
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in KM between two coordinates."""
    if None in (lat1, lon1, lat2, lon2):
        return 0.0
    R = 6371.0 # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def calc_sand_kg(work_order: WorkOrder) -> float:
    try:
        vols = work_order.volumes if isinstance(work_order.volumes, list) else []
        total_kg = 0.0
        for v in vols:
            surf = float(v.get("quantity", 0))
            thick = float(v.get("thickness", 0))
            if surf > 0 and thick > 0:
                total_kg += surf * thick * 16
        return total_kg
    except Exception:
        return 0.0

# ── BASES ENDPOINTS ─────────────────────────────────────────────────────────
@router.get("/bases", response_model=List[LogisticBaseResponse])
def get_bases(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    bases = db.query(LogisticBase).filter(LogisticBase.organization_id == admin.organization_id).all()
    
    # Attach team_ids
    for base in bases:
        teams = db.query(Team).filter(Team.base_id == base.id).all()
        base.team_ids = [t.id for t in teams]
        
    return bases

@router.post("/bases", response_model=LogisticBaseResponse)
def create_base(data: LogisticBaseSchema, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    obj = LogisticBase(
        name=data.name, address=data.address, 
        latitude=data.latitude, longitude=data.longitude,
        organization_id=admin.organization_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    
    # Assign teams
    if data.team_ids:
        teams = db.query(Team).filter(Team.id.in_(data.team_ids), Team.organization_id == admin.organization_id).all()
        for t in teams:
            t.base_id = obj.id
        db.commit()
        
    obj.team_ids = data.team_ids or []
    return obj

@router.put("/bases/{base_id}", response_model=LogisticBaseResponse)
def update_base(base_id: str, data: LogisticBaseSchema, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    obj = db.query(LogisticBase).filter(LogisticBase.id == base_id, LogisticBase.organization_id == admin.organization_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Base not found")
    
    obj.name = data.name
    obj.address = data.address
    obj.latitude = data.latitude
    obj.longitude = data.longitude
    
    # Clear old team associations
    old_teams = db.query(Team).filter(Team.base_id == base_id).all()
    for t in old_teams:
        t.base_id = None
        
    # Set new team associations
    if data.team_ids:
        new_teams = db.query(Team).filter(Team.id.in_(data.team_ids), Team.organization_id == admin.organization_id).all()
        for t in new_teams:
            t.base_id = base_id
            
    db.commit()
    db.refresh(obj)
    obj.team_ids = data.team_ids or []
    return obj

@router.delete("/bases/{base_id}")
def delete_base(base_id: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    obj = db.query(LogisticBase).filter(LogisticBase.id == base_id, LogisticBase.organization_id == admin.organization_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Base not found")
    db.delete(obj)
    db.commit()
    return {"status": "ok"}


# ── SAND STATIONS ENDPOINTS ─────────────────────────────────────────────────
@router.get("/sand-stations", response_model=List[LogisticSandStationResponse])
def get_sand_stations(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(LogisticSandStation).filter(LogisticSandStation.organization_id == admin.organization_id).all()

@router.post("/sand-stations", response_model=LogisticSandStationResponse)
def create_sand_station(data: LogisticSandStationSchema, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    obj = LogisticSandStation(**data.dict(), organization_id=admin.organization_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/sand-stations/{station_id}", response_model=LogisticSandStationResponse)
def update_sand_station(station_id: str, data: LogisticSandStationSchema, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    obj = db.query(LogisticSandStation).filter(LogisticSandStation.id == station_id, LogisticSandStation.organization_id == admin.organization_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Sand station not found")
    for k, v in data.dict().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/sand-stations/{station_id}")
def delete_sand_station(station_id: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    obj = db.query(LogisticSandStation).filter(LogisticSandStation.id == station_id, LogisticSandStation.organization_id == admin.organization_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Sand station not found")
    db.delete(obj)
    db.commit()
    return {"status": "ok"}


# ── DAILY ROUTES ────────────────────────────────────────────────────────────
def _calculate_daily_routes(target_date: date, db: Session, admin):
    # 1. Fetch all works for the day
    wos = db.query(WorkOrder).filter(
        WorkOrder.organization_id == admin.organization_id,
        WorkOrder.start_date == target_date,
        WorkOrder.status != 'cancelled',
        WorkOrder.assigned_team_id != None
    ).all()

    # 2. Group works by Team
    team_wos = {}
    for wo in wos:
        if wo.assigned_team_id:
            team_wos.setdefault(wo.assigned_team_id, []).append(wo)

    # 3. Fetch all teams involved (to get their base and color)
    team_ids = list(team_wos.keys())
    teams = []
    if team_ids:
        teams = db.query(Team).filter(Team.id.in_(team_ids)).all()

    # Create a quick base lookup
    all_bases = db.query(LogisticBase).filter(LogisticBase.organization_id == admin.organization_id).all()
    default_base = all_bases[0] if all_bases else None

    # 4. Build response payload
    routes = []
    grand_total_sand_kg = 0.0
    grand_total_distance_km = 0.0

    for team in teams:
        works = team_wos.get(team.id, [])
        # Sort works by start_time if possible
        works.sort(key=lambda x: x.start_time or "23:59")
        
        # Resolve Team Base, fallback to default_base
        base_id = team.base_id
        base = next((b for b in all_bases if b.id == base_id), default_base)

        team_sand_kg = 0.0
        team_distance_km = 0.0
        
        waypoints = []
        
        # Waypoint 0: Base
        if base and base.latitude and base.longitude:
            waypoints.append({
                "type": "base",
                "id": base.id,
                "name": base.name,
                "lat": base.latitude,
                "lng": base.longitude
            })
            
            last_lat, last_lng = (base.latitude, base.longitude) if base else (None, None)
            last_name = base.name if base else "Unknown"

            for w in works:
                sand_kg = calc_sand_kg(w)
                team_sand_kg += sand_kg
                
                # Resolve Work Site Lat/Lng
                w_lat = w.site_latitude
                w_lng = w.site_longitude
                w_name = w.title or "Comandă fără titlu"
                
                # Try from ConstructionSite if available
                if w.site_id:
                    s = db.query(ConstructionSite).filter(ConstructionSite.id == w.site_id).first()
                    if s and s.latitude and s.longitude:
                        w_lat = s.latitude
                        w_lng = s.longitude
                        w_name = f"{w.title} ({s.name})"

                # Fallback: geocode site_address via Nominatim
                if not (w_lat and w_lng) and w.site_address:
                    geocoded = geocode_address(w.site_address)
                    if geocoded:
                        w_lat, w_lng = geocoded
                        # Persist coords so next load is instant
                        try:
                            w.site_latitude = w_lat
                            w.site_longitude = w_lng
                            db.add(w)
                        except Exception:
                            pass

                if w_lat and w_lng:
                    dist_from_prev = 0
                    segment = None
                    # Add distance
                    if last_lat and last_lng:
                        dist_from_prev = haversine(last_lat, last_lng, w_lat, w_lng)
                        team_distance_km += dist_from_prev
                        segment = {
                            "from": "Baza" if last_name == base.name else last_name,
                            "to": w_name,
                            "km": round(dist_from_prev, 2),
                            "from_lat": last_lat,
                            "from_lng": last_lng
                        }
                    
                    w.route_distance_km = dist_from_prev
                    w.route_sand_kg = sand_kg
                    w.route_segments = [segment] if segment else []
                
                waypoints.append({
                    "type": "work",
                    "id": w.id,
                    "name": w_name,
                    "lat": w_lat,
                    "lng": w_lng,
                    "sand_kg": sand_kg,
                    "distance_from_prev_km": dist_from_prev if (w_lat and w_lng) else 0
                })
                
                last_lat, last_lng = w_lat, w_lng
                last_name = w_name

        # Waypoint N: Return to Base
        if base and base.latitude and base.longitude and len(waypoints) > 1:
            waypoints.append({
                "type": "base_return",
                "id": base.id,
                "name": f"Return: {base.name}",
                "lat": base.latitude,
                "lng": base.longitude
            })
            if last_lat and last_lng:
                dist = haversine(last_lat, last_lng, base.latitude, base.longitude)
                team_distance_km += dist
                
                # Assign the return journey to the LAST work order
                if works:
                    last_wo = works[-1]
                    segments = list(last_wo.route_segments) if last_wo.route_segments else []
                    segments.append({
                        "from": last_name,
                        "to": "Baza",
                        "km": round(dist, 2),
                        "from_lat": last_lat,
                        "from_lng": last_lng
                    })
                    last_wo.route_segments = segments
                
        # Save calculations into DB
        db.commit()

        grand_total_sand_kg += team_sand_kg
        grand_total_distance_km += team_distance_km

        routes.append({
            "team_id": team.id,
            "team_name": team.name,
            "team_color": team.color or "#3b82f6",
            "base_name": base.name if base else "N/A",
            "total_sand_kg": team_sand_kg,
            "total_distance_km": team_distance_km,
            "works_count": len(works),
            "waypoints": waypoints
        })

    return {
        "date": target_date.isoformat(),
        "grand_total_sand_kg": grand_total_sand_kg,
        "grand_total_distance_km": grand_total_distance_km,
        "active_teams_count": len(routes),
        "routes": routes
    }

@router.get("/daily-routes")
def get_daily_routes(target_date: date, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    # 0. Check if an archived plan exists for this date
    archived_plan = db.query(LogisticsDailyPlan).filter(
        LogisticsDailyPlan.organization_id == admin.organization_id,
        LogisticsDailyPlan.date == target_date
    ).first()

    if archived_plan:
        # Include a flag to let the frontend know this is archived
        data = archived_plan.snapshot_data
        data["is_archived"] = True
        return data

    data = _calculate_daily_routes(target_date, db, admin)
    
    # Auto-Archive logic: if the date is in the past, save it now!
    if target_date < date.today():
        plan = LogisticsDailyPlan(
            organization_id=admin.organization_id,
            date=target_date,
            snapshot_data=data,
            saved_by_id=admin.id
        )
        db.add(plan)
        db.commit()
        data["is_archived"] = True
    else:
        data["is_archived"] = False
        
    return data

class ArchiveDayRequest(BaseModel):
    target_date: date

@router.post("/archive-day")
def archive_daily_routes(req: ArchiveDayRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    # Always force a fresh calculation to save
    snapshot = _calculate_daily_routes(req.target_date, db, admin)
    
    existing = db.query(LogisticsDailyPlan).filter(
        LogisticsDailyPlan.organization_id == admin.organization_id,
        LogisticsDailyPlan.date == req.target_date
    ).first()

    if existing:
        existing.snapshot_data = snapshot
        existing.saved_by_id = admin.id
    else:
        plan = LogisticsDailyPlan(
            organization_id=admin.organization_id,
            date=req.target_date,
            snapshot_data=snapshot,
            saved_by_id=admin.id
        )
        db.add(plan)
    
    db.commit()
    return {"status": "ok", "message": "Ziua a fost arhivată în istoric."}


@router.get("/period-report")
def get_period_report(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    try:
        from app.models import Vehicle
    except ImportError:
        Vehicle = None

    wos = db.query(WorkOrder).filter(
        WorkOrder.organization_id == admin.organization_id,
        WorkOrder.start_date >= start_date,
        WorkOrder.start_date <= end_date,
        WorkOrder.status != "cancelled",
    ).order_by(WorkOrder.start_date, WorkOrder.start_time).all()

    team_ids = list({wo.assigned_team_id for wo in wos if wo.assigned_team_id})
    teams = {t.id: t for t in db.query(Team).filter(Team.id.in_(team_ids)).all()} if team_ids else {}

    vehicles = {}
    if Vehicle:
        vehicle_ids = list({wo.assigned_vehicle_id for wo in wos if wo.assigned_vehicle_id})
        if vehicle_ids:
            vehicles = {v.id: v for v in db.query(Vehicle).filter(Vehicle.id.in_(vehicle_ids)).all()}

    rows = []
    for wo in wos:
        sand_kg = calc_sand_kg(wo)
        total_surface = 0.0
        weighted_thickness = 0.0
        vols = wo.volumes if isinstance(wo.volumes, list) else []
        for v in vols:
            surf = float(v.get("quantity", 0) or 0)
            thick = float(v.get("thickness", 0) or 0)
            total_surface += surf
            weighted_thickness += surf * thick
        avg_thickness = (weighted_thickness / total_surface) if total_surface > 0 else 0

        team = teams.get(wo.assigned_team_id)
        vehicle = vehicles.get(wo.assigned_vehicle_id) if wo.assigned_vehicle_id else None

        rows.append({
            "id": wo.id,
            "date": wo.start_date.isoformat() if wo.start_date else None,
            "start_time": wo.start_time,
            "title": wo.title or "—",
            "client_name": wo.client_name or "—",
            "address": wo.site_address or "—",
            "status": wo.status,
            "team_id": team.id if team else None,
            "team_name": team.name if team else "—",
            "team_color": team.color if team else "#64748b",
            "vehicle_name": getattr(vehicle, "name", None) or "—",
            "vehicle_plate": getattr(vehicle, "plate_number", None) or "—",
            "surface_m2": round(total_surface, 2),
            "avg_thickness_cm": round(avg_thickness, 2),
            "sand_kg": round(sand_kg, 1),
            "sand_tons": round(sand_kg / 1000, 3),
            "route_distance_km": round(float(wo.route_distance_km or 0), 2),
        })

    total_surface = sum(r["surface_m2"] for r in rows)
    total_sand_kg = sum(r["sand_kg"] for r in rows)
    total_distance = sum(r["route_distance_km"] for r in rows)

    return {
        "rows": rows,
        "totals": {
            "count": len(rows),
            "surface_m2": round(total_surface, 2),
            "sand_tons": round(total_sand_kg / 1000, 3),
            "distance_km": round(total_distance, 2),
        }
    }
