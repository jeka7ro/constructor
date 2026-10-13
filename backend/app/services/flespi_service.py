import httpx
import logging
from datetime import datetime, timezone
import uuid
import os

from app.database import SessionLocal
from app.models import Vehicle, TripLog, TripGPSPoint

logger = logging.getLogger("flespi_service")

FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")

def poll_flespi_devices():
    """
    Polls Flespi API for all devices' latest messages.
    Matches the IMEI (ident) with our Vehicles table,
    and inserts GPS points into any active TripLog for that vehicle.
    """
    if not FLESPI_TOKEN:
        return

    url = "https://flespi.io/gw/devices/all/messages"
    import json
    import time
    
    # We only need messages since the last poll (e.g. 2 minutes ago to be safe)
    ts_from = int(time.time()) - 120
    params = {"data": json.dumps({"from": ts_from})}
    headers = {
        "Authorization": f"FlespiToken {FLESPI_TOKEN}",
        "Accept": "application/json"
    }

    telemetry_data = {}
    try:
        with httpx.Client(timeout=10.0) as client:
            # Send data as a query string parameter explicitly
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            # Also fetch current telemetry for all devices (ensures vehicles flushing buffers or parked remain visible)
            try:
                tel_url = "https://flespi.io/gw/devices/all/telemetry/position.latitude,position.longitude,position.speed,timestamp,ident"
                tel_res = client.get(tel_url, headers=headers)
                if tel_res.status_code == 200:
                    for item in tel_res.json().get("result", []):
                        t_obj = item.get("telemetry", {})
                        ident_val = str(t_obj.get("ident", {}).get("value", ""))
                        if ident_val:
                            telemetry_data[ident_val] = t_obj
            except Exception as e_tel:
                logger.warning(f"Failed to fetch telemetry from Flespi: {e_tel}")
    except Exception as e:
        logger.error(f"Failed to fetch Flespi data: {e}")
        return

    if "result" not in data and not telemetry_data:
        return

    db = SessionLocal()
    try:
        vehicles = db.query(Vehicle).filter(Vehicle.imei.isnot(None)).all()
        vehicle_map = {v.imei: v for v in vehicles}
        
        if not vehicle_map:
            return

        # Flespi returns a flat list of messages in data["result"]
        # Group them by ident
        from collections import defaultdict
        messages_by_ident = defaultdict(list)
        
        for msg in data.get("result", []):
            ident = str(msg.get("ident", ""))
            if ident:
                messages_by_ident[ident].append(msg)
                
        # Update vehicles without fresh messages from telemetry
        for ident, v in vehicle_map.items():
            if ident not in messages_by_ident and ident in telemetry_data:
                t_obj = telemetry_data[ident]
                t_lat = t_obj.get("position.latitude", {}).get("value")
                t_lon = t_obj.get("position.longitude", {}).get("value")
                t_speed = t_obj.get("position.speed", {}).get("value", 0.0)
                last_comm_ts = t_obj.get("ident", {}).get("ts") or t_obj.get("timestamp", {}).get("value")
                if t_lat is not None and t_lon is not None and last_comm_ts:
                    v.last_lat = t_lat
                    v.last_lng = t_lon
                    v.last_speed = t_speed or 0.0
                    v.last_seen_at = datetime.fromtimestamp(last_comm_ts, tz=timezone.utc).replace(tzinfo=None)
                
        added_points = 0
        for ident, messages in messages_by_ident.items():
                        
            vehicle = vehicle_map.get(ident)
            if not vehicle:
                continue

            # Update vehicle's live location from the absolute newest message
            if messages:
                latest_msg = max(messages, key=lambda x: x.get("timestamp", 0))
                v_lat = latest_msg.get("position.latitude")
                v_lon = latest_msg.get("position.longitude")
                v_ts = latest_msg.get("timestamp")
                if v_lat is not None and v_lon is not None and v_ts:
                    vehicle.last_lat = v_lat
                    vehicle.last_lng = v_lon
                    vehicle.last_speed = latest_msg.get("position.speed", 0.0)
                    vehicle.last_seen_at = datetime.fromtimestamp(v_ts, tz=timezone.utc).replace(tzinfo=None)

            active_trip = db.query(TripLog).filter(
                TripLog.vehicle_id == vehicle.id,
                TripLog.status == "in_progress"
            ).first()

            if not active_trip:
                continue

            last_point = db.query(TripGPSPoint).filter(
                TripGPSPoint.trip_id == active_trip.id
            ).order_by(TripGPSPoint.timestamp.desc()).first()
            
            last_timestamp = last_point.timestamp.timestamp() if last_point else 0.0

            messages.sort(key=lambda x: x.get("timestamp", 0))

            for msg in messages:
                ts = msg.get("timestamp")
                if not ts or ts <= last_timestamp:
                    continue
                    
                lat = msg.get("position.latitude")
                lon = msg.get("position.longitude")
                
                if lat is None or lon is None:
                    continue

                speed = msg.get("position.speed", 0.0)
                altitude = msg.get("position.altitude", 0.0)
                accuracy = msg.get("position.hdop", 0.0) * 5.0

                dt_obj = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)

                gps_point = TripGPSPoint(
                    id=str(uuid.uuid4()),
                    trip_id=active_trip.id,
                    latitude=lat,
                    longitude=lon,
                    speed_kmh=speed,
                    accuracy_m=accuracy,
                    altitude_m=altitude,
                    timestamp=dt_obj
                )
                db.add(gps_point)
                added_points += 1
                last_timestamp = ts

        # Always commit vehicle live location updates
        db.commit()
        if added_points > 0:
            logger.info(f"Flespi sync: Added {added_points} new GPS points.")
            
    except Exception as e:
        logger.error(f"Database error during Flespi sync: {e}")
        db.rollback()
    finally:
        db.close()
