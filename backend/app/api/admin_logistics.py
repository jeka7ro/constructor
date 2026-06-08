from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import math

from app.database import get_db
from app.models import LogisticBase, LogisticSandStation, Team, WorkOrder, ConstructionSite, LogisticsDailyPlan
from app.api.admin_auth import get_current_admin

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
        
        # Hardcoded Fixed Depot for ALL teams
        base = type('obj', (object,), {
            'id': 'fixed_depot',
            'name': 'H&H Resources Brussels',
            'latitude': 50.88243,
            'longitude': 4.39343
        })

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
                            "km": round(dist_from_prev, 2)
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
                    "distance_from_prev_km": dist_from_prev
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
                        "km": round(dist, 2)
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
        "date": target_date,
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

