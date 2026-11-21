"""
Clock-In/Out API endpoints with GPS tracking and geofencing
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, date, time as dtime, timedelta
from typing import Optional
from math import radians, cos, sin, asin, sqrt

from app.timezone import get_local_now, get_local_today

from app.database import get_db
from app.models import User, ConstructionSite, Timesheet, TimesheetSegment, GeofencePause, Role, TimesheetLine, Activity, WorkOrder
from app.api.auth import get_current_user

router = APIRouter()


# Pydantic Models
class ClockInRequest(BaseModel):
    site_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    self_declaration: bool = False  # "pe proprie raspundere"
    work_order_id: Optional[str] = None  # Comanda de lucru opțională


class ClockOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BreakRequest(BaseModel):
    latitude: float
    longitude: float


class LocationPingRequest(BaseModel):
    latitude: float
    longitude: float


class ActiveShiftResponse(BaseModel):
    timesheet_id: str
    segment_id: str
    site_id: str
    site_name: str
    check_in_time: datetime
    is_on_break: bool
    break_start_time: Optional[datetime] = None
    elapsed_hours: float
    break_hours: float

    class Config:
        from_attributes = True


# Helper Functions
def ensure_time(t):
    if not t: return None
    if isinstance(t, str):
        try:
            return dtime.fromisoformat(t[:8]) if len(t) >= 5 else None
        except ValueError:
            return None
    return t

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula
    Returns distance in meters
    """
    R = 6371000  # Earth radius in meters
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c


def verify_geofence(employee_lat: float, employee_lon: float, 
                   site_lat: float, site_lon: float, radius: int) -> tuple[bool, float]:
    """
    Check if employee is within site geofence
    Returns (is_within, distance_in_meters)
    """
    distance = calculate_distance(employee_lat, employee_lon, site_lat, site_lon)
    return distance <= radius, distance


def get_geofence_pause_seconds(db: Session, segment_id: str) -> float:
    """Calculate total geofence pause time for a segment in seconds"""
    pauses = db.query(GeofencePause).filter(
        GeofencePause.segment_id == segment_id
    ).all()
    total = 0.0
    now = get_local_now()
    for p in pauses:
        end = p.pause_end or now
        total += (end - p.pause_start).total_seconds()
    return total


def is_geofence_applicable(db: Session, user: User) -> bool:
    """Check if geofence auto-pause applies to this user's role.
    Only applies to WORKER and TEAM_LEAD roles."""
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        return False
    return role.code in ("WORKER", "TEAM_LEAD")


# API Endpoints
@router.post("/timesheets/clock-in")
def clock_in(
    request: ClockInRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new work shift with GPS verification"""
    
    # Check if user already has an active shift
    today = get_local_today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if active_timesheet:
        # Check if there's an active segment (no check_out_time)
        active_segment = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == active_timesheet.id,
            TimesheetSegment.check_out_time == None
        ).first()
        
        if active_segment:
            raise HTTPException(
                status_code=400,
                detail="Ai deja o tură activă. Închide tura curentă înainte de a începe una nouă."
            )
    
    # Get site details from construction_sites table
    site = db.query(ConstructionSite).filter(ConstructionSite.id == request.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Șantier negăsit")
    
    # ----- GPS REQUIREMENT -----
    gps_available = request.latitude is not None and request.longitude is not None
    
    # If no GPS and no self-declaration, require GPS
    if not gps_available and not request.self_declaration:
        raise HTTPException(
            status_code=400,
            detail="Locația GPS este necesară pentru pontare. Activează GPS-ul sau bifează declarația pe proprie răspundere."
        )
    
    # ----- SCHEDULE ENFORCEMENT -----
    now = get_local_now()
    current_time = now.time()
    schedule_info = {}
    
    work_start_time = ensure_time(site.work_start_time)
    work_end_time = ensure_time(site.work_end_time)
    
    if work_start_time and work_end_time:
        # Block clock-in after schedule ends
        if current_time > work_end_time:
            raise HTTPException(
                status_code=400,
                detail=f"Programul șantierului s-a încheiat la {work_end_time.strftime('%H:%M')}. Nu poți începe o tură nouă."
            )
        
        # Block clock-in too early (30 min before start)
        earliest_dt = datetime.combine(today, work_start_time) - timedelta(minutes=30)
        if current_time < earliest_dt.time():
            raise HTTPException(
                status_code=400,
                detail=f"Programul șantierului începe la {work_start_time.strftime('%H:%M')}. Poți face pontajul cu maxim 30 de minute înainte."
            )
        
        max_overtime = int(site.max_overtime_minutes) if site.max_overtime_minutes else 120
        schedule_info = {
            "work_start": work_start_time.strftime('%H:%M'),
            "work_end": work_end_time.strftime('%H:%M'),
            "max_overtime_minutes": max_overtime
        }
    
    # ----- GEOFENCE VERIFICATION -----
    is_within_geofence = True
    distance_from_site = None
    self_declared = False
    
    if gps_available and site.latitude and site.longitude:
        is_within_geofence, distance_from_site = verify_geofence(
            request.latitude, request.longitude,
            site.latitude, site.longitude,
            site.geofence_radius or 300
        )
        
        # TEMPORARY: Allow check-in from anywhere for testing (no distance blocking)
        if not is_within_geofence:
            self_declared = True
    elif not gps_available and request.self_declaration:
        # No GPS but self-declared — allowed but marked
        self_declared = True
        is_within_geofence = False
    
    # Create timesheet if doesn't exist
    if not active_timesheet:
        active_timesheet = Timesheet(
            organization_id=current_user.organization_id,
            date=today,
            owner_type="USER",
            owner_user_id=current_user.id,
            status="DRAFT"
        )
        db.add(active_timesheet)
        db.flush()
    
    # Create new segment (clock-in)
    actual_time = get_local_now()
    effective_checkin = actual_time
    is_early_checkin = False
    billable_start_time = None
    
    # Clamp check-in time: if before site start, record as site start for billing
    if work_start_time:
        site_start_dt = datetime.combine(today, work_start_time)
        if actual_time < site_start_dt:
            effective_checkin = site_start_dt
            is_early_checkin = True
            billable_start_time = site_start_dt.strftime('%H:%M')

    segment = TimesheetSegment(
        timesheet_id=active_timesheet.id,
        site_id=request.site_id,
        check_in_time=effective_checkin,
        actual_check_in_time=actual_time,
        check_out_time=None,
        check_in_latitude=request.latitude,
        check_in_longitude=request.longitude,
        is_within_geofence=is_within_geofence and not self_declared,
        distance_from_site=distance_from_site,
        work_order_id=request.work_order_id if request.work_order_id else None,
    )
    
    db.add(segment)
    db.commit()
    db.refresh(segment)
    
    return {
        "timesheet_id": active_timesheet.id,
        "segment_id": segment.id,
        "check_in_time": segment.check_in_time,
        "actual_check_in_time": segment.actual_check_in_time,
        "is_within_geofence": is_within_geofence,
        "self_declared": self_declared,
        "gps_available": gps_available,
        "distance_from_site": distance_from_site,
        "site_name": site.name,
        "is_early_checkin": is_early_checkin,
        "billable_start_time": billable_start_time,
        **schedule_info
    }



@router.post("/timesheets/clock-out")
def clock_out(
    request: ClockOutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End current work shift with GPS verification"""
    
    # Find active segment
    today = get_local_today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
    
    # End any active break
    if active_segment.break_start_time and not active_segment.break_end_time:
        active_segment.break_end_time = get_local_now()
    
    # Close any active geofence pause
    active_geo_pause = db.query(GeofencePause).filter(
        GeofencePause.segment_id == active_segment.id,
        GeofencePause.pause_end == None
    ).first()
    if active_geo_pause:
        active_geo_pause.pause_end = get_local_now()
    
    # Update segment with clock-out
    active_segment.check_out_time = get_local_now()
    if request.latitude is not None:
        active_segment.check_out_latitude = request.latitude
    if request.longitude is not None:
        active_segment.check_out_longitude = request.longitude
    
    # Calculate total hours
    duration = active_segment.check_out_time - active_segment.check_in_time
    total_hours = duration.total_seconds() / 3600
    
    # Calculate break hours
    break_hours = 0
    if active_segment.break_start_time and active_segment.break_end_time:
        break_duration = active_segment.break_end_time - active_segment.break_start_time
        break_hours = break_duration.total_seconds() / 3600
    
    # Auto lunch break calculation (Temporarily disabled to avoid user confusion)
    # lunch_break_start = ensure_time(site.lunch_break_start) if site else None
    # lunch_break_end = ensure_time(site.lunch_break_end) if site else None
    
    # if site and lunch_break_start and lunch_break_end:
    #     lunch_start_dt = datetime.combine(get_local_today(), lunch_break_start)
    #     lunch_end_dt = datetime.combine(get_local_today(), lunch_break_end)
    #     
    #     overlap_start = max(active_segment.check_in_time, lunch_start_dt)
    #     overlap_end = min(active_segment.check_out_time, lunch_end_dt)
    #     
    #     if overlap_start < overlap_end:
    #         auto_break_hours = (overlap_end - overlap_start).total_seconds() / 3600
    #         if auto_break_hours > break_hours:
    #             break_hours = auto_break_hours
    
    # Calculate geofence pause hours
    geofence_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
    geofence_pause_hours = geofence_pause_secs / 3600
    
    # ----- OVERTIME CALCULATION -----
    overtime_minutes = 0
    overtime_warning = None
    
    work_end_time = ensure_time(site.work_end_time) if site else None
    if site and work_end_time:
        schedule_end_dt = datetime.combine(get_local_today(), work_end_time)
        if active_segment.check_out_time > schedule_end_dt:
            overtime_minutes = int((active_segment.check_out_time - schedule_end_dt).total_seconds() / 60)
            active_segment.overtime_minutes = overtime_minutes
            
            max_ot = int(site.max_overtime_minutes) if site.max_overtime_minutes else 120
            if overtime_minutes > max_ot:
                overtime_warning = f"Ai depășit limita de overtime ({max_ot} min). Orele suplimentare necesită aprobare."
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "check_out_time": active_segment.check_out_time,
        "total_hours": round(total_hours, 2),
        "break_hours": round(break_hours, 2),
        "geofence_pause_hours": round(geofence_pause_hours, 2),
        "worked_hours": max(0, round(total_hours - break_hours - geofence_pause_hours, 2)),
        "overtime_minutes": overtime_minutes,
        "overtime_warning": overtime_warning
    }


@router.post("/timesheets/start-break")
def start_break(
    request: BreakRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start meal break"""
    
    # Find active segment
    today = get_local_today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    if active_segment.break_start_time and not active_segment.break_end_time:
        raise HTTPException(status_code=400, detail="Ai deja o pauză activă")
    
    # Start break
    active_segment.break_start_time = get_local_now()
    active_segment.break_start_latitude = request.latitude
    active_segment.break_start_longitude = request.longitude
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "break_start_time": active_segment.break_start_time
    }


@router.post("/timesheets/end-break")
def end_break(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End meal break"""
    
    # Find active segment with active break
    today = get_local_today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        raise HTTPException(status_code=404, detail="Nu ai o tură activă")
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.break_start_time != None,
        TimesheetSegment.break_end_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        raise HTTPException(status_code=404, detail="Nu ai o pauză activă")
    
    # End break
    active_segment.break_end_time = get_local_now()
    
    # Calculate break duration
    break_duration = active_segment.break_end_time - active_segment.break_start_time
    break_minutes = break_duration.total_seconds() / 60
    
    db.commit()
    
    return {
        "segment_id": active_segment.id,
        "break_end_time": active_segment.break_end_time,
        "break_duration_minutes": round(break_minutes, 1)
    }


@router.get("/timesheets/active-shift")
def get_active_shift(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current active shift if any"""
    try:
        today = get_local_today()
        active_timesheet = db.query(Timesheet).filter(
            Timesheet.owner_user_id == current_user.id,
            Timesheet.date == today,
            Timesheet.status == "DRAFT"
        ).first()
        
        if not active_timesheet:
            return JSONResponse(content=None)
        
        active_segment = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == active_timesheet.id,
            TimesheetSegment.check_out_time == None
        ).order_by(TimesheetSegment.check_in_time.desc()).first()
        
        if not active_segment:
            return JSONResponse(content=None)
        
        site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
        
        work_start_time = ensure_time(site.work_start_time) if site else None
        work_end_time = ensure_time(site.work_end_time) if site else None
        
        # ---- AUTO-CLOSE at schedule end ----
        now = get_local_now()
        if site and work_end_time:
            schedule_end = datetime.combine(today, work_end_time)
            
            # Only auto-close if segment started BEFORE schedule end (prevents zombies)
            if active_segment.check_in_time < schedule_end and now > schedule_end:
                active_segment.check_out_time = schedule_end
                
                # Close any active break
                if active_segment.break_start_time and not active_segment.break_end_time:
                    active_segment.break_end_time = schedule_end
                
                # Close any active geofence pause
                active_geo_pause = db.query(GeofencePause).filter(
                    GeofencePause.segment_id == active_segment.id,
                    GeofencePause.pause_end == None
                ).first()
                if active_geo_pause:
                    active_geo_pause.pause_end = schedule_end
                
                db.commit()
                return JSONResponse(content=None)  # Shift closed at schedule end
        
        # Calculate elapsed time
        now = get_local_now()
        elapsed = now - active_segment.check_in_time
        elapsed_hours = elapsed.total_seconds() / 3600
        
        # Calculate break time
        break_hours = 0
        if active_segment.break_start_time:
            if active_segment.break_end_time:
                break_duration = active_segment.break_end_time - active_segment.break_start_time
                break_hours = break_duration.total_seconds() / 3600
            else:
                # Break is active
                break_duration = now - active_segment.break_start_time
                break_hours = break_duration.total_seconds() / 3600
                
        # Auto lunch break implementation (Temporarily disabled)
        # lunch_break_start = ensure_time(site.lunch_break_start) if site else None
        # lunch_break_end = ensure_time(site.lunch_break_end) if site else None
        # 
        # if site and lunch_break_start and lunch_break_end:
        #     lunch_start_dt = datetime.combine(today, lunch_break_start)
        #     lunch_end_dt = datetime.combine(today, lunch_break_end)
        #     
        #     overlap_start = max(active_segment.check_in_time, lunch_start_dt)
        #     overlap_end = min(now, lunch_end_dt)
        #     
        #     if overlap_start < overlap_end:
        #         auto_break_hours = (overlap_end - overlap_start).total_seconds() / 3600
        #         if auto_break_hours > break_hours:
        #             break_hours = auto_break_hours
        
        # Calculate geofence pause time
        geofence_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
        geofence_pause_hours = geofence_pause_secs / 3600
        
        # Check if currently outside geofence
        active_geo_pause = db.query(GeofencePause).filter(
            GeofencePause.segment_id == active_segment.id,
            GeofencePause.pause_end == None
        ).first()
        
        # Detect GPS loss: no ping in last 5 minutes (daca a trimis ping vreodata)
        gps_lost = False
        if active_segment.last_ping_at:
            since_last_ping = (now - active_segment.last_ping_at).total_seconds()
            gps_lost = since_last_ping > 300  # 5 minute fara ping = GPS pierdut
        # Daca nu a trimis niciodata un ping, nu marcam GPS pierdut
        
        max_overtime = int(site.max_overtime_minutes) if site and site.max_overtime_minutes else 120

        # Work Order info
        work_order_title = None
        if active_segment.work_order_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == active_segment.work_order_id).first()
            if wo:
                work_order_title = wo.title

        return {
            "timesheet_id": active_timesheet.id,
            "segment_id": active_segment.id,
            "site_id": active_segment.site_id,
            "site_name": site.name if site else "Unknown",
            "site_latitude": site.latitude if site else None,
            "site_longitude": site.longitude if site else None,
            "site_geofence_radius": site.geofence_radius if site else 300,
            "check_in_time": str(active_segment.check_in_time),
            "is_on_break": bool(active_segment.break_start_time and not active_segment.break_end_time),
            "break_start_time": str(active_segment.break_start_time) if active_segment.break_start_time else None,
            "elapsed_hours": round(elapsed_hours, 2),
            "break_hours": round(break_hours, 2),
            "geofence_pause_hours": round(geofence_pause_hours, 2),
            "is_outside_geofence": bool(active_geo_pause),
            "gps_lost": gps_lost,
            "last_ping_at": str(active_segment.last_ping_at) if active_segment.last_ping_at else None,
            "geofence_pause_distance": active_geo_pause.distance_at_pause if active_geo_pause else None,
            # Schedule info
            "work_start_time": work_start_time.strftime('%H:%M') if work_start_time else None,
            "work_end_time": work_end_time.strftime('%H:%M') if work_end_time else None,
            "max_overtime_minutes": max_overtime,
            "schedule_end_datetime": str(datetime.combine(today, work_end_time)) if work_end_time else None,
            "overtime_limit_datetime": str(datetime.combine(today, work_end_time) + timedelta(minutes=max_overtime)) if work_end_time else None,
            # Work Order
            "work_order_id": active_segment.work_order_id,
            "work_order_title": work_order_title,
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Active shift error: {error_details}")


@router.post("/timesheets/location-ping")
def location_ping(
    request: LocationPingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Periodic location ping to enforce geofence auto-pause.
    Called every 30s by the frontend while a shift is active.
    If worker is >300m from site, creates a GeofencePause.
    When they return within range, closes the pause."""
    
    # Only applies to WORKER and TEAM_LEAD
    if not is_geofence_applicable(db, current_user):
        return {"geofence_applicable": False, "message": "Geofence nu se aplică pentru rolul tău"}
    
    # Find active segment
    today = get_local_today()
    active_timesheet = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not active_timesheet:
        return {"geofence_applicable": False, "message": "Nicio tură activă"}
    
    active_segment = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == active_timesheet.id,
        TimesheetSegment.check_out_time == None
    ).order_by(TimesheetSegment.check_in_time.desc()).first()
    
    if not active_segment:
        return {"geofence_applicable": False, "message": "Nicio tură activă"}
    
    # Get site coordinates
    site = db.query(ConstructionSite).filter(ConstructionSite.id == active_segment.site_id).first()
    if not site or not site.latitude or not site.longitude:
        return {
            "geofence_applicable": False,
            "message": "Șantierul nu are coordonate GPS configurate"
        }
    
    # Record last ping time
    active_segment.last_ping_at = get_local_now()
    db.commit()
    
    # Calculate distance
    distance = calculate_distance(
        request.latitude, request.longitude,
        site.latitude, site.longitude
    )
    
    geofence_radius = site.geofence_radius or 300
    is_within = distance <= geofence_radius
    
    # Check if there's an active geofence pause
    active_pause = db.query(GeofencePause).filter(
        GeofencePause.segment_id == active_segment.id,
        GeofencePause.pause_end == None
    ).first()
    
    status_changed = False
    
    if not is_within and not active_pause:
        # Worker left the zone — create a pause
        new_pause = GeofencePause(
            segment_id=active_segment.id,
            pause_start=get_local_now(),
            distance_at_pause=round(distance, 1),
            latitude=request.latitude,
            longitude=request.longitude
        )
        db.add(new_pause)
        db.commit()
        status_changed = True
        
        return {
            "geofence_applicable": True,
            "is_within_geofence": False,
            "distance": round(distance, 1),
            "geofence_radius": geofence_radius,
            "status": "PAUSED",
            "status_changed": True,
            "message": f"Ai ieșit din raza șantierului ({int(distance)}m). Orele nu se mai numără."
        }
    
    elif is_within and active_pause:
        # Worker returned — close the pause
        active_pause.pause_end = get_local_now()
        db.commit()
        
        pause_duration = (active_pause.pause_end - active_pause.pause_start).total_seconds()
        
        return {
            "geofence_applicable": True,
            "is_within_geofence": True,
            "distance": round(distance, 1),
            "geofence_radius": geofence_radius,
            "status": "RESUMED",
            "status_changed": True,
            "pause_duration_seconds": round(pause_duration, 0),
            "message": f"Ai revenit în raza șantierului. Cronometrul a repornit."
        }
    
    else:
        # No change
        total_pause_secs = get_geofence_pause_seconds(db, active_segment.id)
        
        return {
            "geofence_applicable": True,
            "is_within_geofence": is_within,
            "distance": round(distance, 1),
            "geofence_radius": geofence_radius,
            "status": "ACTIVE" if is_within else "PAUSED",
            "status_changed": False,
            "total_geofence_pause_seconds": round(total_pause_secs, 0),
            "message": None
        }


@router.get("/timesheets/my-today")
def my_today_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has completed segments today (for 'Continuă tura' UX)"""
    today = get_local_today()
    ts = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == today,
        Timesheet.status == "DRAFT"
    ).first()
    
    if not ts:
        return {"has_completed_segments": False}
    
    completed = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == ts.id,
        TimesheetSegment.check_out_time != None
    ).count()
    
    return {"has_completed_segments": completed > 0}


@router.get("/timesheets/my-history")
def my_history(
    target_date: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get employee's own timesheet details for a specific date"""
    if target_date:
        d = date.fromisoformat(target_date)
    else:
        d = get_local_today()
    
    ts = db.query(Timesheet).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date == d
    ).first()
    
    if not ts:
        return {"date": str(d), "found": False, "segments": [], "activities": [], "total_worked": 0, "total_break": 0}
    
    segments = db.query(TimesheetSegment).filter(
        TimesheetSegment.timesheet_id == ts.id
    ).order_by(TimesheetSegment.check_in_time.asc()).all()
    
    total_worked = 0
    total_break = 0
    seg_list = []
    
    for seg in segments:
        if seg.check_out_time:
            seg_hours = (seg.check_out_time - seg.check_in_time).total_seconds() / 3600
        else:
            seg_hours = (get_local_now() - seg.check_in_time).total_seconds() / 3600
        
        brk = 0
        if seg.break_start_time:
            be = seg.break_end_time or get_local_now()
            brk = (be - seg.break_start_time).total_seconds() / 3600
            
        site = db.query(ConstructionSite).filter(ConstructionSite.id == seg.site_id).first()
        
        # Auto lunch break logic (Temporarily disabled)
        # lunch_break_start = ensure_time(site.lunch_break_start) if site else None
        # lunch_break_end = ensure_time(site.lunch_break_end) if site else None
        # 
        # if site and lunch_break_start and lunch_break_end:
        #     lunch_start_dt = datetime.combine(d, lunch_break_start)
        #     lunch_end_dt = datetime.combine(d, lunch_break_end)
        #     
        #     check_out = seg.check_out_time or get_local_now()
        #     overlap_start = max(seg.check_in_time, lunch_start_dt)
        #     overlap_end = min(check_out, lunch_end_dt)
        #     
        #     if overlap_start < overlap_end:
        #         auto_brk = (overlap_end - overlap_start).total_seconds() / 3600
        #         if auto_brk > brk:
        #             brk = auto_brk
        
        geo_pause = get_geofence_pause_seconds(db, seg.id) / 3600
        worked = max(0, seg_hours - brk - geo_pause)
        total_worked += worked
        total_break += brk
        
        seg_list.append({
            "check_in": str(seg.check_in_time),
            "check_out": str(seg.check_out_time) if seg.check_out_time else None,
            "site_name": site.name if site else "N/A",
            "worked_hours": round(worked, 2),
            "break_hours": round(brk, 2),
            "geofence_pause_hours": round(geo_pause, 2),
            "is_active": seg.check_out_time is None
        })
    
    # Activities
    lines = db.query(TimesheetLine).filter(TimesheetLine.timesheet_id == ts.id).all()
    act_list = []
    for ln in lines:
        act = db.query(Activity).filter(Activity.id == ln.activity_id).first()
        if act:
            act_list.append({
                "name": act.name,
                "quantity": float(ln.quantity_numeric),
                "unit_type": ln.unit_type
            })
    
    return {
        "date": str(d),
        "found": True,
        "segments": seg_list,
        "activities": act_list,
        "total_worked": round(total_worked, 2),
        "total_break": round(total_break, 2),
        "status": ts.status
    }


@router.get("/timesheets/my-dates")
def my_dates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of dates where employee has timesheets (last 60 days)"""
    from sqlalchemy import func
    cutoff = get_local_today() - timedelta(days=60)
    
    dates = db.query(Timesheet.date).filter(
        Timesheet.owner_user_id == current_user.id,
        Timesheet.date >= cutoff
    ).distinct().order_by(Timesheet.date.desc()).all()
    
    return {"dates": [str(d[0]) for d in dates]}


@router.delete("/timesheets/cleanup-zombies")
def cleanup_zombie_segments(
    target_date: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete zombie segments (< 2min duration) for a given date. Admin only."""
    # Check admin role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or role.code not in ("ADMIN", "SITE_MANAGER"):
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    d = date.fromisoformat(target_date) if target_date else get_local_today()
    
    # Find all timesheets for this date
    timesheets = db.query(Timesheet).filter(Timesheet.date == d).all()
    
    deleted = 0
    for ts in timesheets:
        segments = db.query(TimesheetSegment).filter(
            TimesheetSegment.timesheet_id == ts.id,
            TimesheetSegment.check_out_time != None
        ).all()
        
        for seg in segments:
            duration = (seg.check_out_time - seg.check_in_time).total_seconds()
            if duration < 120:  # Less than 2 minutes
                db.delete(seg)
                deleted += 1
    
    db.commit()
    return {"deleted": deleted, "date": str(d)}


# ─────────────────────────────────────────────────────────────────────────────
# LIVE LOCATION TRACKING
# ─────────────────────────────────────────────────────────────────────────────

class LiveLocationRequest(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = None
    accuracy: Optional[float] = None


@router.post("/worker/location")
def push_worker_location(
    req: LiveLocationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Worker trimite pozitia GPS curenta la fiecare 30s."""
    from sqlalchemy import text as sqlt
    now = get_local_now()

    # Auto-migrate GPS columns if missing (Railway cold start)
    # The ALTER TABLE migrations have been moved to startup/migrations to prevent deadlocks.

    try:
        db.execute(sqlt(
            "UPDATE users SET last_lat=:lat, last_lng=:lng, last_seen_at=:ts, last_speed=:spd WHERE id=:uid"
        ), {"lat": req.latitude, "lng": req.longitude, "ts": now, "spd": req.speed, "uid": current_user.id})
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"push_worker_location error: {e}")
    return {"ok": True}


_flespi_cache = {"ts": 0, "distances": {}}
_flespi_live_telemetry_cache = {"ts": 0, "by_ident": {}}


def get_flespi_live_telemetry(token):
    """
    Lightweight 6-second cached Flespi telemetry snapshot so active moving trucks
    update their position, speed, and compass direction (position.direction) smoothly
    without hammering Flespi or waiting 60s for the background DB cron.
    """
    import time, httpx
    from app.services.flespi_service import update_vehicle_heading, LIVE_VEHICLE_HEADINGS
    global _flespi_live_telemetry_cache
    now_ts = time.time()
    if now_ts - _flespi_live_telemetry_cache["ts"] < 6.0:
        return _flespi_live_telemetry_cache["by_ident"]

    tel_url = "https://flespi.io/gw/devices/all/telemetry/position.latitude,position.longitude,position.speed,position.direction,timestamp,ident"
    headers = {"Authorization": f"FlespiToken {token}", "Accept": "application/json"}
    try:
        resp = httpx.get(tel_url, headers=headers, timeout=4.5)
        if resp.status_code == 200:
            by_ident = {}
            for item in resp.json().get("result", []):
                t_obj = item.get("telemetry", {})
                ident_val = str(t_obj.get("ident", {}).get("value", ""))
                if not ident_val:
                    continue
                t_lat = t_obj.get("position.latitude", {}).get("value")
                t_lon = t_obj.get("position.longitude", {}).get("value")
                t_speed = t_obj.get("position.speed", {}).get("value")
                t_dir = t_obj.get("position.direction", {}).get("value")
                t_ts = (
                    t_obj.get("position.latitude", {}).get("ts")
                    or t_obj.get("timestamp", {}).get("value")
                    or t_obj.get("ident", {}).get("ts")
                )
                heading = update_vehicle_heading(ident_val, t_lat, t_lon, t_dir)
                by_ident[ident_val] = {
                    "lat": t_lat,
                    "lng": t_lon,
                    "speed": t_speed if t_speed is not None else 0.0,
                    "heading": heading if heading is not None else LIVE_VEHICLE_HEADINGS.get(ident_val, 0.0),
                    "ts": t_ts,
                }
            _flespi_live_telemetry_cache = {"ts": now_ts, "by_ident": by_ident}
        else:
            _flespi_live_telemetry_cache["ts"] = now_ts
    except Exception:
        _flespi_live_telemetry_cache["ts"] = now_ts

    return _flespi_live_telemetry_cache.get("by_ident", {})


def get_flespi_distances(token):
    import time, httpx, json, math
    from datetime import datetime, timezone
    from app.services.flespi_service import update_vehicle_heading
    global _flespi_cache
    if time.time() - _flespi_cache["ts"] < 300: # 5 minutes cache to prevent 429 Too Many Requests
        return _flespi_cache["distances"]
    
    day = datetime.utcnow()
    tz_offset = 2
    ts_from = int(datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc).timestamp()) - (tz_offset * 3600)
    ts_to = int(day.timestamp())
    url = "https://flespi.io/gw/devices/all/messages"
    headers = {"Authorization": f"FlespiToken {token}", "Accept": "application/json"}
    params = {"data": json.dumps({"from": ts_from, "to": ts_to, "fields": "ident,position.latitude,position.longitude,position.direction"})}
    
    try:
        resp = httpx.get(url, headers=headers, params=params, timeout=10.0)
        if resp.status_code == 200:
            msgs = resp.json().get("result", [])
            last_pos = {}
            distances = {}
            for m in msgs:
                ident = str(m.get("ident"))
                lat = m.get("position.latitude")
                lng = m.get("position.longitude")
                direction = m.get("position.direction")
                if not lat or not lng: continue
                update_vehicle_heading(ident, lat, lng, direction)
                if ident not in distances:
                    distances[ident] = 0.0
                    last_pos[ident] = (lng, lat)
                else:
                    lon1, lat1 = last_pos[ident]
                    dlon = math.radians(lng - lon1)
                    dlat = math.radians(lat - lat1)
                    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat)) * math.sin(dlon/2)**2
                    d = 6371 * 2 * math.asin(math.sqrt(a))
                    distances[ident] += d
                    last_pos[ident] = (lng, lat)
            _flespi_cache = {"ts": time.time(), "distances": distances}
        else:
            print(f"Flespi API error: {resp.status_code}")
            # Rate limit or API error: update ts to backoff for 60s but keep old distances
            _flespi_cache["ts"] = time.time()
    except Exception as e:
        print("Flespi distance error:", e)
        # Exception (e.g. timeout): update ts to backoff for 60s
        _flespi_cache["ts"] = time.time()
        
    return _flespi_cache.get("distances", {})

@router.get("/admin/vehicles/live")
def get_live_vehicles(
    db: Session = Depends(get_db)
):
    """Admin citeste ultima pozitie GPS a tuturor userilor activi (vazuti in ultimele 10 min)."""
    from sqlalchemy import text as sqlt
    from datetime import timedelta

    # The ALTER TABLE migrations have been moved to startup/migrations to prevent deadlocks.
    # We just fetch data directly now.

    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)  # Show vehicles active in last 24h (UTC, matching Flespi timestamps)
        
        # 1. Fetch Users (App)
        user_rows = []
        try:
            user_rows = db.execute(sqlt("""
                SELECT u.id, u.full_name, u.last_lat, u.last_lng, u.last_seen_at, u.last_speed,
                       t.name AS team_name, t.color AS team_color, u.avatar_path
                FROM saas_app.users u
                LEFT JOIN saas_app.team_members tm ON tm.user_id = u.id AND tm.is_active = true
                LEFT JOIN saas_app.teams t ON t.id = tm.team_id
                WHERE u.last_lat IS NOT NULL
                  AND u.last_seen_at >= :cutoff
                ORDER BY u.last_seen_at DESC
            """), {"cutoff": cutoff}).fetchall()
        except Exception as _ue:
            db.rollback()
            print(f"Users live tracking skipped due to schema mismatch: {_ue}")

        # 2. Fetch Vehicles (Flespi)
        from app.models import TripLog, TripGPSPoint
        from math import radians, cos, sin, asin, sqrt
        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1 
            dlat = lat2 - lat1 
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a)) 
            return 6371 * c

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        vehicle_rows = db.execute(sqlt("""
            SELECT v.id, v.imei, v.name, v.type, v.plate_number, v.last_lat, v.last_lng, v.last_seen_at, v.last_speed,
                   COALESCE(u_direct.avatar_path, u_leader.avatar_path) AS avatar_path,
                   COALESCE(t_direct.color, t_leader.color, recent_team.team_color) AS team_color,
                   COALESCE(t_direct.name, t_leader.name, recent_team.team_name, u_direct.full_name) AS driver_name,
                   COALESCE(t_direct.id, t_leader.id, recent_team.team_id) AS team_id,
                   COALESCE(u_direct.id, u_leader.id, recent_team.team_leader_id) AS assigned_user_id
            FROM saas_app.vehicles v
            LEFT JOIN saas_app.vehicle_user_assignments vua ON vua.vehicle_id = v.id AND vua.is_active = true
            LEFT JOIN saas_app.users u_direct ON u_direct.id = vua.user_id
            LEFT JOIN saas_app.team_members tm ON tm.user_id = vua.user_id AND tm.is_active = true
            LEFT JOIN saas_app.teams t_direct ON t_direct.id = tm.team_id
            LEFT JOIN saas_app.teams t_leader ON t_leader.team_leader_id = vua.user_id
            -- Try to find if vehicle is assigned to a team (via a recent work order) and get leader's avatar and team color
            LEFT JOIN (
                SELECT DISTINCT ON (wo.assigned_vehicle_id)
                       wo.assigned_vehicle_id, t.id as team_id, t.team_leader_id, t.color as team_color, t.name as team_name
                FROM saas_app.work_orders wo
                JOIN saas_app.teams t ON t.id = wo.assigned_team_id
                WHERE wo.created_at >= CURRENT_DATE - INTERVAL '7 days'
                  AND wo.assigned_vehicle_id IS NOT NULL
                ORDER BY wo.assigned_vehicle_id, wo.created_at DESC
            ) recent_team ON recent_team.assigned_vehicle_id = v.id
            LEFT JOIN saas_app.users u_leader ON u_leader.id = recent_team.team_leader_id
            WHERE v.last_lat IS NOT NULL
              AND v.last_seen_at >= :cutoff
            ORDER BY v.last_seen_at DESC
        """), {"cutoff": cutoff}).fetchall()

        result = []
        seen = set()
        for r in user_rows:
            if r.id in seen:
                continue
            seen.add(r.id)
            result.append({
                "type":       "user",
                "id":         r.id,
                "name":       r.full_name,
                "lat":        r.last_lat,
                "lng":        r.last_lng,
                "last_seen":  str(r.last_seen_at).replace(' ', 'T') + 'Z' if r.last_seen_at else None,
                "speed":      r.last_speed,
                "team_name":  r.team_name,
                "team_color": r.team_color or "#64748b",
                "avatar_url": r.avatar_path,
            })
            
        # Use Belgium time (Europe/Brussels) for today's schedule & current hour matching
        try:
            from zoneinfo import ZoneInfo
            be_now = datetime.now(ZoneInfo("Europe/Brussels"))
        except Exception:
            be_now = datetime.utcnow() + timedelta(hours=1)

        today_str = be_now.strftime("%Y-%m-%d")
        now_hm = be_now.strftime("%H:%M")

        # Fetch Bases and Today's Work Orders for Location Matching
        bases = db.execute(sqlt("SELECT name, latitude, longitude FROM saas_app.logistic_bases WHERE latitude IS NOT NULL AND longitude IS NOT NULL")).fetchall()
        wos = db.execute(sqlt("""
            SELECT id, title, client_name, site_address, site_latitude, site_longitude,
                   start_time, status, assigned_team_id, assigned_vehicle_id, volumes
            FROM saas_app.work_orders
            WHERE (CAST(start_date AS TEXT) LIKE :td_prefix OR CAST(deadline_date AS TEXT) LIKE :td_prefix)
              AND status NOT IN ('cancelled', 'pending')
            ORDER BY COALESCE(start_time, '07:00') ASC
        """), {"td_prefix": f"{today_str}%"}).fetchall()
        
        # Calculate Flespi Distances & Live Telemetry (with hardware GPS direction/course)
        flespi_distances = {}
        flespi_live_tel = {}
        import os
        from datetime import timezone
        from app.services.flespi_service import LIVE_VEHICLE_HEADINGS, update_vehicle_heading, compute_bearing_deg
        FLESPI_TOKEN = os.getenv("FLESPI_TOKEN")
        if FLESPI_TOKEN:
            flespi_distances = get_flespi_distances(FLESPI_TOKEN)
            flespi_live_tel = get_flespi_live_telemetry(FLESPI_TOKEN)
            
        def dist_km(lat1, lng1, lat2, lng2):
            if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
                return 999999.0
            try:
                return haversine(float(lng1), float(lat1), float(lng2), float(lat2))
            except Exception:
                return 999999.0

        def is_near(lat1, lng1, lat2, lng2, threshold_km=0.35):
            return dist_km(lat1, lng1, lat2, lng2) < threshold_km

        for v in vehicle_rows:
            imei_key = str(v.imei) if v.imei else ""
            dist = flespi_distances.get(imei_key, 0.0) if imei_key else 0.0
            live_t = flespi_live_tel.get(imei_key, {}) if imei_key else {}

            v_lat = live_t.get("lat") if live_t.get("lat") is not None else v.last_lat
            v_lng = live_t.get("lng") if live_t.get("lng") is not None else v.last_lng
            v_speed = live_t.get("speed") if live_t.get("speed") is not None else v.last_speed
            v_heading = live_t.get("heading")
            if v_heading is None:
                v_heading = update_vehicle_heading(imei_key or str(v.id), v_lat, v_lng)

            v_last_seen_dt = v.last_seen_at
            if live_t.get("ts"):
                try:
                    t_dt = datetime.fromtimestamp(float(live_t["ts"]), tz=timezone.utc).replace(tzinfo=None)
                    if not v_last_seen_dt or t_dt > v_last_seen_dt:
                        v_last_seen_dt = t_dt
                except Exception:
                    pass
            
            loc_text = ""
            at_wo_by_gps = None
            # Check if physically near any of today's work orders (< 600m)
            best_wo_dist = 999999.0
            for w in wos:
                d_w = dist_km(v_lat, v_lng, w.site_latitude, w.site_longitude)
                if d_w < best_wo_dist:
                    best_wo_dist = d_w
                    if d_w < 0.6:
                        at_wo_by_gps = w

            if v_speed is not None and v_speed < 5:
                # Check if at base
                for b in bases:
                    if is_near(v_lat, v_lng, b.latitude, b.longitude, 0.35):
                        loc_text = f"La bază: {b.name}"
                        break
                # Check if at work order
                if not loc_text and at_wo_by_gps is not None:
                    loc_text = f"La lucrare: {at_wo_by_gps.client_name if at_wo_by_gps.client_name and at_wo_by_gps.client_name != 'None' else at_wo_by_gps.title}"

            # Format name: use driver_name/team_name if available, else vehicle name
            display_name = v.driver_name if hasattr(v, 'driver_name') and v.driver_name else (f"{v.name} ({v.plate_number})" if v.plate_number else v.name)
            if display_name and str(display_name).lower().startswith("echipa"):
                display_name = str(display_name)[6:].strip() # remove 'echipa'

            v_team_id = getattr(v, "team_id", None)
            team_today_wos = [
                w for w in wos
                if (v_team_id and str(w.assigned_team_id) == str(v_team_id))
                or (w.assigned_vehicle_id and str(w.assigned_vehicle_id) == str(v.id))
            ]
            current_wo_payload = None
            chosen_wo = None

            # 1. Priority: if GPS shows the truck is physically at one of its team's jobs (or any today's job within 600m)
            if team_today_wos:
                nearest_team_wo = min(
                    team_today_wos,
                    key=lambda w: dist_km(v_lat, v_lng, w.site_latitude, w.site_longitude)
                )
                d_nearest_team = dist_km(v_lat, v_lng, nearest_team_wo.site_latitude, nearest_team_wo.site_longitude)
                if d_nearest_team < 1.2:
                    chosen_wo = nearest_team_wo
                else:
                    # 2. Pick by Belgium time (Europe/Brussels) + proximity tie-breaker
                    active_candidates = [w for w in team_today_wos if w.status != 'completed'] or team_today_wos
                    chosen_wo = active_candidates[0]
                    for cw in active_candidates:
                        st = (cw.start_time or "07:00")[:5]
                        if st <= now_hm:
                            chosen_wo = cw
            elif at_wo_by_gps is not None:
                # E.g. Crane (Grue Ionel / Grue Alexei) physically at a today's work site
                chosen_wo = at_wo_by_gps

            if chosen_wo is not None:
                surf = 0
                try:
                    vols = chosen_wo.volumes if isinstance(chosen_wo.volumes, list) else []
                    surf = sum(float(x.get("quantity") or 0) for x in vols if isinstance(x, dict))
                except Exception:
                    surf = 0
                wo_d_km = dist_km(v_lat, v_lng, chosen_wo.site_latitude, chosen_wo.site_longitude)
                if (not v_heading or v_heading == 0.0) and chosen_wo.site_latitude and chosen_wo.site_longitude and wo_d_km > 0.05:
                    try:
                        v_heading = compute_bearing_deg(v_lat, v_lng, chosen_wo.site_latitude, chosen_wo.site_longitude)
                    except Exception:
                        pass
                current_wo_payload = {
                    "id": str(chosen_wo.id),
                    "client_name": chosen_wo.client_name if chosen_wo.client_name and chosen_wo.client_name != 'None' else chosen_wo.title,
                    "site_address": chosen_wo.site_address or "",
                    "start_time": (chosen_wo.start_time or "07:00")[:5],
                    "surface_m2": round(surf, 1) if surf > 0 else None,
                    "status": chosen_wo.status,
                    "total_today": max(1, len(team_today_wos)),
                    "truck_to_site_km": round(wo_d_km, 1) if wo_d_km < 5000 else None,
                    "is_at_site": wo_d_km < 0.6,
                }
                
            result.append({
                "type":       "vehicle",
                "id":         v.id,
                "name":       display_name,
                "plate_number": v.plate_number if getattr(v, "plate_number", None) and v.plate_number != "NN" else None,
                "vehicle_type": getattr(v, 'type', "Camion"),
                "lat":        v_lat,
                "lng":        v_lng,
                "heading":    round(float(v_heading or 0.0), 1),
                "last_seen":  str(v_last_seen_dt).replace(' ', 'T') + 'Z' if v_last_seen_dt else None,
                "speed":      v_speed,
                "team_id":    str(v_team_id) if v_team_id else None,
                "team_name":  "GPS Flespi",
                "team_color": v.team_color or "#0ea5e9",
                "avatar_url": v.avatar_path,
                "distance_today": round(dist, 1),
                "location_text": loc_text,
                "assigned_user_id": getattr(v, "assigned_user_id", None),
                "current_work_order": current_wo_payload,
            })

        return result
    except Exception as e:
        print(f"live_vehicles error: {e}")
        return []
