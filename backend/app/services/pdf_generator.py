import os
import uuid
from datetime import datetime
from playwright.sync_api import sync_playwright
import logging

logger = logging.getLogger(__name__)

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
    items = proforma.get("items") or []
    
    if not items:
        volumes = work_order.volumes or []
        for vol in volumes:
            surface = float(vol.get('quantity', 0) or 0)
            thick = float(vol.get('thickness', 0) or 0)
            lbl = str(vol.get('label', '')).lower()
            
            if surface > 0:
                if 'chape' in lbl or 'sapa' in lbl or 'apă' in lbl:
                    std_thick = float(prices.get('standard_thickness', 5))
                    extra_thick = max(0, thick - std_thick)
                    
                    items.append({"desc": f"Pose de chape {min(thick, std_thick)} cm", "qty": surface, "price": float(prices.get('base', 12.5))})
                    if extra_thick > 0:
                        # Match computeChapeTotal: use extra_large when surface > extra_threshold
                        extra_rate = float(prices.get('extra', prices.get('extra_thickness_price_per_cm', 1.25)))
                        if prices.get('extra_large') is not None and prices.get('extra_threshold') is not None:
                            extra_rate = float(prices['extra_large']) if surface > float(prices['extra_threshold']) else float(prices.get('extra', 1.25))
                        items.append({"desc": f"Épaisseur supplémentaire ({extra_thick} cm)", "qty": surface, "price": extra_thick * extra_rate})
                    if vol.get('has_foil'):
                        items.append({"desc": "Feuille de plastique (Visqueen)", "qty": surface, "price": float(prices.get('foil', 1.2))})
                    if vol.get('has_mesh'):
                        items.append({"desc": "Armature (Paillasse)", "qty": surface, "price": float(prices.get('mesh', 2.5))})
                    if vol.get('has_fiber') or vol.get('has_duramint'):
                        items.append({"desc": "Fibre + Duramint", "qty": surface, "price": float(prices.get('fiber', 2.5 if surface <= 200 else 2.0))})
                        
                elif 'isolation' in lbl and 'pur' in lbl:
                    pur_thick = thick or 3
                    pur_base = float(prices.get('pur_base_price_3cm', 13.95))
                    if 3 < pur_thick <= 10:
                        pur_base += (pur_thick - 3) * float(prices.get('pur_step_price_up_to_10cm', 1.65))
                    elif pur_thick > 10:
                        pur_base += 7 * float(prices.get('pur_step_price_up_to_10cm', 1.65))
                        pur_base += (pur_thick - 10) * float(prices.get('pur_extra_price_above_10cm', 2.10))
                        
                    if surface > 100:
                        import math
                        pur_base += math.floor((surface - 100) / 100) * float(prices.get('pur_surface_discount_step', -0.50))
                    pur_base = max(0, pur_base)
                    
                    items.append({"desc": f"Isolation PUR {pur_thick} cm", "qty": surface, "price": pur_base})
                    if vol.get('pur_aspiration'):
                        items.append({"desc": "Aspiration", "qty": surface, "price": float(prices.get('pur_opt_aspiration', 2.00))})
                    if vol.get('pur_niveller'):
                        items.append({"desc": "Nivellement", "qty": surface, "price": float(prices.get('pur_opt_niveller', 4.25))})
                    if vol.get('pur_poncage'):
                        items.append({"desc": "Ponçage", "qty": surface, "price": float(prices.get('pur_opt_poncage', 1.50))})
                    if vol.get('pur_protection'):
                        items.append({"desc": "Protection", "qty": surface, "price": float(prices.get('pur_opt_protection', 1.50))})
                        
                    pur_discount_pct = float(prices.get('pur_discount_pct', 0))
                    if pur_discount_pct > 0:
                        total_pur = pur_base * surface
                        if vol.get('pur_aspiration'): total_pur += float(prices.get('pur_opt_aspiration', 2.00)) * surface
                        if vol.get('pur_niveller'): total_pur += float(prices.get('pur_opt_niveller', 4.25)) * surface
                        if vol.get('pur_poncage'): total_pur += float(prices.get('pur_opt_poncage', 1.50)) * surface
                        if vol.get('pur_protection'): total_pur += float(prices.get('pur_opt_protection', 1.50)) * surface
                        
                        items.append({"desc": f"Remise PUR ({pur_discount_pct}%)", "qty": 1, "price": -(total_pur * pur_discount_pct / 100)})
                        
                elif 'isolation' in lbl and 'eps' in lbl:
                    eps_vol = float(vol.get('volume_m3') or (surface * thick / 100))
                    eps_price = 0
                    if prices.get('custom_eps_price_flat') not in (None, ""):
                        eps_price = float(prices['custom_eps_price_flat'])
                    elif prices.get('custom_eps_price_per_m3') not in (None, ""):
                        eps_price = eps_vol * float(prices['custom_eps_price_per_m3'])
                    else:
                        tiers = prices.get('eps_volume_thresholds', [])
                        if not tiers:
                            tiers = [{'max_m3': 10, 'price_flat': 1495}, {'max_m3': 20, 'price_per_m3': 160},
                                     {'max_m3': 40, 'price_per_m3': 155}, {'max_m3': 99999, 'price_per_m3': 150}]
                        for t in tiers:
                            if eps_vol <= float(t.get('max_m3', 99999)):
                                if t.get('price_flat'):
                                    eps_price = float(t['price_flat'])
                                else:
                                    eps_price = eps_vol * float(t.get('price_per_m3', 150))
                                break
                    items.append({"desc": f"Isolation EPS ({eps_vol:.2f} m3)", "qty": 1, "price": eps_price})
                    
                    eps_discount_pct = float(prices.get('eps_discount_pct', 0))
                    if eps_discount_pct > 0:
                        items.append({"desc": f"Remise EPS ({eps_discount_pct}%)", "qty": 1, "price": -(eps_price * eps_discount_pct / 100)})
                else:
                    items.append({"desc": lbl or "Volume", "qty": surface, "price": float(work_order.estimated_price or 0) / (surface or 1)})

    has_transport = any("transport" in str(item.get("id", "")).lower() or "transport" in str(item.get("desc", "")).lower() for item in items)
    if not has_transport:
        truck_cost = float(prices.get("truck_cost") or 0)
        dist_km = float(work_order.route_distance_km or 0)
        if dist_km <= 0:
            dist_km = float(prices.get("distance_km") or 0) * 2
        
        if truck_cost <= 0 and pricing_settings and dist_km > 0:
            truck_flat = float(pricing_settings.truck_extra_price_flat or 0)
            dist_threshold = float(pricing_settings.truck_distance_threshold_km or 50)
            surf_threshold = float(pricing_settings.truck_surface_threshold_free_sqm or 500)
            
            total_surface = 0
            for v in (work_order.volumes or []):
                lbl = str(v.get('label', '')).lower()
                if 'chape' in lbl or 'sapa' in lbl or 'apă' in lbl:
                    total_surface += float(v.get('quantity') or 0)
                    
            one_way = dist_km if dist_km > 500 else dist_km / 2
            if truck_flat > 0 and one_way > dist_threshold and total_surface <= surf_threshold:
                truck_cost = truck_flat
                
        if truck_cost > 0:
            desc = "Transport"
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
            
        table_rows += f"""
        <tr>
            <td>{desc}</td>
            <td style="text-align: right;">{qty}</td>
            <td style="text-align: right;">€{price:.2f}</td>
            <td style="text-align: right;">€{row_total:.2f}</td>
        </tr>
        """

    discount_amount = float(proforma.get("discountAmount", 0))
    if discount_amount == 0 and float(prices.get("discount_pct", 0)) > 0:
        # Match computeChapeTotal / DevisView isChapeItem:
        # Include base, extra, foil, mesh, fiber, threshold, transport
        # Exclude PUR, EPS, aspiration, nivellement, ponçage, protection
        chape_total = 0
        for item in items:
            d = str(item.get('desc', '')).lower()
            if not ('pur' in d or 'eps' in d or 'aspiration' in d or 'nivellement' in d or 'ponçage' in d or 'protection' in d or 'isolation' in d):
                chape_total += float(item.get('qty', 1)) * float(item.get('price', 0))
        discount_amount = chape_total * (float(prices.get("discount_pct", 0)) / 100) + float(prices.get("discount", 0))

    if discount_amount > 0:
        table_rows += f"""
        <tr>
            <td>Remise Chape</td>
            <td style="text-align: right;"></td>
            <td style="text-align: right;"></td>
            <td style="text-align: right; color: red;">-€{discount_amount:.2f}</td>
        </tr>
        """
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


def get_html_template(work_order, client=None):
    """Generates the HTML template for the PDF invoice/quote"""
    
    data = _compute_pdf_data(work_order, client, is_invoice=True)
    invoice_number = data['doc_number']
    issue_date = data['issue_date']
    client_name = data['client_name']
    client_cui = data['client_cui']
    client_address = data['client_address']
    table_rows = data['table_rows']
    total_net = data['total_net']
    total_vat = data['total_vat']
    vat_percent = data['vat_percent']
    total_gross = data['total_gross']

    html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 40px;
                color: #333;
                font-size: 14px;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #0056b3;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .company-details {{
                font-size: 14px;
                color: #555;
            }}
            .company-name {{
                font-size: 24px;
                font-weight: bold;
                color: #0056b3;
                margin-bottom: 5px;
            }}
            .client-section {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }}
            .client-details {{
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                width: 45%;
            }}
            .invoice-meta {{
                width: 45%;
                text-align: right;
            }}
            .invoice-title {{
                font-size: 28px;
                color: #333;
                font-weight: bold;
                margin-bottom: 10px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }}
            th {{
                background-color: #0056b3;
                color: white;
                padding: 12px;
                text-align: left;
            }}
            th.right {{ text-align: right; }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #ddd;
            }}
            .totals-section {{
                width: 100%;
                display: flex;
                justify-content: flex-end;
            }}
            .totals-table {{
                width: 300px;
                border-collapse: collapse;
            }}
            .totals-table td {{
                padding: 8px 12px;
                border-bottom: none;
            }}
            .totals-table tr.bold td {{
                font-weight: bold;
                font-size: 16px;
                border-top: 2px solid #0056b3;
            }}
            .footer {{
                margin-top: 50px;
                font-size: 12px;
                color: #777;
                text-align: center;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 80px; margin-bottom: 10px;" />
                <div class="company-details">
                    Chappelles lez Herlemont<br>
                    Rue de Clair Fontaine 162<br>
                    BE0755686913<br>
                    Belgique
                </div>
            </div>
        </div>

        <div class="client-section">
            <div class="client-details">
                <strong>Facturé à:</strong><br><br>
                <strong>{client_name}</strong><br>
                {client_address}<br>
                {f"CUI / TVA: {client_cui}" if client_cui else ""}
            </div>
            <div class="invoice-meta">
                <div class="invoice-title">FACTURE</div>
                <strong>N° de facture:</strong> {invoice_number}<br>
                <strong>Date d'émission:</strong> {issue_date}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="right">Quantité</th>
                    <th class="right">Prix Unitaire</th>
                    <th class="right">Total</th>
                </tr>
            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Sous-total (Net):</td>
                    <td style="text-align: right;">€{total_net:.2f}</td>
                </tr>
                <tr>
                    <td>TVA ({vat_percent}%):</td>
                    <td style="text-align: right;">€{total_vat:.2f}</td>
                </tr>
                <tr class="bold">
                    <td>TOTAL À PAYER:</td>
                    <td style="text-align: right;">€{total_gross:.2f}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            Merci pour votre confiance. En cas de questions concernant cette facture, n'hésitez pas à nous contacter.
        </div>
    </body>
    </html>
    """
    return html

def get_quote_html_template(work_order, client=None):
    """Generates the HTML template for the PDF quote (Devis)"""
    
    data = _compute_pdf_data(work_order, client, is_invoice=False)
    quote_number = data['doc_number']
    issue_date = data['issue_date']
    client_name = data['client_name']
    client_cui = data['client_cui']
    client_address = data['client_address']
    table_rows = data['table_rows']
    total_net = data['total_net']
    total_vat = data['total_vat']
    vat_percent = data['vat_percent']
    total_gross = data['total_gross']

    html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 40px;
                color: #333;
                font-size: 14px;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #0056b3;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .company-details {{
                font-size: 14px;
                color: #555;
            }}
            .company-name {{
                font-size: 24px;
                font-weight: bold;
                color: #0056b3;
                margin-bottom: 5px;
            }}
            .client-section {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }}
            .client-details {{
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                width: 45%;
            }}
            .invoice-meta {{
                width: 45%;
                text-align: right;
            }}
            .invoice-title {{
                font-size: 28px;
                color: #333;
                font-weight: bold;
                margin-bottom: 10px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }}
            th {{
                background-color: #0056b3;
                color: white;
                padding: 12px;
                text-align: left;
            }}
            th.right {{ text-align: right; }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #ddd;
            }}
            .totals-section {{
                width: 100%;
                display: flex;
                justify-content: flex-end;
            }}
            .totals-table {{
                width: 300px;
                border-collapse: collapse;
            }}
            .totals-table td {{
                padding: 8px 12px;
                border-bottom: none;
            }}
            .totals-table tr.bold td {{
                font-weight: bold;
                font-size: 16px;
                border-top: 2px solid #0056b3;
            }}
            .footer {{
                margin-top: 50px;
                font-size: 12px;
                color: #777;
                text-align: center;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 80px; margin-bottom: 10px;" />
                <div class="company-details">
                    Chappelles lez Herlemont<br>
                    Rue de Clair Fontaine 162<br>
                    BE0755686913<br>
                    Belgique
                </div>
            </div>
        </div>

        <div class="client-section">
            <div class="client-details">
                <strong>Devis pour:</strong><br><br>
                <strong>{client_name}</strong><br>
                {client_address}<br>
                {f"CUI / TVA: {client_cui}" if client_cui else ""}
            </div>
            <div class="invoice-meta">
                <div class="invoice-title">DEVIS ESTIMATIF</div>
                <strong>N° de devis:</strong> {quote_number}<br>
                <strong>Date:</strong> {issue_date}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="right">Quantité</th>
                    <th class="right">Prix Unitaire</th>
                    <th class="right">Total</th>
                </tr>
            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Sous-total (Net):</td>
                    <td style="text-align: right;">€{total_net:.2f}</td>
                </tr>
                <tr>
                    <td>TVA ({vat_percent}%):</td>
                    <td style="text-align: right;">€{total_vat:.2f}</td>
                </tr>
                <tr class="bold">
                    <td>TOTAL ESTIMATIF:</td>
                    <td style="text-align: right;">€{total_gross:.2f}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            Merci pour votre confiance. Ce devis est valable pour une durée de 30 jours.
        </div>
    </body>
    </html>
    """
    return html

from playwright.async_api import async_playwright
import logging

logger = logging.getLogger(__name__)

async def generate_invoice_pdf(work_order, client=None):
    """
    Generates a PDF using Playwright asynchronously and saves it to the uploads folder.
    Returns the relative path to the generated PDF.
    """
    try:
        html_content = get_html_template(work_order, client)
        
        # Ensure uploads folder exists
        upload_dir = os.path.join(os.getcwd(), "uploads", "pdfs")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"facture_{work_order.invoice_number or work_order.id[:8]}_{uuid.uuid4().hex[:6]}.pdf"
        filepath = os.path.join(upload_dir, filename)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_content(html_content, wait_until="networkidle")
            await page.pdf(path=filepath, format="A4", print_background=True)
            await browser.close()
            
        logger.info(f"PDF generated successfully at {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        return None

async def generate_quote_pdf(work_order, client=None):
    """
    Generates a Quote PDF (Devis) using Playwright asynchronously.
    """
    try:
        html_content = get_quote_html_template(work_order, client)
        
        upload_dir = os.path.join(os.getcwd(), "uploads", "pdfs")
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = f"devis_{work_order.quote_number or work_order.id[:8]}_{uuid.uuid4().hex[:6]}.pdf"
        filepath = os.path.join(upload_dir, filename)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_content(html_content, wait_until="networkidle")
            await page.pdf(path=filepath, format="A4", print_background=True)
            await browser.close()
            
        logger.info(f"Quote PDF generated successfully at {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Error generating Quote PDF: {e}")
        return None
