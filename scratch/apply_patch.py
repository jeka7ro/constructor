import re

with open("backend/app/services/pdf_generator.py", "r") as f:
    content = f.read()

# I will write the helper function at the top of the file, after imports
helper = """
def _compute_pdf_data(work_order, client, is_invoice=False):
    from app.database import SessionLocal
    from app.models import PricingSetting
    db = SessionLocal()
    pricing_settings = db.query(PricingSetting).first()
    db.close()
    
    def safe_str(val):
        return str(val) if val is not None else ""
        
    doc_number = safe_str(work_order.invoice_number if is_invoice else work_order.quote_number)
    if not doc_number:
        doc_number = f"INV-{work_order.id[:6]}" if is_invoice else f"DEV-{work_order.id[:6]}"
        
    date_val = work_order.invoiced_at if is_invoice else work_order.created_at
    from datetime import datetime
    issue_date = date_val.strftime('%Y-%m-%d') if date_val else datetime.now().strftime('%Y-%m-%d')
    
    client_name = safe_str(client.name if client else work_order.client_name)
    client_cui = safe_str(client.cui if client else "")
    client_address = safe_str(client.address if client else work_order.site_address)
    
    prices = work_order.prices or {}
    proforma = work_order.proforma_data or {}
    items = proforma.get("items", [])
    
    if not items:
        volumes = work_order.volumes or []
        for vol in volumes:
            qty = float(vol.get('quantity', 0) or 0)
            price = float(vol.get('price', 0) or 0)
            desc = vol.get('label', vol.get('type', 'Serviciu'))
            items.append({"desc": desc, "qty": qty, "price": price})
            
    has_transport = any("transport" in str(item.get("id", "")).lower() or "transport" in str(item.get("desc", "")).lower() for item in items)
    if not has_transport:
        truck_cost = float(prices.get("truck_cost") or 0)
        dist_km = float(prices.get("distance_km") or 0)
        if truck_cost <= 0 and pricing_settings and dist_km > 0:
            truck_flat = float(pricing_settings.truck_extra_price_flat or 0)
            dist_threshold = float(pricing_settings.truck_distance_threshold_km or 50)
            surf_threshold = float(pricing_settings.truck_surface_threshold_free_sqm or 500)
            
            total_surface = 0
            for v in (work_order.volumes or []):
                lbl = str(v.get('label', '')).lower()
                if 'chape' in lbl or 'sapa' in lbl or 'apă' in lbl:
                    total_surface += float(v.get('quantity') or 0)
            if total_surface == 0 and work_order.surface_m2:
                total_surface = float(work_order.surface_m2)
                
            if truck_flat > 0 and dist_km > dist_threshold and total_surface <= surf_threshold:
                truck_cost = truck_flat
                
        if truck_cost > 0:
            desc = f"Transport ({dist_km} km)" if dist_km > 0 else "Transport"
            items.append({"id": "transport_auto", "desc": desc, "qty": 1, "price": truck_cost})

    table_rows = ""
    total_net = 0.0
    for item in items:
        qty = float(item.get('qty', 1))
        price = float(item.get('price', 0))
        row_total = qty * price
        total_net += row_total
        
        desc = item.get('desc', '')
        desc_lower = desc.lower()
        if 'șapă' in desc_lower or 'sapa' in desc_lower:
            desc = "Chape"
        elif 'manoper' in desc_lower:
            desc = "Main-d'œuvre"
            
        table_rows += f\"\"\"
        <tr>
            <td>{desc}</td>
            <td style="text-align: right;">{qty}</td>
            <td style="text-align: right;">€{price:.2f}</td>
            <td style="text-align: right;">€{row_total:.2f}</td>
        </tr>
        \"\"\"

    discount_amount = float(proforma.get("discountAmount", 0))
    if discount_amount == 0 and float(prices.get("discount_pct", 0)) > 0:
        chape_total = 0
        for item in items:
            d = str(item.get('desc', '')).lower()
            if not ('pur' in d or 'eps' in d or 'aspiration' in d or 'nivellement' in d or 'ponçage' in d or 'protection' in d or 'transport' in d):
                chape_total += float(item.get('qty', 1)) * float(item.get('price', 0))
        discount_amount = chape_total * (float(prices.get("discount_pct", 0)) / 100)

    if discount_amount > 0:
        table_rows += f\"\"\"
        <tr>
            <td>Remise Chape</td>
            <td style="text-align: right;"></td>
            <td style="text-align: right;"></td>
            <td style="text-align: right; color: red;">-€{discount_amount:.2f}</td>
        </tr>
        \"\"\"
        total_net -= discount_amount

    vat_percent = 21.0
    if 'vat_type' in prices:
        try:
            vat_percent = float(prices['vat_type'] or 21)
        except:
            pass
            
    total_vat = total_net * (vat_percent / 100)
    total_gross = total_net + total_vat

    return {
        "doc_number": doc_number,
        "issue_date": issue_date,
        "client_name": client_name,
        "client_address": client_address,
        "client_cui": client_cui,
        "table_rows": table_rows,
        "total_net": total_net,
        "total_vat": total_vat,
        "vat_percent": vat_percent,
        "total_gross": total_gross
    }
"""

if "_compute_pdf_data" not in content:
    content = content.replace("import os", "import os\n" + helper, 1)

# Now, we need to replace the repetitive blocks in get_html_template
invoice_target = re.search(r'    def safe_str.*?total_gross = total_net \+ total_vat', content, re.DOTALL)
if invoice_target:
    content = content.replace(invoice_target.group(0), """    data = _compute_pdf_data(work_order, client, is_invoice=True)
    invoice_number = data['doc_number']
    issue_date = data['issue_date']
    client_name = data['client_name']
    client_cui = data['client_cui']
    client_address = data['client_address']
    table_rows = data['table_rows']
    total_net = data['total_net']
    total_vat = data['total_vat']
    vat_percent = data['vat_percent']
    total_gross = data['total_gross']""")

quote_target = re.search(r'    def safe_str.*?total_gross = total_net \+ total_vat', content, re.DOTALL)
if quote_target:
    content = content.replace(quote_target.group(0), """    data = _compute_pdf_data(work_order, client, is_invoice=False)
    quote_number = data['doc_number']
    issue_date = data['issue_date']
    client_name = data['client_name']
    client_cui = data['client_cui']
    client_address = data['client_address']
    table_rows = data['table_rows']
    total_net = data['total_net']
    total_vat = data['total_vat']
    vat_percent = data['vat_percent']
    total_gross = data['total_gross']""")

with open("backend/app/services/pdf_generator.py", "w") as f:
    f.write(content)

