import urllib.request
from bs4 import BeautifulSoup
import re
import logging

logger = logging.getLogger(__name__)

def fetch_kbo_data(vat_number: str) -> dict:
    """
    Fetches basic company data (Name, Address) from the Belgian KBO/BCE Public Search.
    Returns a dictionary with 'valid', 'name', 'address' or None if not found/error.
    """
    # Clean the input to get only digits
    number = re.sub(r'\D', '', vat_number)
    
    if not number or len(number) < 9:
        return {"valid": False, "error": "Invalid VAT/Enterprise number format"}

    url = f"https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer={number}&lang=en"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            soup = BeautifulSoup(html, 'html.parser')
            
            name = ""
            address = ""
            status = ""
            is_vat_subject = False
            director = ""
            
            for tr in soup.find_all('tr'):
                tds = tr.find_all('td')
                if len(tds) >= 2:
                    key = tds[0].get_text(strip=True).lower()
                    val = tds[1].get_text(separator=', ', strip=True)
                    
                    if 'name:' in key:
                        lines = [line.strip() for line in tds[1].stripped_strings]
                        if lines:
                            name = lines[0]
                    
                    if 'registered seat' in key or "seat's address:" in key or "address of the seat:" in key:
                        lines = [line.strip() for line in tds[1].stripped_strings]
                        addr_parts = []
                        for line in lines:
                            if line.startswith("Since"):
                                break
                            addr_parts.append(line)
                        if addr_parts:
                            address = ", ".join(addr_parts)
                            
                    if 'status:' in key:
                        status = val

                    if 'director' in key or 'manager' in key or 'founder' in key or 'gérant' in key or 'zaakvoerder' in key or 'bestuurder' in key:
                        # Sometimes it returns multiple if multiple directors, let's take the first or just join
                        # We split by comma if needed, but it's fine to just take the raw string and strip the 'Since' part
                        clean_director = val.split(', Since')[0]
                        if not director:
                            director = clean_director

            for td in soup.find_all('td'):
                text = td.get_text(strip=True).lower()
                if 'subject to vat' in text or 'assujetti à la tva' in text or 'btw-plichtig' in text:
                    is_vat_subject = True

            if name:
                return {
                    "valid": True,
                    "name": name,
                    "address": address,
                    "status": status,
                    "is_vat_subject": is_vat_subject,
                    "director": director
                }
            else:
                return {"valid": False, "error": "Could not parse company name"}
                
    except Exception as e:
        logger.error(f"KBO Scraper Error: {str(e)}")
        return {"valid": False, "error": "Error connecting to KBO service"}
