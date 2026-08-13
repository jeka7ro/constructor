import re

file_path = "backend/app/models.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add to PricingSetting model
target = """    # ── Truck Distance Configuration ────────────────────────────────────────"""
replacement = """    # ── Options Mandatory Flags ─────────────────────────────────────────────
    is_foil_mandatory = Column(Boolean, default=False)
    is_mesh_mandatory = Column(Boolean, default=False)
    is_fiber_mandatory = Column(Boolean, default=False)
    is_pur_aspiration_mandatory = Column(Boolean, default=False)
    is_pur_niveller_mandatory = Column(Boolean, default=False)
    is_pur_poncage_mandatory = Column(Boolean, default=False)
    is_pur_protection_mandatory = Column(Boolean, default=False)
    
    # ── Truck Distance Configuration ────────────────────────────────────────"""
content = content.replace(target, replacement)

target2 = """    # ── PUR Configuration ───────────────────────────────────────────────────"""
replacement2 = """    pur_truck_distance_threshold_km = Column(Float, default=50.0)
    pur_truck_extra_price_flat = Column(Float, default=0.0)
    pur_truck_surface_threshold_free_sqm = Column(Float, default=500.0)
    
    # ── PUR Configuration ───────────────────────────────────────────────────"""
content = content.replace(target2, replacement2)

target3 = """    # ── EPS Configuration ───────────────────────────────────────────────────"""
replacement3 = """    eps_truck_distance_threshold_km = Column(Float, default=50.0)
    eps_truck_extra_price_flat = Column(Float, default=0.0)
    eps_truck_volume_threshold_free_m3 = Column(Float, default=40.0)
    
    # ── EPS Configuration ───────────────────────────────────────────────────"""
content = content.replace(target3, replacement3)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated models.py")
