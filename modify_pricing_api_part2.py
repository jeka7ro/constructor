import re

file_path = "backend/app/api/admin_pricing.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add to PricingSettingSchema
schema_target = """    # PUR"""
schema_replacement = """    is_foil_mandatory: bool = False
    is_mesh_mandatory: bool = False
    is_fiber_mandatory: bool = False
    is_pur_aspiration_mandatory: bool = False
    is_pur_niveller_mandatory: bool = False
    is_pur_poncage_mandatory: bool = False
    is_pur_protection_mandatory: bool = False
    
    pur_truck_distance_threshold_km: float = 50.0
    pur_truck_extra_price_flat: float = 0.0
    pur_truck_surface_threshold_free_sqm: float = 500.0
    
    eps_truck_distance_threshold_km: float = 50.0
    eps_truck_extra_price_flat: float = 0.0
    eps_truck_volume_threshold_free_m3: float = 40.0
    
    # PUR"""
content = content.replace(schema_target, schema_replacement)

# Add to get_pricing_settings return dict
return_target = """        # PUR"""
return_replacement = """        "is_foil_mandatory": getattr(setting, "is_foil_mandatory", False),
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
content = content.replace(return_target, return_replacement)

# Add to update_pricing_settings saving logic
update_target = """    # PUR"""
update_replacement = """    setting.is_foil_mandatory = payload.is_foil_mandatory
    setting.is_mesh_mandatory = payload.is_mesh_mandatory
    setting.is_fiber_mandatory = payload.is_fiber_mandatory
    setting.is_pur_aspiration_mandatory = payload.is_pur_aspiration_mandatory
    setting.is_pur_niveller_mandatory = payload.is_pur_niveller_mandatory
    setting.is_pur_poncage_mandatory = payload.is_pur_poncage_mandatory
    setting.is_pur_protection_mandatory = payload.is_pur_protection_mandatory
    
    setting.pur_truck_distance_threshold_km = payload.pur_truck_distance_threshold_km
    setting.pur_truck_extra_price_flat = payload.pur_truck_extra_price_flat
    setting.pur_truck_surface_threshold_free_sqm = payload.pur_truck_surface_threshold_free_sqm
    
    setting.eps_truck_distance_threshold_km = payload.eps_truck_distance_threshold_km
    setting.eps_truck_extra_price_flat = payload.eps_truck_extra_price_flat
    setting.eps_truck_volume_threshold_free_m3 = payload.eps_truck_volume_threshold_free_m3
    
    # PUR"""
content = content.replace(update_target, update_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated admin_pricing.py")
