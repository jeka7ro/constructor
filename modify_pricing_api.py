import re

file_path = "backend/app/api/admin_pricing.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add to PricingSettingSchema
schema_target = """    truck_surface_threshold_free_sqm: float = 500.0"""
schema_replacement = """    truck_surface_threshold_free_sqm: float = 500.0
    
    # PUR
    pur_base_price_3cm: float = 13.95
    pur_step_price_up_to_10cm: float = 1.65
    pur_extra_price_above_10cm: float = 2.10
    pur_minimum_execution_price: float = 1375.00
    pur_surface_discount_step: float = -0.50
    pur_opt_aspiration: float = 2.00
    pur_opt_niveller: float = 4.25
    pur_opt_poncage: float = 1.50
    pur_opt_protection: float = 1.50
    
    # EPS
    eps_volume_thresholds: list = [
        {"max_m3": 10.0, "price_flat": 1495.0, "price_per_m3": None},
        {"max_m3": 20.0, "price_flat": None, "price_per_m3": 160.0},
        {"max_m3": 40.0, "price_flat": None, "price_per_m3": 155.0},
        {"max_m3": 99999.0, "price_flat": None, "price_per_m3": 150.0}
    ]"""
content = content.replace(schema_target, schema_replacement)

# Add to get_pricing_settings return dict
return_target = """        "truck_extra_price_flat": setting.truck_extra_price_flat if setting.truck_extra_price_flat is not None else 0.0,
        "truck_surface_threshold_free_sqm": setting.truck_surface_threshold_free_sqm if setting.truck_surface_threshold_free_sqm is not None else 500.0
    }"""
return_replacement = """        "truck_extra_price_flat": setting.truck_extra_price_flat if setting.truck_extra_price_flat is not None else 0.0,
        "truck_surface_threshold_free_sqm": setting.truck_surface_threshold_free_sqm if setting.truck_surface_threshold_free_sqm is not None else 500.0,
        
        # PUR
        "pur_base_price_3cm": getattr(setting, "pur_base_price_3cm", 13.95),
        "pur_step_price_up_to_10cm": getattr(setting, "pur_step_price_up_to_10cm", 1.65),
        "pur_extra_price_above_10cm": getattr(setting, "pur_extra_price_above_10cm", 2.10),
        "pur_minimum_execution_price": getattr(setting, "pur_minimum_execution_price", 1375.00),
        "pur_surface_discount_step": getattr(setting, "pur_surface_discount_step", -0.50),
        "pur_opt_aspiration": getattr(setting, "pur_opt_aspiration", 2.00),
        "pur_opt_niveller": getattr(setting, "pur_opt_niveller", 4.25),
        "pur_opt_poncage": getattr(setting, "pur_opt_poncage", 1.50),
        "pur_opt_protection": getattr(setting, "pur_opt_protection", 1.50),
        
        # EPS
        "eps_volume_thresholds": getattr(setting, "eps_volume_thresholds", [
            {"max_m3": 10.0, "price_flat": 1495.0, "price_per_m3": None},
            {"max_m3": 20.0, "price_flat": None, "price_per_m3": 160.0},
            {"max_m3": 40.0, "price_flat": None, "price_per_m3": 155.0},
            {"max_m3": 99999.0, "price_flat": None, "price_per_m3": 150.0}
        ])
    }"""
content = content.replace(return_target, return_replacement)

# Add to update_pricing_settings saving logic
update_target = """    setting.truck_distance_threshold_km = payload.truck_distance_threshold_km
    setting.truck_extra_price_flat = payload.truck_extra_price_flat
    setting.truck_surface_threshold_free_sqm = payload.truck_surface_threshold_free_sqm"""
update_replacement = """    setting.truck_distance_threshold_km = payload.truck_distance_threshold_km
    setting.truck_extra_price_flat = payload.truck_extra_price_flat
    setting.truck_surface_threshold_free_sqm = payload.truck_surface_threshold_free_sqm
    
    # PUR
    setting.pur_base_price_3cm = payload.pur_base_price_3cm
    setting.pur_step_price_up_to_10cm = payload.pur_step_price_up_to_10cm
    setting.pur_extra_price_above_10cm = payload.pur_extra_price_above_10cm
    setting.pur_minimum_execution_price = payload.pur_minimum_execution_price
    setting.pur_surface_discount_step = payload.pur_surface_discount_step
    setting.pur_opt_aspiration = payload.pur_opt_aspiration
    setting.pur_opt_niveller = payload.pur_opt_niveller
    setting.pur_opt_poncage = payload.pur_opt_poncage
    setting.pur_opt_protection = payload.pur_opt_protection
    
    # EPS
    setting.eps_volume_thresholds = payload.eps_volume_thresholds"""
content = content.replace(update_target, update_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
