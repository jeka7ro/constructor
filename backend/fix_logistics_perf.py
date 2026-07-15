import re

with open("backend/app/api/admin_logistics.py", "r") as f:
    content = f.read()

# Add bulk queries before `for team in teams:` loop
bulk_queries = """
    # --- PERF OPTIMIZATION: Bulk load data ---
    all_vehicle_ids = set()
    for w in wos:
        if w.assigned_vehicle_id:
            all_vehicle_ids.add(w.assigned_vehicle_id)
    for t in teams:
        if t.assigned_vehicle_id:
            all_vehicle_ids.add(t.assigned_vehicle_id)
    
    vehicles_dict = {}
    if all_vehicle_ids:
        from app.models import Vehicle
        v_list = db.query(Vehicle).filter(Vehicle.id.in_(list(all_vehicle_ids))).all()
        vehicles_dict = {v.id: v for v in v_list}
        
    team_leader_ids = [t.team_leader_id for t in teams if t.team_leader_id]
    leader_assignments_dict = {}
    if team_leader_ids:
        from app.models import VehicleUserAssignment
        assignments = db.query(VehicleUserAssignment).filter(
            VehicleUserAssignment.user_id.in_(team_leader_ids),
            VehicleUserAssignment.is_active == True
        ).all()
        leader_assignments_dict = {a.user_id: a for a in assignments}
        
        # Load those vehicles too
        extra_v_ids = [a.vehicle_id for a in assignments if a.vehicle_id not in vehicles_dict]
        if extra_v_ids:
            extra_v_list = db.query(Vehicle).filter(Vehicle.id.in_(extra_v_ids)).all()
            for v in extra_v_list:
                vehicles_dict[v.id] = v

    # Pre-load Flespi GPS Traces
    all_team_v_ids = set()
    for t in teams:
        vid = None
        for w in team_wos.get(t.id, []):
            if w.assigned_vehicle_id and w.assigned_vehicle_id in vehicles_dict:
                vid = w.assigned_vehicle_id
                break
        if not vid and t.assigned_vehicle_id and t.assigned_vehicle_id in vehicles_dict:
            vid = t.assigned_vehicle_id
        if not vid and t.team_leader_id in leader_assignments_dict:
            vid = leader_assignments_dict[t.team_leader_id].vehicle_id
        if vid:
            all_team_v_ids.add(vid)
            
    gps_traces_by_vid = {}
    if all_team_v_ids:
        from app.models import TripLog, TripGPSPoint
        trips = db.query(TripLog).filter(
            TripLog.vehicle_id.in_(list(all_team_v_ids)),
            TripLog.date == target_date
        ).order_by(TripLog.start_time).all()
        
        trip_ids = [t.id for t in trips]
        if trip_ids:
            pts = db.query(TripGPSPoint).filter(
                TripGPSPoint.trip_id.in_(trip_ids)
            ).order_by(TripGPSPoint.timestamp).all()
            
            pts_by_trip = {}
            for p in pts:
                pts_by_trip.setdefault(p.trip_id, []).append(p)
                
            for t in trips:
                v_trace = gps_traces_by_vid.setdefault(t.vehicle_id, [])
                for p in pts_by_trip.get(t.id, []):
                    v_trace.append({
                        "lat": p.latitude,
                        "lng": p.longitude,
                        "ts": p.timestamp.isoformat() if p.timestamp else None,
                        "speed": round(p.speed_kmh or 0, 1)
                    })
    # --- END PERF OPTIMIZATION ---

    for team in teams:
"""

content = content.replace("    for team in teams:", bulk_queries, 1)

# Now replace the inner loop lookups with dictionary lookups
old_v_lookup1 = """        for w in works:
            if w.assigned_vehicle_id:
                v = db.query(Vehicle).filter(Vehicle.id == w.assigned_vehicle_id).first()
                if v:
"""
new_v_lookup1 = """        for w in works:
            if w.assigned_vehicle_id:
                v = vehicles_dict.get(w.assigned_vehicle_id)
                if v:
"""
content = content.replace(old_v_lookup1, new_v_lookup1)

old_v_lookup2 = """        # Fallback to team's default vehicle
        if not team_vehicle_id and team.assigned_vehicle_id:
            v = db.query(Vehicle).filter(Vehicle.id == team.assigned_vehicle_id).first()
            if v:"""
new_v_lookup2 = """        # Fallback to team's default vehicle
        if not team_vehicle_id and team.assigned_vehicle_id:
            v = vehicles_dict.get(team.assigned_vehicle_id)
            if v:"""
content = content.replace(old_v_lookup2, new_v_lookup2)

old_v_lookup3 = """        # Fallback: if no vehicle assigned directly to WOs, check if team leader has an active vehicle assignment
        if not team_vehicle_id and team.team_leader_id:
            from app.models import VehicleUserAssignment
            leader_assignment = db.query(VehicleUserAssignment).filter(
                VehicleUserAssignment.user_id == team.team_leader_id,
                VehicleUserAssignment.is_active == True
            ).first()
            if leader_assignment:
                v = db.query(Vehicle).filter(Vehicle.id == leader_assignment.vehicle_id).first()"""
new_v_lookup3 = """        # Fallback: if no vehicle assigned directly to WOs, check if team leader has an active vehicle assignment
        if not team_vehicle_id and team.team_leader_id:
            leader_assignment = leader_assignments_dict.get(team.team_leader_id)
            if leader_assignment:
                v = vehicles_dict.get(leader_assignment.vehicle_id)"""
content = content.replace(old_v_lookup3, new_v_lookup3)

old_gps = """        # ── GPS Trace réel (Flespi via TripLog) ─────────────────────────────
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
                ]"""
new_gps = """        # ── GPS Trace réel (Flespi via TripLog) ─────────────────────────────
        gps_trace = []
        if team_vehicle_id:
            gps_trace = gps_traces_by_vid.get(team_vehicle_id, [])"""
content = content.replace(old_gps, new_gps)

with open("backend/app/api/admin_logistics.py", "w") as f:
    f.write(content)

print("Applied PERF optimizations to admin_logistics.py")

