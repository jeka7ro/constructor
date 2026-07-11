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


def fetch_flespi_track(imei: str, date_str: str, token: str) -> List[dict]:
    url = "https://flespi.io/gw/devices/all/messages"
    headers = {"Authorization": f"FlespiToken {token}", "Accept": "application/json"}
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    day = datetime.strptime(date_str, "%Y-%m-%d")
    ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0).timestamp()) - 7200
    ts_to = ts_from + 86400

    points = []
    for msg in data.get("result", []):
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


def find_speed_violations(track, limit=SPEED_LIMIT_DEFAULT):
    violations = []
    for pt in track:
        if pt["speed"] > limit:
            violations.append({
                "time": pt["time_local"],
                "speed": pt["speed"],
                "lat": pt["lat"],
                "lng": pt["lng"],
                "excess": round(pt["speed"] - limit, 1),
            })
    return violations


@router.get("/daily")
def daily_verification(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin),
):
    import traceback
    try:
        FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
        if not FLESPI_TOKEN:
            return {"error": "Flespi token not configured", "results": []}

        vehicles = db.query(Vehicle).filter(
            Vehicle.imei.isnot(None),
            Vehicle.status == "active"
        ).all()

        results = []

        for vehicle in vehicles:
            wo_sample = db.query(WorkOrder).filter(
                WorkOrder.assigned_vehicle_id == vehicle.id,
                WorkOrder.assigned_team_id.isnot(None)
            ).order_by(WorkOrder.created_at.desc()).first()

            team = None
            if wo_sample:
                team = db.query(Team).filter(Team.id == wo_sample.assigned_team_id).first()

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

            track = fetch_flespi_track(vehicle.imei, date, FLESPI_TOKEN)

            max_speed_overall = max((p["speed"] for p in track), default=0)
            speed_violations = find_speed_violations(track)
            total_km = 0.0
            if len(track) >= 2:
                for i in range(1, len(track)):
                    total_km += haversine_m(
                        track[i-1]["lat"], track[i-1]["lng"],
                        track[i]["lat"], track[i]["lng"]
                    ) / 1000
            total_km = round(total_km, 1)

            work_order_analysis = []
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

            results.append({
                "vehicle_id": vehicle.id,
                "vehicle_name": vehicle.name,
                "vehicle_plate": vehicle.plate_number,
                "team_name": team.name if team else "Non assigne",
                "team_color": team.color if team else "#64748b",
                "gps_points": len(track),
                "total_km": total_km,
                "max_speed_kmh": round(max_speed_overall, 1),
                "speed_violations_count": len(speed_violations),
                "speed_violations": speed_violations[:20],
                "track": track,
                "work_orders": work_order_analysis,
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
