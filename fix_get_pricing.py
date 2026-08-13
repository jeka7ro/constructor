import re

file_path = "backend/app/api/admin_pricing.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """        # PUR"""
replacement = """        "is_foil_mandatory": getattr(setting, "is_foil_mandatory", False),
        "is_mesh_mandatory": getattr(setting, "is_mesh_mandatory", False),
        "is_fiber_mandatory": getattr(setting, "is_fiber_mandatory", False),
        "is_pur_aspiration_mandatory": getattr(setting, "is_pur_aspiration_mandatory", False),
        "is_pur_niveller_mandatory": getattr(setting, "is_pur_niveller_mandatory", False),
        "is_pur_poncage_mandatory": getattr(setting, "is_pur_poncage_mandatory", False),
        "is_pur_protection_mandatory": getattr(setting, "is_pur_protection_mandatory", False),
        
        "pur_truck_distance_threshold_km": getattr(setting, "pur_truck_distance_threshold_km", 50.0),
        "pur_truck_extra_price_flat": getattr(setting, "pur_truck_extra_price_flat", 0.0),
        "pur_truck_surface_threshold_free_sqm": getattr(setting, "pur_truck_surface_threshold_free_sqm", 500.0),
        
        "eps_truck_distance_threshold_km": getattr(setting, "eps_truck_distance_threshold_km", 50.0),
        "eps_truck_extra_price_flat": getattr(setting, "eps_truck_extra_price_flat", 0.0),
        "eps_truck_volume_threshold_free_m3": getattr(setting, "eps_truck_volume_threshold_free_m3", 40.0),
        
        # PUR"""
content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed get_pricing_settings")
