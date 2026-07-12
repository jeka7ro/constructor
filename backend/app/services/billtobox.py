import requests
from datetime import datetime
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

def generate_efff_xml(work_order, client):
    """
    Generates a UBL 2.0 (e-FFF / Peppol BIS 3.0) XML string for the given invoice.
    This is a simplified UBL Invoice structure.
    """
    # Helper to safely get values
    def safe_str(val):
        return str(val) if val is not None else ""

    invoice_number = safe_str(work_order.invoice_number or work_order.id[:8])
    issue_date = work_order.invoiced_at.strftime('%Y-%m-%d') if work_order.invoiced_at else datetime.now().strftime('%Y-%m-%d')
    due_date = work_order.invoiced_at.strftime('%Y-%m-%d') if work_order.invoiced_at else datetime.now().strftime('%Y-%m-%d')
    
    client_name = safe_str(client.name if client else work_order.client_name)
    client_email = safe_str(client.email if client else work_order.client_email)
    client_cui_raw = safe_str(client.cui if client else "")
    client_country = safe_str(client.country if client else "BE")
    
    # Auto-detect BE country if CUI starts with BE
    if client_cui_raw.upper().startswith("BE"):
        client_country = "BE"
        
    client_cui_clean = client_cui_raw.replace("BE", "").replace("RO", "").replace(" ", "").replace(".", "") if client_cui_raw else ""
    client_address = safe_str(client.address if client else work_order.site_address)
    
    # Select schemeID based on country
    scheme_id = "9956" if client_country == "BE" else "9925"
    
    # Calculate totals
    volumes = getattr(work_order, 'volumes', []) or []
    prices = getattr(work_order, 'prices', {}) or {}
    
    total_net = 0.0
    
    for vol in volumes:
        qty = float(vol.get('quantity', 0) or 0)
        price = float(vol.get('price', 0) or 0)
        total_net += qty * price

    if total_net == 0.0:
        # Fallback to estimated_price if no valid volumes
        est_price_str = str(getattr(work_order, 'estimated_price', '') or '0')
        import re
        total_net = float(re.sub(r'[^0-9.]', '', est_price_str) or 0)
        
    vat_percent = 21.0 # Default
    if 'vat_type' in prices:
        try:
            vat_percent = float(prices['vat_type'] or 21)
        except:
            pass
            
    tax_category = "S" if vat_percent > 0 else "Z"
        
    total_vat = total_net * (vat_percent / 100)
    total_gross = total_net + total_vat

    # XML Template (Peppol BIS 3.0 / e-FFF)
    # Customer tags
    customer_endpoint_tag = f'<cbc:EndpointID schemeID="{scheme_id}">{client_cui_clean}</cbc:EndpointID>' if client_cui_clean else ''
    customer_tax_scheme_tag = f'''<cac:PartyTaxScheme>
                <cbc:CompanyID>{client_cui_raw}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>''' if client_cui_raw else ''
    customer_company_id_tag = f'<cbc:CompanyID schemeID="{scheme_id}">{client_cui_clean}</cbc:CompanyID>' if client_cui_clean else ''

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
    <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
    <cbc:ID>{invoice_number}</cbc:ID>
    <cbc:IssueDate>{issue_date}</cbc:IssueDate>
    <cbc:DueDate>{due_date}</cbc:DueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cbc:EndpointID schemeID="9956">0785292895</cbc:EndpointID>
            <cac:PartyName>
                <cbc:Name>DAVIDE CHAPE</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>Gemeentehuisstraat 27/5</cbc:StreetName>
                <cbc:CityName>Ternat</cbc:CityName>
                <cbc:PostalZone>1740</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>BE</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>BE0785292895</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>DAVIDE CHAPE</cbc:RegistrationName>
                <cbc:CompanyID schemeID="0208">0785292895</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <cac:AccountingCustomerParty>
        <cac:Party>
            {customer_endpoint_tag}
            <cac:PartyName>
                <cbc:Name>{client_name}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>{client_address}</cbc:StreetName>
                <cac:Country>
                    <cbc:IdentificationCode>{client_country}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            {customer_tax_scheme_tag}
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>{client_name}</cbc:RegistrationName>
                {customer_company_id_tag}
            </cac:PartyLegalEntity>
            {f'''<cac:Contact>
                <cbc:ElectronicMail>{client_email}</cbc:ElectronicMail>
            </cac:Contact>''' if client_email else ''}
        </cac:Party>
    </cac:AccountingCustomerParty>
    
    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>1</cbc:PaymentMeansCode>
        <cbc:PaymentID>{invoice_number}</cbc:PaymentID>
    </cac:PaymentMeans>
    
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="EUR">{total_vat:.2f}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="EUR">{total_net:.2f}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="EUR">{total_vat:.2f}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>{tax_category}</cbc:ID>
                <cbc:Percent>{vat_percent:.2f}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="EUR">{total_net:.2f}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="EUR">{total_net:.2f}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="EUR">{total_gross:.2f}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="EUR">{total_gross:.2f}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="C62">1.0</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="EUR">{total_net:.2f}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>Travaux selon devis / Servicii conform deviz</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>{tax_category}</cbc:ID>
                <cbc:Percent>{vat_percent:.2f}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="EUR">{total_net:.2f}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
</Invoice>
"""
    return xml_content

import smtplib
from email.message import EmailMessage
from datetime import datetime
import httpx
import os

def send_invoice_to_billtobox(work_order, client):
    """
    Sends the invoice to Billtobox via Email.
    """
    try:
        smtp_user = settings.SMTP_USERNAME
        smtp_password = settings.SMTP_PASSWORD
        
        if not smtp_user or not smtp_password:
            return False, "SMTP_USERNAME sau SMTP_PASSWORD lipsesc din .env"
            
        xml_data = generate_efff_xml(work_order, client)
        invoice_number = work_order.invoice_number or work_order.id[:8]
        
        msg = EmailMessage()
        msg['Subject'] = settings.BILLTOBOX_EMAIL_SUBJECT
        msg['From'] = smtp_user
        msg['To'] = settings.BILLTOBOX_IMPORT_EMAIL
        
        msg.set_content(f"Factura {invoice_number} trimisa automat catre Billtobox.")
        
        # Attach the XML file
        filename = f"Factura_{invoice_number}.xml"
        msg.add_attachment(
            xml_data.encode('utf-8'),
            maintype='application',
            subtype='xml',
            filename=filename
        )
        
        # Attach the PDF file
        if work_order.pdf_path:
            try:
                pdf_data = None
                if work_order.pdf_path.startswith('http'):
                    response = httpx.get(work_order.pdf_path, timeout=15.0)
                    if response.status_code == 200:
                        pdf_data = response.content
                else:
                    local_path = os.path.join(os.getcwd(), work_order.pdf_path.lstrip('/'))
                    if os.path.exists(local_path):
                        with open(local_path, 'rb') as f:
                            pdf_data = f.read()
                
                if pdf_data:
                    msg.add_attachment(
                        pdf_data,
                        maintype='application',
                        subtype='pdf',
                        filename=f"Factura_{invoice_number}.pdf"
                    )
                else:
                    logger.warning(f"Could not load PDF data for Billtobox from path: {work_order.pdf_path}")
            except Exception as pdf_err:
                logger.error(f"Eroare atasare PDF la Billtobox: {str(pdf_err)}")
        
        # Send email
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
            
        return True, "Email trimis cu succes"
            
    except Exception as e:
        logger.error(f"Eroare trimitere email Billtobox: {str(e)}")
        return False, f"Eroare trimitere email: {str(e)}"
