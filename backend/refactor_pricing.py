import re
import sys

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    pattern = re.compile(
        r'(\s*# 3\. Calculate estimated price\s*\n\s*pricing = db\.query\(PricingSetting\).*?first\(\)\s*\n\s*estimated_price = 0\s*\n\s*if pricing and payload\.surface > 0:\s*\n)(.*?)(estimated_price = .*?\n)',
        re.DOTALL
    )

    new_block = """        # Truck transportation distance cost
        distance_km = 0.0
        if payload.site_address:
            from app.models import LogisticBase
            bases = db.query(LogisticBase).filter(LogisticBase.organization_id == org.id).all()
            if bases:
                min_dist = 999999.0
                for base_record in bases:
                    if base_record.address:
                        dist = get_driving_distance_km(base_record.address, payload.site_address)
                        if 0 < dist < min_dist:
                            min_dist = dist
                if min_dist < 999999.0:
                    distance_km = min_dist

        payload_dict = payload.dict()
        payload_dict['distance_km'] = distance_km

        from app.services.pricing_engine import calculate_quote_price
        calc_result = calculate_quote_price(payload_dict, pricing)
        
        base = calc_result["base"]
        extra_cost = calc_result["extra"]
        foil_cost = calc_result["foil"]
        mesh_cost = calc_result["mesh"]
        fiber_cost = calc_result["fiber"]
        hidden_extra = calc_result["threshold"]
        truck_cost = calc_result["truck_cost"]
        isolation_cost = calc_result["isolation_cost"]
        estimated_price = calc_result["total_net"]
"""
    
    if not pattern.search(content):
        print(f"Pattern not found in {filepath}")
        return

    new_content = pattern.sub(r'\1' + new_block, content)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Updated {filepath}")

process_file('app/api/devis_online.py')
process_file('app/api/public_calculator.py')
