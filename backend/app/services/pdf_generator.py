import os
import uuid
from datetime import datetime
from playwright.sync_api import sync_playwright
import logging

logger = logging.getLogger(__name__)

def get_html_template(work_order, client=None):
    """Generates the HTML template for the PDF invoice/quote"""
    
    # Helper to safely get values
    def safe_str(val):
        return str(val) if val is not None else ""
        
    invoice_number = safe_str(work_order.invoice_number or work_order.id[:8])
    issue_date = work_order.invoiced_at.strftime('%Y-%m-%d') if work_order.invoiced_at else datetime.now().strftime('%Y-%m-%d')
    
    client_name = safe_str(client.name if client else work_order.client_name)
    client_cui = safe_str(client.cui if client else "")
    client_address = safe_str(client.address if client else work_order.site_address)
    
    # Calculate totals
    prices = work_order.prices or {}
    volumes = work_order.volumes or []
    
    total_net = 0.0
    table_rows = ""
    
    if not volumes:
        # Default row if no volumes exist
        table_rows += f"""
        <tr>
            <td>Servicii izolație conform deviz</td>
            <td style="text-align: right;">1</td>
            <td style="text-align: right;">€{total_net:.2f}</td>
            <td style="text-align: right;">€{total_net:.2f}</td>
        </tr>
        """
    else:
        for vol in volumes:
            qty = float(vol.get('quantity', 0) or 0)
            price = float(vol.get('price', 0) or 0)
            row_total = qty * price
            total_net += row_total
            desc = vol.get('type', 'Serviciu')
            table_rows += f"""
            <tr>
                <td>{desc}</td>
                <td style="text-align: right;">{qty}</td>
                <td style="text-align: right;">€{price:.2f}</td>
                <td style="text-align: right;">€{row_total:.2f}</td>
            </tr>
            """
        
    vat_percent = 21.0
    if 'vat_type' in prices:
        try:
            vat_percent = float(prices['vat_type'] or 21)
        except:
            vat_percent = 21.0
            
    total_vat = total_net * (vat_percent / 100)
    total_gross = total_net + total_vat

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
                <div class="company-name">ISOFLEX SRL</div>
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
            await page.set_content(html_content)
            await page.pdf(path=filepath, format="A4", print_background=True)
            await browser.close()
            
        logger.info(f"PDF generat automat la {filepath}")
        return f"/uploads/pdfs/{filename}"
        
    except Exception as e:
        logger.error(f"Eroare la generarea PDF-ului: {str(e)}")
        return None
