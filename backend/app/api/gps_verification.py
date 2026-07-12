"""
gps_verification.py — Verificare conformitate GPS vs Planning.
"""
import httpx
import os
import math
from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Vehicle, WorkOrder, Team, User
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/gps-verification", tags=["gps-verification"])

SPEED_LIMIT_DEFAULT = 90   # km/h
PROXIMITY_RADIUS_M = 300   # metrii


def haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))


def get_dynamic_speed_limits(track):
    """
    Fetch exact legal speed limits from OpenStreetMap (Overpass API)
    for segments where the vehicle was driving fast.
    """
    fast_pts = [p for p in track if p["speed"] >= 35]
    if not fast_pts:
        return {}
        
    reduced = []
    for p in fast_pts:
        if not reduced:
            reduced.append(p)
            continue
        last = reduced[-1]
        if haversine_m(last["lat"], last["lng"], p["lat"], p["lng"]) > 400:
            reduced.append(p)
            
    ways = []
    chunk_size = 100
    for i in range(0, len(reduced), chunk_size):
        chunk = reduced[i:i+chunk_size]
        query = "[out:json];("
        for pt in chunk:
            query += f'way(around:30,{pt["lat"]},{pt["lng"]})["maxspeed"];'
        query += ");out tags geom;"
        
        try:
            import requests
            resp = requests.post("https://overpass-api.de/api/interpreter", 
                                data={"data": query}, 
                                headers={"User-Agent": "SmartTimesheet/1.0"},
                                timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                for el in data.get("elements", []):
                    if "maxspeed" in el.get("tags", {}) and "geometry" in el:
                        speed_str = el["tags"]["maxspeed"]
                        try:
                            if speed_str.isdigit(): speed_val = int(speed_str)
                            elif "urban" in speed_str: speed_val = 50
                            elif "zone30" in speed_str: speed_val = 30
                            elif "living_street" in speed_str: speed_val = 20
                            else: speed_val = int(''.join(filter(str.isdigit, speed_str)))
                            
                            ways.append({
                                "maxspeed": speed_val,
                                "geom": [(n["lat"], n["lon"]) for n in el["geometry"]]
                            })
                        except Exception:
                            pass
        except Exception:
            pass

    def point_to_seg_dist(px, py, ax, ay, bx, by):
        dx = bx - ax
        dy = by - ay
        if dx == 0 and dy == 0:
            return math.hypot(px - ax, py - ay)
        t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
        t = max(0, min(1, t))
        cx = ax + t * dx
        cy = ay + t * dy
        return math.hypot(px - cx, py - cy)

    pt_limits = {}
    for pt in track:
        if pt["speed"] < 35:
            pt_limits[pt["time_local"]] = SPEED_LIMIT_DEFAULT
            continue
            
        best_dist = float('inf')
        best_speed = SPEED_LIMIT_DEFAULT
        
        for w in ways:
            for j in range(len(w["geom"]) - 1):
                ax, ay = w["geom"][j]
                bx, by = w["geom"][j+1]
                d = point_to_seg_dist(pt["lat"], pt["lng"], ax, ay, bx, by)
                if d < best_dist:
                    best_dist = d
                    best_speed = w["maxspeed"]
        
        if best_dist < 0.0003: # aprox 30 meters
            pt_limits[pt["time_local"]] = best_speed
        else:
            pt_limits[pt["time_local"]] = SPEED_LIMIT_DEFAULT

    return pt_limits


def fetch_flespi_track(imei: str, date_str: str, flespi_data: dict) -> List[dict]:
    day = datetime.strptime(date_str, "%Y-%m-%d")
    ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0).timestamp()) - 7200
    ts_to = ts_from + 86400

    points = []
    for msg in flespi_data.get("result", []):
        if str(msg.get("ident", "")) != imei:
            continue
        ts = msg.get("timestamp")
        if not ts or ts < ts_from or ts > ts_to:
            continue
        lat = msg.get("position.latitude")
        lng = msg.get("position.longitude")
        if lat is None or lng is None:
            continue
        speed = float(msg.get("position.speed") or 0)
        local_dt = datetime.fromtimestamp(ts, tz=timezone.utc) + timedelta(hours=2)
        points.append({
            "ts": ts, "lat": lat, "lng": lng,
            "speed": round(speed, 1),
            "time_local": local_dt.strftime("%H:%M:%S"),
        })
    points.sort(key=lambda p: p["ts"])
    return points


def analyze_site_visit(track, site_lat, site_lng):
    if not track or not site_lat or not site_lng:
        return {"arrived": None, "departed": None, "time_on_site_min": None, "max_speed_nearby": None}

    in_zone = False
    arrival_ts = None
    departure_ts = None
    max_speed_nearby = 0.0
    last_in_zone_ts = None

    for pt in track:
        dist = haversine_m(pt["lat"], pt["lng"], site_lat, site_lng)
        if dist <= PROXIMITY_RADIUS_M:
            if not in_zone:
                in_zone = True
                arrival_ts = pt["ts"]
            last_in_zone_ts = pt["ts"]
            max_speed_nearby = max(max_speed_nearby, pt["speed"])
        else:
            if in_zone and last_in_zone_ts and (pt["ts"] - last_in_zone_ts) > 300:
                departure_ts = last_in_zone_ts
                in_zone = False

    if in_zone:
        departure_ts = last_in_zone_ts

    if not arrival_ts:
        return {"arrived": None, "departed": None, "time_on_site_min": None, "max_speed_nearby": None}

    time_on_site_min = round((departure_ts - arrival_ts) / 60) if departure_ts else 0
    local_arrival = (datetime.fromtimestamp(arrival_ts, tz=timezone.utc) + timedelta(hours=2)).strftime("%H:%M")
    local_departure = (datetime.fromtimestamp(departure_ts, tz=timezone.utc) + timedelta(hours=2)).strftime("%H:%M") if departure_ts else None

    return {
        "arrived": local_arrival,
        "departed": local_departure,
        "time_on_site_min": time_on_site_min,
        "max_speed_nearby": round(max_speed_nearby, 1),
    }


def find_speed_violations(track, pt_limits, default_limit):
    violations = []
    for pt in track:
        # Legal road limit OR fallback default limit if not found
        road_limit = pt_limits.get(pt["time_local"], default_limit)
        limit = road_limit if road_limit != SPEED_LIMIT_DEFAULT else default_limit

        if pt["speed"] > limit:
            violations.append({
                "time": pt["time_local"],
                "speed": pt["speed"],
                "limit": limit,
                "lat": pt["lat"],
                "lng": pt["lng"],
                "excess": round(pt["speed"] - limit, 1),
            })
    return violations


def build_itinerary(track, base, orders):
    if not track:
        return []
        
    pois = []
    if base and base.latitude and base.longitude:
        pois.append({
            "type": "base",
            "name": base.name,
            "address": base.address,
            "lat": base.latitude,
            "lng": base.longitude
        })
        
    for wo in orders:
        lat = getattr(wo, 'site_latitude', None) or (wo.site.latitude if getattr(wo, 'site', None) else None)
        lng = getattr(wo, 'site_longitude', None) or (wo.site.longitude if getattr(wo, 'site', None) else None)
        if lat and lng:
            pois.append({
                "type": "work_order",
                "name": getattr(wo, 'client_name', None) or "Chantier",
                "address": getattr(wo, 'site_address', None) or "—",
                "lat": lat,
                "lng": lng
            })
            
    if not pois:
        return []
        
    itinerary = []
    current_poi = None
    arrival_ts = None
    last_seen_ts = None
    
    for pt in track:
        in_poi = None
        for p in pois:
            if haversine_m(pt["lat"], pt["lng"], p["lat"], p["lng"]) <= PROXIMITY_RADIUS_M:
                in_poi = p
                break
                
        if current_poi:
            if in_poi == current_poi:
                last_seen_ts = pt["ts"]
            else:
                if pt["ts"] - last_seen_ts > 300:
                    local_arr = (datetime.fromtimestamp(arrival_ts, tz=timezone.utc) + timedelta(hours=2)).strftime("%H:%M")
                    local_dep = (datetime.fromtimestamp(last_seen_ts, tz=timezone.utc) + timedelta(hours=2)).strftime("%H:%M")
                    itinerary.append({
                        "type": current_poi["type"],
                        "name": current_poi["name"],
                        "address": current_poi["address"],
                        "arrived": local_arr,
                        "departed": local_dep,
                        "duration_min": round((last_seen_ts - arrival_ts) / 60)
                    })
                    if in_poi:
                        current_poi = in_poi
                        arrival_ts = pt["ts"]
                        last_seen_ts = pt["ts"]
                    else:
                        current_poi = None
        else:
            if in_poi:
                current_poi = in_poi
                arrival_ts = pt["ts"]
                last_seen_ts = pt["ts"]

    if current_poi and last_seen_ts > arrival_ts:
        local_arr = (datetime.fromtimestamp(arrival_ts, tz=timezone.utc) + timedelta(hours=2)).strftime("%H:%M")
        local_dep = (datetime.fromtimestamp(last_seen_ts, tz=timezone.utc) + timedelta(hours=2)).strftime("%H:%M")
        itinerary.append({
            "type": current_poi["type"],
            "name": current_poi["name"],
            "address": current_poi["address"],
            "arrived": local_arr,
            "departed": local_dep,
            "duration_min": round((last_seen_ts - arrival_ts) / 60)
        })
        
    return itinerary

@router.get("/daily")
def daily_verification(
    date: str = Query(..., description="YYYY-MM-DD"),
    speed_limit: int = Query(90, description="Speed limit fallback"),
    vehicle: str = Query(None, description="Optional vehicle plate to filter by"),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin),
):
    import traceback
    try:
        FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
        if not FLESPI_TOKEN:
            return {"error": "Flespi token not configured", "results": []}

        query = db.query(Vehicle).filter(
            Vehicle.imei.isnot(None),
            Vehicle.status == "active"
        )
        if vehicle:
            query = query.filter(Vehicle.plate_number == vehicle)
            
        vehicles = query.all()

        import httpx
        flespi_data = {}
        try:
            from datetime import date as dt_date
            day_obj = dt_date.fromisoformat(date)
            ts_from = int(datetime(day_obj.year, day_obj.month, day_obj.day, 0, 0, 0).timestamp()) - 7200
            ts_to = ts_from + 86400
            
            if not vehicles:
                return {"results": []}

            # Build list of flespi device IDs (numeric) for vehicles that have them
            device_ids = [str(v.flespi_device_id) for v in vehicles if getattr(v, 'flespi_device_id', None)]

            if not device_ids:
                # Fallback: no configured devices, return empty
                return {"date": date, "results": [r for r in []]}

            url = f"https://flespi.io/gw/devices/{','.join(device_ids)}/messages"
            headers = {"Authorization": f"FlespiToken {FLESPI_TOKEN}", "Accept": "application/json"}

            params = {
                "data": f'{{"from":{ts_from},"to":{ts_to}}}'
            }

            with httpx.Client(timeout=60.0) as client:
                resp = client.get(url, headers=headers, params=params)
                resp.raise_for_status()
                flespi_data = resp.json()
        except Exception as e:
            traceback.print_exc()
            return {"error": f"GPS data fetch failed: {str(e)}", "results": []}

        results = []

        for vehicle in vehicles:
            wo_sample = db.query(WorkOrder).filter(
                WorkOrder.assigned_vehicle_id == vehicle.id,
                WorkOrder.assigned_team_id.isnot(None)
            ).order_by(WorkOrder.created_at.desc()).first()

            team = None
            base = None
            if wo_sample:
                team = db.query(Team).filter(Team.id == wo_sample.assigned_team_id).first()
                if team and getattr(team, 'base_id', None):
                    from app.models import LogisticBase
                    base = db.query(LogisticBase).filter(LogisticBase.id == team.base_id).first()

            try:
                from datetime import date as dt_date
                day_obj = dt_date.fromisoformat(date)
            except ValueError:
                continue

            orders = db.query(WorkOrder).filter(
                WorkOrder.assigned_vehicle_id == vehicle.id,
                WorkOrder.start_date == day_obj,
                WorkOrder.is_quote == False,
                WorkOrder.status.notin_(["cancelled"]),
            ).order_by(WorkOrder.start_time.asc()).all()

            track = fetch_flespi_track(vehicle.imei, date, flespi_data)
            
            # Skip OSM Overpass dynamic speed limits — too slow (30s+ per vehicle)
            # Use only the user-configured speed_limit parameter
            pt_limits = {}

            max_speed_overall = max((p["speed"] for p in track), default=0)
            speed_violations = find_speed_violations(track, pt_limits, speed_limit)
            total_km = 0.0
            if len(track) >= 2:
                for i in range(1, len(track)):
                    total_km += haversine_m(
                        track[i-1]["lat"], track[i-1]["lng"],
                        track[i]["lat"], track[i]["lng"]
                    ) / 1000
            total_km = round(total_km, 1)

            work_order_analysis = []
            itinerary = build_itinerary(track, base, orders)

            for wo in orders:
                site_lat = getattr(wo, 'site_latitude', None) or (wo.site.latitude if getattr(wo, 'site', None) else None)
                site_lng = getattr(wo, 'site_longitude', None) or (wo.site.longitude if getattr(wo, 'site', None) else None)

                visit = analyze_site_visit(track, site_lat, site_lng)
                planned_time = wo.start_time or "—"

                delay_min = None
                status = "no_data"
                if visit["arrived"] and planned_time and planned_time != "—":
                    try:
                        ph, pm = map(int, str(planned_time).split(":")[:2])
                        ah, am = map(int, visit["arrived"].split(":")[:2])
                        delay_min = (ah * 60 + am) - (ph * 60 + pm)
                        if delay_min <= 15:
                            status = "on_time"
                        elif delay_min <= 45:
                            status = "late"
                        else:
                            status = "very_late"
                    except Exception:
                        status = "arrived"
                elif visit["arrived"]:
                    status = "arrived"
                else:
                    status = "not_detected"

                work_order_analysis.append({
                    "id": wo.id,
                    "client_name": getattr(wo, 'client_name', None) or "—",
                    "site_address": getattr(wo, 'site_address', None) or "—",
                    "site_lat": site_lat,
                    "site_lng": site_lng,
                    "planned_time": str(planned_time),
                    "arrived": visit["arrived"],
                    "departed": visit["departed"],
                    "time_on_site_min": visit["time_on_site_min"],
                    "max_speed_nearby": visit["max_speed_nearby"],
                    "delay_min": delay_min,
                    "status": status,
                })

            # Try to get the avatar of the driver or team leader
            avatar_url = None
            try:
                # 1. Check if vehicle is assigned to a user directly
                from app.models import VehicleUserAssignment, User
                assignment = db.query(VehicleUserAssignment).filter(
                    VehicleUserAssignment.vehicle_id == vehicle.id,
                    VehicleUserAssignment.is_active == True
                ).order_by(VehicleUserAssignment.created_at.desc()).first()
                if assignment and assignment.user and assignment.user.avatar_path:
                    avatar_url = assignment.user.avatar_path
                # 2. Check team leader
                elif team and team.team_leader and team.team_leader.avatar_path:
                    avatar_url = team.team_leader.avatar_path
            except Exception:
                pass

            results.append({
                "vehicle_id": vehicle.id,
                "vehicle_name": vehicle.name,
                "vehicle_plate": vehicle.plate_number,
                "vehicle_type": getattr(vehicle, "type", None) or "Camion",
                "team_id": team.id if team else None,
                "team_name": team.name if team else "Non assigne",
                "team_color": team.color if team else "#64748b",
                "avatar_url": avatar_url,
                "gps_points": len(track),
                "total_km": total_km,
                "max_speed_kmh": round(max_speed_overall, 1),
                "speed_violations_count": len(speed_violations),
                "speed_violations": speed_violations[:20],
                "track": track,
                "work_orders": work_order_analysis,
                "itinerary": itinerary,
            })

        return {
            "date": date,
            "results": results,
            "speed_limit_kmh": SPEED_LIMIT_DEFAULT,
            "proximity_radius_m": PROXIMITY_RADIUS_M,
        }
    except Exception as e:
        traceback.print_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"detail": f"Erreur interne: {str(e)}"})
