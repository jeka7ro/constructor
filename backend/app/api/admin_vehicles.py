"""
Admin API endpoints for Fleet Management (Vehicles & Machinery)
Supports Many-to-Many: Vehicle <-> Sites, Vehicle <-> Drivers
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta

import json

from app.database import get_db
from app.models import Vehicle, VehicleSiteAssignment, VehicleUserAssignment, ConstructionSite, User, Admin, EquipmentDailyLog, WarehouseTransaction, WarehouseItem
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/vehicles", tags=["admin-fleet"])


# =================== PYDANTIC SCHEMAS ===================

class VehicleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    plate_number: Optional[str] = Field(None, max_length=20)
    chassis_number: Optional[str] = Field(None, max_length=50)
    flespi_device_id: Optional[int] = None
    imei: Optional[str] = Field(None, max_length=50)
    type: str = "van"
    year: Optional[int] = None
    status: str = "active"
    notes: Optional[str] = None
    documents: Optional[list] = None
    site_ids: List[str] = []
    user_ids: List[str] = []


class VehicleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    plate_number: Optional[str] = Field(None, max_length=20)
    chassis_number: Optional[str] = Field(None, max_length=50)
    flespi_device_id: Optional[int] = None
    imei: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[list] = None
    site_ids: Optional[List[str]] = None
    user_ids: Optional[List[str]] = None


class VehicleResponse(BaseModel):
    id: str
    name: str
    plate_number: Optional[str] = None
    flespi_device_id: Optional[int] = None
    imei: Optional[str] = None
    type: str
    year: Optional[int] = None
    status: str
    notes: Optional[str] = None
    site_ids: List[str] = []
    user_ids: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class EquipmentLogCreate(BaseModel):
    vehicle_id: str
    site_id: Optional[str] = None
    operator_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    is_used: bool = False
    refueled: bool = False
    refuel_liters: Optional[float] = None
    notes: Optional[str] = None


def get_vehicle_with_ids(vehicle: Vehicle, db: Session) -> dict:
    """Build response dict with associated site_ids and user_ids."""
    try:
        site_ids = [
            a.site_id for a in db.query(VehicleSiteAssignment)
            .filter(VehicleSiteAssignment.vehicle_id == vehicle.id, VehicleSiteAssignment.is_active == True)
            .all()
        ]
        user_ids = [
            a.user_id for a in db.query(VehicleUserAssignment)
            .filter(VehicleUserAssignment.vehicle_id == vehicle.id, VehicleUserAssignment.is_active == True)
            .all()
        ]
        return {
            "id": vehicle.id,
            "name": vehicle.name,
            "plate_number": vehicle.plate_number,
            "chassis_number": vehicle.chassis_number,
            "flespi_device_id": vehicle.flespi_device_id,
            "imei": vehicle.imei,
            "type": vehicle.type,
            "year": vehicle.year,
            "status": vehicle.status,
            "notes": vehicle.notes,
            "documents": vehicle.documents,
            "site_ids": site_ids,
            "user_ids": user_ids,
            "created_at": vehicle.created_at,
        }
    except Exception as e:
        import traceback
        with open("error.log", "a") as f:
            f.write(traceback.format_exc())
        raise


def sync_assignments(vehicle_id: str, new_site_ids: List[str], new_user_ids: List[str], db: Session):
    """Sync site and user assignments for a vehicle (replace all)."""
    # Sites — deactivate all, then re-create active ones
    db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.vehicle_id == vehicle_id
    ).delete(synchronize_session=False)

    for sid in new_site_ids:
        db.add(VehicleSiteAssignment(vehicle_id=vehicle_id, site_id=sid, is_active=True))

    # Users — same
    db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.vehicle_id == vehicle_id
    ).delete(synchronize_session=False)

    for uid in new_user_ids:
        db.add(VehicleUserAssignment(vehicle_id=vehicle_id, user_id=uid, is_active=True))


# =================== ENDPOINTS ===================

@router.get("", response_model=List[dict])
def list_vehicles(
    status: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all vehicles, optionally filtered by status."""
    q = db.query(Vehicle).filter(Vehicle.organization_id == current_admin.organization_id)
    if status:
        q = q.filter(Vehicle.status == status)
    vehicles = q.order_by(Vehicle.name).all()
    return [get_vehicle_with_ids(v, db) for v in vehicles]


@router.get("/expiring-documents", response_model=List[dict])
def get_expiring_documents(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieve all fleet documents expiring within 45 days, or already expired."""
    vehicles = db.query(Vehicle).filter(
        Vehicle.organization_id == current_admin.organization_id
    ).all()
    
    alerts = []
    threshold_date = date.today() + timedelta(days=45)
    today_str = date.today().isoformat()
    
    for v in vehicles:
        if v.documents:
            for doc in v.documents:
                exp_str = doc.get("expiry_date")
                if exp_str:
                    try:
                        exp = date.fromisoformat(exp_str)
                        if exp <= threshold_date:
                            days_left = (exp - date.today()).days
                            if days_left < 0:
                                status = 'expired'
                            elif days_left <= 7:
                                status = 'critical'
                            else:
                                status = 'warning'
                            alerts.append({
                                "vehicle_id": v.id,
                                "vehicle_name": v.name,
                                "registration": v.registration_number or v.chassis_number or "N/A",
                                "document_id": doc.get("id"),
                                "document_name": doc.get("name"),
                                "url": doc.get("url"),
                                "expiry_date": exp_str,
                                "days_left": days_left,
                                "status": status
                            })
                    except ValueError:
                        pass
    
    # Sort closest to expiration first
    alerts.sort(key=lambda x: x["days_left"])
    return alerts



@router.get("/by-site/{site_id}", response_model=List[dict])
def vehicles_for_site(
    site_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all vehicles currently assigned to a specific site."""
    assignments = db.query(VehicleSiteAssignment).filter(
        VehicleSiteAssignment.site_id == site_id,
        VehicleSiteAssignment.is_active == True,
    ).all()
    result = []
    for a in assignments:
        v = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first()
        if v:
            result.append(get_vehicle_with_ids(v, db))
    return result


@router.get("/fleet-report")
def fleet_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Aggregate equipment usage & fuel consumption per vehicle for a date range."""
    vehicles = db.query(Vehicle).filter(
        Vehicle.organization_id == current_admin.organization_id
    ).all()

    d_from = date.fromisoformat(date_from) if date_from else date.today().replace(day=1)
    d_to = date.fromisoformat(date_to) if date_to else date.today()

    result = []
    for v in vehicles:
        logs = db.query(EquipmentDailyLog).filter(
            EquipmentDailyLog.vehicle_id == v.id,
            EquipmentDailyLog.date >= d_from,
            EquipmentDailyLog.date <= d_to,
        ).all()

        days_used = sum(1 for l in logs if l.is_used)
        total_fuel = sum((l.refuel_liters or 0) for l in logs if l.refueled)
        refuel_events = sum(1 for l in logs if l.refueled)

        warehouse_txs = db.query(WarehouseTransaction).join(WarehouseItem).filter(
            WarehouseTransaction.assigned_to_vehicle_id == v.id,
            WarehouseTransaction.transaction_type == "OUT",
            WarehouseItem.category == "COMBUSTIBIL",
            WarehouseTransaction.date >= d_from,
            WarehouseTransaction.date <= d_to,
        ).all()

        total_fuel += sum((tx.quantity or 0) for tx in warehouse_txs)
        refuel_events += len(warehouse_txs)

        last_op_name = None
        last_logs = sorted(logs, key=lambda l: l.date, reverse=True)
        if last_logs and last_logs[0].operator_id:
            op = db.query(User).filter(User.id == last_logs[0].operator_id).first()
            if op:
                last_op_name = f"{op.first_name} {op.last_name}"

        result.append({
            "vehicle_id": v.id,
            "vehicle_name": v.name,
            "registration": v.registration_number or v.chassis_number or "N/A",
            "type": v.vehicle_type or "—",
            "status": v.status,
            "days_used": days_used,
            "days_idle": len(logs) - days_used,
            "total_logs": len(logs),
            "total_fuel_liters": round(total_fuel, 2),
            "refuel_events": refuel_events,
            "last_operator": last_op_name,
            "date_from": str(d_from),
            "date_to": str(d_to),
        })

    result.sort(key=lambda x: x["days_used"], reverse=True)
    return result

@router.get("/{vehicle_id}", response_model=dict)
def get_vehicle(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")
    return get_vehicle_with_ids(v, db)


@router.post("", response_model=dict, status_code=201)
def create_vehicle(
    payload: VehicleCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import uuid
    v = Vehicle(
        id=str(uuid.uuid4()),
        organization_id=current_admin.organization_id,
        name=payload.name,
        plate_number=payload.plate_number,
        chassis_number=payload.chassis_number,
        flespi_device_id=payload.flespi_device_id,
        imei=payload.imei,
        type=payload.type,
        year=payload.year,
        status=payload.status,
        notes=payload.notes,
        documents=payload.documents,
    )
    db.add(v)
    db.flush()  # get ID before sync
    sync_assignments(v.id, payload.site_ids, payload.user_ids, db)
    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)


@router.put("/{vehicle_id}", response_model=dict)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    if payload.name is not None:
        v.name = payload.name
    if payload.plate_number is not None:
        v.plate_number = payload.plate_number
    if hasattr(payload, 'chassis_number') and payload.chassis_number is not None:
        v.chassis_number = payload.chassis_number
    if hasattr(payload, 'flespi_device_id') and payload.flespi_device_id is not None:
        v.flespi_device_id = payload.flespi_device_id
    if hasattr(payload, 'imei') and payload.imei is not None:
        v.imei = payload.imei
    if payload.type is not None:
        v.type = payload.type
    if payload.year is not None:
        v.year = payload.year
    if payload.status is not None:
        v.status = payload.status
    if payload.notes is not None:
        v.notes = payload.notes
    if hasattr(payload, 'documents') and payload.documents is not None:
        v.documents = payload.documents

    if payload.site_ids is not None or payload.user_ids is not None:
        sync_assignments(
            v.id,
            payload.site_ids if payload.site_ids is not None else [],
            payload.user_ids if payload.user_ids is not None else [],
            db,
        )

    try:
        db.commit()
        db.refresh(v)
        return get_vehicle_with_ids(v, db)
    except Exception as e:
        db.rollback()
        err_str = str(e).lower()
        if "unique" in err_str or "duplicate" in err_str:
            if "imei" in err_str:
                raise HTTPException(status_code=422, detail="Cet IMEI est déjà utilisé par un autre véhicule.")
            if "flespi_device_id" in err_str:
                raise HTTPException(status_code=422, detail="Cet ID GPS est déjà utilisé par un autre véhicule.")
            raise HTTPException(status_code=422, detail="Une valeur en double a été détectée. Vérifiez l'IMEI et l'ID GPS.")
        raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde.")


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    # Cascade handled by DB relationships
    db.delete(v)
    db.commit()
    return None


@router.post("/{vehicle_id}/upload-document")
async def upload_vehicle_document(
    vehicle_id: str,
    file: UploadFile = File(...),
    custom_name: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_admin.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicul negasit")

    # Create directory if it doesn't exist
    upload_dir = "uploads/vehicles"
    os.makedirs(upload_dir, exist_ok=True)
    
    import uuid
    file_ext = file.filename.split(".")[-1]
    safe_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    doc_url = f"/api/{file_path}"
    
    docs = v.documents or []
    new_doc = {
        "id": str(uuid.uuid4()),
        "name": custom_name.strip() if custom_name and custom_name.strip() else file.filename,
        "url": doc_url,
        "uploaded_at": str(date.today()),
        "expiry_date": expiry_date,
        "original_filename": file.filename
    }
    docs.append(new_doc)
    v.documents = docs
    
    db.commit()
    db.refresh(v)
    return get_vehicle_with_ids(v, db)

@router.get("/by-user/{user_id}", response_model=List[dict])
def vehicles_for_user(
    user_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all vehicles assigned to a specific user (driver/operator)."""
    assignments = db.query(VehicleUserAssignment).filter(
        VehicleUserAssignment.user_id == user_id,
        VehicleUserAssignment.is_active == True,
    ).all()
    result = []
    for a in assignments:
        v = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first()
        if v:
            result.append(get_vehicle_with_ids(v, db))
    return result


@router.post("/equipment-logs", status_code=201)
def add_equipment_log(
    payload: EquipmentLogCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import uuid
    log_date = date.fromisoformat(payload.date)
    
    # Check if a log already exists for this vehicle and date
    existing = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.vehicle_id == payload.vehicle_id,
        EquipmentDailyLog.date == log_date
    ).first()
    
    if existing:
        existing.site_id = payload.site_id
        existing.operator_id = payload.operator_id
        existing.is_used = payload.is_used
        existing.refueled = payload.refueled
        existing.refuel_liters = payload.refuel_liters
        existing.notes = payload.notes
        db.commit()
        return {"message": "Log updated", "id": existing.id}
    
    log = EquipmentDailyLog(
        id=str(uuid.uuid4()),
        vehicle_id=payload.vehicle_id,
        site_id=payload.site_id,
        operator_id=payload.operator_id,
        date=log_date,
        is_used=payload.is_used,
        refueled=payload.refueled,
        refuel_liters=payload.refuel_liters,
        notes=payload.notes
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"message": "Log created", "id": log.id}


@router.get("/equipment-logs/operator/{operator_id}")
def get_equipment_logs_for_operator(
    operator_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.operator_id == operator_id
    ).order_by(desc(EquipmentDailyLog.date)).all()
    
    result = []
    # Pre-fetch vehicles
    all_vehicles = {v.id: v for v in db.query(Vehicle).filter(Vehicle.organization_id == current_admin.organization_id).all()}
    
    for log in logs:
        v = all_vehicles.get(log.vehicle_id)
        if not v:
            continue
            
        result.append({
            "id": log.id,
            "vehicle_id": log.vehicle_id,
            "vehicle_name": v.name,
            "plate_number": v.plate_number or v.chassis_number or "N/A",
            "site_id": log.site_id,
            "operator_id": log.operator_id,
            "date": str(log.date),
            "is_used": log.is_used,
            "refueled": log.refueled,
            "refuel_liters": log.refuel_liters,
            "notes": log.notes
        })
    return result


@router.get("/equipment-logs/{vehicle_id}/{date_str}")
def get_equipment_log(
    vehicle_id: str,
    date_str: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    log_date = date.fromisoformat(date_str)
    log = db.query(EquipmentDailyLog).filter(
        EquipmentDailyLog.vehicle_id == vehicle_id,
        EquipmentDailyLog.date == log_date
    ).first()
    
    if not log:
        return None
        
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "site_id": log.site_id,
        "operator_id": log.operator_id,
        "date": str(log.date),
        "is_used": log.is_used,
        "refueled": log.refueled,
        "refuel_liters": log.refuel_liters,
        "notes": log.notes
    }


@router.get("/{vehicle_id}/gps-history")
def get_gps_history(
    vehicle_id: str,
    date: str,  # YYYY-MM-DD
    from_hour: int = 0,
    to_hour: int = 24,
    db: Session = Depends(get_db),
):
    """
    Fetches GPS history for a vehicle on a given date directly from Flespi.
    Returns sorted list of {lat, lng, speed, ts} points.
    """
    import httpx
    import os
    from datetime import datetime, timezone

    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle or not vehicle.imei:
        return {"points": [], "error": "Vehicle has no IMEI configured"}

    FLESPI_TOKEN = os.getenv("FLESPI_TOKEN", "")
    if not FLESPI_TOKEN:
        return {"points": [], "error": "Flespi token not configured"}

    # Build UTC timestamps for the requested day+hours
    try:
        day = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return {"points": [], "error": "Invalid date format"}

    # Belgium is UTC+2 (CEST in summer), convert local hours to UTC
    tz_offset = 2  # CEST
    ts_from = int(datetime(day.year, day.month, day.day, max(0, from_hour - tz_offset), 0, 0, tzinfo=timezone.utc).timestamp())
    ts_to = int(datetime(day.year, day.month, day.day, min(23, to_hour - tz_offset), 59, 59, tzinfo=timezone.utc).timestamp())

    # Query Flespi for messages in the time range
    url = f"https://flespi.io/gw/devices/all/messages"
    headers = {
        "Authorization": f"FlespiToken {FLESPI_TOKEN}",
        "Accept": "application/json"
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        return {"points": [], "error": str(e)}

    results = data.get("result", [])

    # Filter by IMEI and time range
    points = []
    for msg in results:
        if str(msg.get("ident", "")) != vehicle.imei:
            continue
        ts = msg.get("timestamp")
        if not ts or ts < ts_from or ts > ts_to:
            continue
        lat = msg.get("position.latitude")
        lng = msg.get("position.longitude")
        if lat is None or lng is None:
            continue
        speed = msg.get("position.speed", 0) or 0
        points.append({
            "lat": lat,
            "lng": lng,
            "speed": round(float(speed), 1),
            "ts": ts,
            "time_local": datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%H:%M:%S")
        })

    # Sort by timestamp
    points.sort(key=lambda p: p["ts"])

    return {
        "vehicle_name": vehicle.name,
        "vehicle_plate": vehicle.plate_number,
        "date": date,
        "points": points,
        "total_points": len(points)
    }

