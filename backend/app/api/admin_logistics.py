from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime, timezone
import math
import requests
import time

from app.database import get_db
from app.models import LogisticBase, LogisticSandStation, Team, WorkOrder, ConstructionSite, LogisticsDailyPlan, Vehicle, TripLog, TripGPSPoint
from app.api.admin_auth import get_current_admin

# ── Cache în-memorie pentru ziua curentă/viitoare (5 minute TTL) ──────────
# Formatul cheii: "{org_id}:{date_iso}"
# Valoarea: {"data": {...}, "cached_at": float_timestamp}
TODAY_ROUTE_CACHE: dict = {}
TODAY_ROUTE_CACHE_TTL = 300  # 5 minute — invalidare automată

def _invalidate_route_cache(org_id: str, target_date: date):
    """Invalideaza cache-ul pentru o dată și organizație."""
    key = f"{org_id}:{target_date.isoformat()}"
    TODAY_ROUTE_CACHE.pop(key, None)

def _get_route_cache(org_id: str, target_date: date):
    """Returnează datele din cache dacă sunt valide (< TTL), altfel None."""
    key = f"{org_id}:{target_date.isoformat()}"
    entry = TODAY_ROUTE_CACHE.get(key)
    if entry and (time.time() - entry["cached_at"]) < TODAY_ROUTE_CACHE_TTL:
        return entry["data"]
    return None

def _set_route_cache(org_id: str, target_date: date, data: dict):
    """Salvează datele în cache."""
    key = f"{org_id}:{target_date.isoformat()}"
    TODAY_ROUTE_CACHE[key] = {"data": data, "cached_at": time.time()}

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

def geocode_address(address: str):
    """Geocode an address using Google Maps API. Returns (lat, lng) or None."""
    if not address or len(address.strip()) < 5:
        return None
    key = address.strip().lower()
    if key in _geocode_cache:
        return _geocode_cache[key]

    import os
    import requests
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return None
        
    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": api_key, "region": "ro"},
            timeout=5
        )
        results = response.json()
        if results.get("status") == "OK" and results.get("results"):
            location = results["results"][0]["geometry"]["location"]
            result = (float(location["lat"]), float(location["lng"]))
            _geocode_cache[key] = result
            return result
    except Exception:
        pass
        
    return None

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

def osrm_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate driving distance in KM using OSRM, fallback to haversine."""
    if None in (lat1, lon1, lat2, lon2):
        return 0.0
    
    # [HOTFIX] Dezactivat OSRM temporar deoarece bloca pool-ul de conexiuni la baza de date timp de 30-50 de secunde (N+1 HTTP requests sincrone)
    # Folosim o aproximare (haversine * 1.3 pentru distanța auto) pentru a fi instant.
    dist_straight = haversine(lat1, lon1, lat2, lon2)
    return dist_straight * 1.3

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
def _calculate_daily_routes(target_date: date, db: Session, admin, is_past: bool = False):
    # 1. Fetch works for the day:
    # - Pentru ziua curentă/viitoare: STRICT status='planning' (ce vede utilizatorul pe planning board)
    # - Pentru zilele din TRECUT: extindem la toate statusurile relevante (lucrările au putut progresa
    #   la confirmed/in_progress/completed după ce au ieșit din planificare)
    # Zilele din trecut, curente sau viitoare: acceptăm toate statusurile except cancelled
    # INCLUSIV draft-urile care au echipă asignată (au fost planificate dar nu formalizate),
    # in_progress, completed, etc., pentru ca Logistică să reflecte traseul complet al zilei.
    wos = db.query(WorkOrder).filter(
        WorkOrder.organization_id == admin.organization_id,
        WorkOrder.start_date == target_date,
        WorkOrder.status != 'cancelled',
        WorkOrder.assigned_team_id != None   # cu echipă asignată
    ).all()


    # 2. Group works by Team
    team_wos = {}
    for wo in wos:
        if wo.assigned_team_id:
            team_wos.setdefault(wo.assigned_team_id, []).append(wo)

    # 3. Fetch all active teams involved (to get their base and color)
    # We fetch ALL active teams so that teams without scheduled works (e.g. cranes) 
    # still get their GPS trace rendered.
    teams = db.query(Team).filter(
        Team.organization_id == admin.organization_id,
        Team.is_active == True
    ).all()

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
                
                # Resolve Client Name explicitly ignoring title
                w_name = w.client_name
                if not w_name and w.client_id:
                    from app.models import Client
                    c = db.query(Client).filter(Client.id == w.client_id).first()
                    if c:
                        w_name = c.name
                if not w_name:
                    w_name = "Client necunoscut"
                
                # Resolve Work Site Lat/Lng
                w_lat = w.site_latitude
                w_lng = w.site_longitude
                
                # Try from ConstructionSite if available
                if w.site_id:
                    s = db.query(ConstructionSite).filter(ConstructionSite.id == w.site_id).first()
                    if s and s.latitude and s.longitude:
                        w_lat = s.latitude
                        w_lng = s.longitude
                        w_name = f"{w_name} ({s.name})"

                # Fallback: geocode site_address via Google Maps API
                # Se încearcă MEREU dacă nu avem coordonate (nu doar prima dată)
                if not (w_lat and w_lng) and w.site_address:
                    geocoded = geocode_address(w.site_address)
                    if geocoded:
                        w_lat, w_lng = geocoded
                        # Persist coords so next load is instant
                        w.site_latitude = w_lat
                        w.site_longitude = w_lng
                        db.add(w)

                if w_lat and w_lng:
                    dist_from_prev = 0
                    segment = None
                    # Add distance
                    if last_lat and last_lng:
                        # Eliminăm cache-ul (w.route_distance_km) pentru a forța OSRM/Haversine să recalculeze mereu distanța corectă
                        dist_from_prev = osrm_distance(last_lat, last_lng, w_lat, w_lng)
                        
                        # Salvăm distanța pentru referințe externe (dacă e nevoie pe viitor)
                        w.route_distance_km = dist_from_prev
                        w.route_sand_kg = sand_kg
                        flag_modified(w, "route_distance_km")
                        
                        team_distance_km += dist_from_prev
                        segment = {
                            "from": "Baza" if last_name == base.name else last_name,
                            "to": w_name,
                            "km": round(dist_from_prev, 2),
                            "from_lat": last_lat,
                            "from_lng": last_lng
                        }
                
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
                else:
                    # WO fără coordonate — adaugă în waypoints ca informație dar fără lat/lng
                    # Nu afectează calculul de distanță
                    waypoints.append({
                        "type": "work",
                        "id": w.id,
                        "name": w_name,
                        "lat": None,
                        "lng": None,
                        "sand_kg": sand_kg,
                        "distance_from_prev_km": 0,
                        "no_coords": True
                    })

        # Waypoint N: Return to Base
        if base and base.latitude and base.longitude and len(waypoints) > 1:
            return_dist = 0.0
            if last_lat and last_lng:
                # Verifică dacă ultimul WO are deja segmentul de retur salvat
                last_wo = works[-1] if works else None
                existing_return_segment = None
                if last_wo and last_wo.route_segments:
                    segs = last_wo.route_segments if isinstance(last_wo.route_segments, list) else []
                    existing_return_segment = next((s for s in segs if s.get("to") == "Baza"), None)
                
                if existing_return_segment:
                    return_dist = float(existing_return_segment.get("km", 0))
                else:
                    return_dist = osrm_distance(last_lat, last_lng, base.latitude, base.longitude)
                    # Persistăm segmentul de retur cu flag_modified
                    if last_wo:
                        segments = list(last_wo.route_segments) if last_wo.route_segments else []
                        segments.append({
                            "from": last_name,
                            "to": "Baza",
                            "km": round(return_dist, 2),
                            "from_lat": last_lat,
                            "from_lng": last_lng
                        })
                        last_wo.route_segments = segments
                        flag_modified(last_wo, "route_segments")
                
                team_distance_km += return_dist

            waypoints.append({
                "type": "base_return",
                "id": base.id,
                "name": f"Return: {base.name}",
                "lat": base.latitude,
                "lng": base.longitude,
                "distance_from_prev_km": round(return_dist, 2)
            })

        grand_total_sand_kg += team_sand_kg
        grand_total_distance_km += team_distance_km

        # Resolve vehicle type for this team (from first WO with a vehicle)
        team_vehicle_type = "Camion"
        team_vehicle_id = None
        for w in works:
            if w.assigned_vehicle_id:
                v = db.query(Vehicle).filter(Vehicle.id == w.assigned_vehicle_id).first()
                if v:
                    if v.type:
                        team_vehicle_type = v.type
                    team_vehicle_id = v.id
                    break
        
        # Fallback: if no vehicle assigned directly to WOs, check if team leader has an active vehicle assignment
        if not team_vehicle_id and team.team_leader_id:
            from app.models import VehicleUserAssignment
            leader_assignment = db.query(VehicleUserAssignment).filter(
                VehicleUserAssignment.user_id == team.team_leader_id,
                VehicleUserAssignment.is_active == True
            ).first()
            if leader_assignment:
                v = db.query(Vehicle).filter(Vehicle.id == leader_assignment.vehicle_id).first()
                if v:
                    team_vehicle_id = v.id
                    if v.type:
                        team_vehicle_type = v.type

        # ── GPS Trace réel (Flespi via TripLog) ─────────────────────────────
        gps_trace = []
        if team_vehicle_id:
            trips = db.query(TripLog).filter(
                TripLog.vehicle_id == team_vehicle_id,
                TripLog.date == target_date
            ).order_by(TripLog.start_time).all()
            if trips:
                trip_ids = [t.id for t in trips]
                pts = db.query(TripGPSPoint).filter(
                    TripGPSPoint.trip_id.in_(trip_ids)
                ).order_by(TripGPSPoint.timestamp).all()
                gps_trace = [
                    {
                        "lat": p.latitude,
                        "lng": p.longitude,
                        "ts": p.timestamp.isoformat() if p.timestamp else None,
                        "speed": round(p.speed_kmh or 0, 1)
                    }
                    for p in pts
                ]
            else:
                # Fallback: Query Flespi directly if TripLog is empty
                v = db.query(Vehicle).filter(Vehicle.id == team_vehicle_id).first()
                if v and v.imei:
                    import os
                    import httpx
                    from datetime import datetime, timezone
                    FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
                    if FLESPI_TOKEN:
                        try:
                            day = target_date
                            tz_offset = 2
                            ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                            ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                            
                            url = f"https://flespi.io/gw/devices/all/messages"
                            headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
                            with httpx.Client(timeout=10.0) as client:
                                resp = client.get(url, headers=headers)
                                if resp.status_code == 200:
                                    flespi_data = resp.json().get("result", [])
                                    for msg in flespi_data:
                                        if str(msg.get("ident", "")) == str(v.imei):
                                            ts = msg.get("timestamp")
                                            if ts and ts >= ts_from and ts <= ts_to:
                                                lat = msg.get("position.latitude")
                                                lng = msg.get("position.longitude")
                                                if lat and lng:
                                                    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                                                    gps_trace.append({
                                                        "lat": lat,
                                                        "lng": lng,
                                                        "ts": dt.isoformat(),
                                                        "speed": round(msg.get("position.speed", 0), 1)
                                                    })
                                    gps_trace.sort(key=lambda x: x["ts"])
                        except Exception:
                            pass
        # ────────────────────────────────────────────────────────────────────

        routes.append({
            "team_id": team.id,
            "team_name": team.name,
            "team_color": team.color or "#3b82f6",
            "base_name": base.name if base else "N/A",
            "total_sand_kg": team_sand_kg,
            "total_distance_km": team_distance_km,
            "works_count": len(works),
            "waypoints": waypoints,
            "vehicle_type": team_vehicle_type,
            "gps_trace": gps_trace,
            "vehicle_id": team_vehicle_id
        })

    # ── 5. Add Cranes / Unassigned Vehicles with IMEI ────────────────────────
    # Include all active vehicles that have an IMEI and are not already handled by a team
    handled_vehicle_ids = {r.get("vehicle_id") for r in routes if r.get("vehicle_id")}
    
    unassigned_vehicles = db.query(Vehicle).filter(
        Vehicle.organization_id == admin.organization_id,
        Vehicle.is_active == True,
        Vehicle.imei != None
    ).all()

    for v in unassigned_vehicles:
        if v.id in handled_vehicle_ids:
            continue
            
        # Get GPS Trace for this vehicle
        gps_trace = []
        import os
        import httpx
        from datetime import datetime, timezone
        FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
        if FLESPI_TOKEN and v.imei:
            try:
                day = target_date
                tz_offset = 2
                ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                ts_to = int(datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
                
                url = f"https://flespi.io/gw/devices/all/messages"
                headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(url, headers=headers)
                    if resp.status_code == 200:
                        flespi_data = resp.json().get("result", [])
                        for msg in flespi_data:
                            if str(msg.get("ident", "")) == str(v.imei):
                                ts = msg.get("timestamp")
                                if ts and ts >= ts_from and ts <= ts_to:
                                    lat = msg.get("position.latitude")
                                    lng = msg.get("position.longitude")
                                    if lat and lng:
                                        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                                        gps_trace.append({
                                            "lat": lat,
                                            "lng": lng,
                                            "ts": dt.isoformat(),
                                            "speed": round(msg.get("position.speed", 0), 1)
                                        })
                        gps_trace.sort(key=lambda x: x["ts"])
            except Exception:
                pass

        routes.append({
            "team_id": v.id,  # Folosim ID-ul vehiculului pe post de ID echipă ca să nu crape UI-ul
            "team_name": v.name,
            "is_unassigned": True,
            "team_color": "#94a3b8", # Gri
            "base_name": "N/A",
            "total_sand_kg": 0,
            "total_distance_km": 0,
            "works_count": 0,
            "waypoints": [],
            "vehicle_type": v.type or "Camion",
            "gps_trace": gps_trace,
            "vehicle_id": v.id
        })


    try:
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()

    return {
        "date": target_date.isoformat(),
        "grand_total_sand_kg": grand_total_sand_kg,
        "grand_total_distance_km": grand_total_distance_km,
        "active_teams_count": len(routes),
        "routes": routes
    }

@router.get("/daily-routes")
def get_daily_routes(target_date: date, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    today = date.today()
    is_past = target_date < today
    
    # 0. Check if a cached/archived plan exists for this date (DB snapshot)
    existing_plan = db.query(LogisticsDailyPlan).filter(
        LogisticsDailyPlan.organization_id == admin.organization_id,
        LogisticsDailyPlan.date == target_date
    ).first()

    # ── Zilele DIN TRECUT: returnează snapshot-ul salvat (nu recalcula) ──────────
    # Invalidarea manuală se face prin butonul "Recalculer" (POST /archive-day)
    if is_past and existing_plan and existing_plan.snapshot_data:
        data = dict(existing_plan.snapshot_data)
        data["is_archived"] = True
        data["cached"] = True
        return data

    # ── Ziua CURENTă sau VIITOARE: in-memory cache cu TTL 5 minute ─────────────
    # Evităm recalculul la fiecare request (planning se schimbă rar).
    # Butonul "Recalculer" invalidează manual cache-ul.
    cached = _get_route_cache(admin.organization_id, target_date)
    if cached is not None:
        cached["cached"] = True
        return cached

    # ── Calculare efectivă ───────────────────────────────────────────────────────
    data = _calculate_daily_routes(target_date, db, admin)
    
    # Verifică dacă sunt waypoints incomplete (adrese fără coordonate GPS)
    has_incomplete = any(
        wp.get("type") == "work" and (wp.get("lat") is None or wp.get("lng") is None)
        for route in data.get("routes", [])
        for wp in route.get("waypoints", [])
    )
    
    # Salvăm snapshot în DB pentru zilele din trecut (arhivare automată)
    if is_past and data.get("routes"):
        data["_cached_at"] = datetime.now(timezone.utc).isoformat()
        
        if existing_plan:
            existing_plan.snapshot_data = data
            existing_plan.saved_by_id = admin.id
        else:
            existing_plan = LogisticsDailyPlan(
                organization_id=admin.organization_id,
                date=target_date,
                snapshot_data=data,
                saved_by_id=admin.id
            )
            db.add(existing_plan)
        
        try:
            db.commit()
        except Exception:
            db.rollback()
    else:
        # Ziua curentă/viitoare: salvăm în in-memory cache (5 min)
        _set_route_cache(admin.organization_id, target_date, data)
    
    # Răspuns final
    response_data = dict(data)
    response_data["is_archived"] = is_past
    response_data["cached"] = False
    if has_incomplete:
        response_data["archive_pending"] = True
        
    return response_data

@router.delete("/daily-routes/archive")
def delete_archived_day(target_date: date, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    """Șterge snapshot-ul arhivat pentru o dată → va fi recalculat la următoarea cerere."""
    existing = db.query(LogisticsDailyPlan).filter(
        LogisticsDailyPlan.organization_id == admin.organization_id,
        LogisticsDailyPlan.date == target_date
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Nu există snapshot arhivat pentru această dată.")
    db.delete(existing)
    db.commit()
    return {"status": "ok", "message": f"Snapshot pentru {target_date} a fost șters. Va fi recalculat."}

class ArchiveDayRequest(BaseModel):
    target_date: date

@router.post("/archive-day")
def archive_daily_routes(req: ArchiveDayRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    """Forțează recalculul rutelor pentru o zi și salvează snapshot-ul în DB.
    Util pentru: ziua de azi (force-refresh) sau zile din trecut care trebuie recalculate."""
    # Invalidăm cache-ul in-memory înainte de recalcul
    _invalidate_route_cache(admin.organization_id, req.target_date)
    
    snapshot = _calculate_daily_routes(req.target_date, db, admin)
    snapshot["_cached_at"] = datetime.now(timezone.utc).isoformat()
    
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
    # Actualizăm și cache-ul in-memory cu datele proaspete
    _set_route_cache(admin.organization_id, req.target_date, snapshot)
    return {"status": "ok", "message": "Rutele au fost recalculate și salvate."}


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
            "vehicle_type": getattr(vehicle, "type", None) or "Camion",
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
