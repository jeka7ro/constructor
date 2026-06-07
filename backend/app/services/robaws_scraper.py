import os
import asyncio
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session
from playwright.async_api import async_playwright
import uuid
import requests

from app.database import SessionLocal
from app.models import Team, WorkOrder, WorkOrderDocument
from app.storage import upload_file, get_content_type

def geocode_address_for_scraper(address: str):
    if not address or not address.strip(): return None, None
    query = address
    if "belgium" not in query.lower() and "belgie" not in query.lower() and "belgique" not in query.lower():
        query += ", Belgium"
        
    import re
    headers = {"User-Agent": "IsoflexAppScraper/1.0"}
    
    try:
        res = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "be,nl,fr,lu,de"},
            headers=headers,
            timeout=5
        )
        data = res.json()
        if data and len(data) > 0:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except:
        pass
        
    # Fallback to postal code extraction
    match = re.search(r'\b([1-9][0-9]{3})\b', address)
    if match:
        fallback_query = f"{match.group(1)}, Belgium"
        try:
            res = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": fallback_query, "format": "json", "limit": 1},
                headers=headers,
                timeout=5
            )
            data = res.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
        except:
            pass

    return None, None

async def run_scraper_for_team(team: Team, db: Session):
    if not team.robaws_email or not team.robaws_password:
        print(f"[Robaws] Sărit {team.name}: Lipsesc credențiale.")
        return

    print(f"[Robaws] Se începe extragerea pentru {team.name} ({team.robaws_email})")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            # We'll collect the session ID for API calls if needed
            session_id = None
            def on_request(req):
                nonlocal session_id
                if "_s=" in req.url and not session_id:
                    session_id = req.url.split("_s=")[1].split("&")[0]
            page.on("request", on_request)

            await page.goto("https://app.robaws.com/", wait_until="networkidle")
            
            email_input = page.locator("input[name='username']")
            if await email_input.count() > 0:
                await email_input.first.fill(team.robaws_email)
            else:
                await browser.close()
                return

            pass_input = page.locator("input[name='password']")
            if await pass_input.count() > 0:
                await pass_input.first.fill(team.robaws_password)
            else:
                await browser.close()
                return

            await pass_input.first.press("Enter")
            
            try:
                await page.wait_for_timeout(10000)
            except:
                pass 
            
            # Loop dynamically over the rows
            inserted_count = 0
            
            while True:
                # Always get fresh locators in the while loop
                rows_loc = page.locator("tr[dynamicoverviewtablerow]")
                count = await rows_loc.count()
                
                # We'll process one new order at a time, then break and restart the loop because DOM changes
                found_new = False
                for i in range(count):
                    row = rows_loc.nth(i)
                    tds = row.locator("td")
                    if await tds.count() < 11:
                        continue
                        
                    ext_id = await tds.nth(1).inner_text()
                    ext_id = ext_id.strip()
                    if not ext_id:
                        continue
                        
                    existing = db.query(WorkOrder).filter(
                        WorkOrder.external_id == ext_id,
                        WorkOrder.organization_id == team.organization_id
                    ).first()
                    
                    if not existing:
                        # Found a new order! Process it
                        raw_date = await tds.nth(2).inner_text()
                        title = await tds.nth(3).inner_text()
                        client = await tds.nth(7).inner_text()
                        address = await tds.nth(10).inner_text()
                        
                        raw_date = raw_date.strip()
                        title = title.strip()
                        client = client.strip()
                        address = address.strip()
                        
                        start_date = None
                        try:
                            if raw_date:
                                d, m, y = raw_date.split('/')
                                start_date = f"{y}-{m}-{d}"
                        except:
                            pass

                        full_title = f"[{client}] {title}" if client else title

                        lat, lon = geocode_address_for_scraper(address)

                        new_wo = WorkOrder(
                            organization_id=team.organization_id,
                            token=uuid.uuid4().hex,
                            title=full_title[:255],
                            client_id=None,
                            client_name=client,
                            site_address=address,
                            site_latitude=lat,
                            site_longitude=lon,
                            start_date=start_date,
                            start_time="08:00",
                            assigned_team_id=team.id,
                            status="isoflex",
                            external_id=ext_id,
                            source_system="robaws",
                            created_by=None
                        )
                        db.add(new_wo)
                        db.flush() # get id
                        wo_db_id = new_wo.id
                        
                        print(f"[Robaws] Adăugare comandă nouă: {ext_id}")
                        
                        # Now click to get documents!
                        docs_data = None
                        async def intercept_docs(resp):
                            nonlocal docs_data
                            if "/documents" in resp.url and "api" in resp.url and resp.request.method == "GET":
                                try:
                                    docs_data = await resp.json()
                                except:
                                    pass
                        
                        page.on("response", intercept_docs)
                        
                        await tds.nth(1).click()
                        await page.wait_for_timeout(4000)
                        
                        docs_tab = page.locator("a[href='#tabDocuments']")
                        if await docs_tab.count() > 0:
                            await docs_tab.click()
                            await page.wait_for_timeout(3000)
                            
                        page.remove_listener("response", intercept_docs)
                        
                        # Process documents
                        if docs_data and isinstance(docs_data, list):
                            for doc in docs_data:
                                doc_name = doc.get("fileName", "document.pdf")
                                doc_url = doc.get("presignedUrl") or doc.get("presignedPreviewUrl")
                                if doc_url:
                                    print(f"Descărcare document: {doc_name}")
                                    try:
                                        r = requests.get(doc_url)
                                        if r.status_code == 200:
                                            # Salvăm în storage-ul nostru
                                            safe_filename = f"{uuid.uuid4().hex[:8]}_{doc_name}"
                                            storage_path = f"work_orders/{wo_db_id}/documents/{safe_filename}"
                                            content_type = get_content_type(safe_filename)
                                            
                                            file_url_internal = upload_file(r.content, storage_path, content_type)
                                            
                                            wo_doc = WorkOrderDocument(
                                                work_order_id=wo_db_id,
                                                filename=doc_name,
                                                file_path=storage_path,
                                                file_size=len(r.content),
                                                content_type=content_type
                                            )
                                            db.add(wo_doc)
                                    except Exception as e:
                                        print(f"Eroare descărcare doc {doc_name}: {e}")
                        
                        db.commit()
                        inserted_count += 1
                        
                        # Go back and restart the while loop to find more!
                        await page.go_back()
                        await page.wait_for_timeout(4000)
                        found_new = True
                        break # break the for loop, restart the while loop
                
                if not found_new:
                    # No more new orders found in the list! We are done.
                    break
                    
            print(f"[Robaws] Extragere completă pentru {team.name}. Comenzi noi adăugate: {inserted_count}.")

            await browser.close()
    except Exception as e:
        print(f"[Robaws] Eroare neașteptată pentru {team.name}: {e}")

def run_all_scrapers():
    print(f"[Robaws] Rulăm planificatorul global la {datetime.now()}")
    db = SessionLocal()
    try:
        teams = db.query(Team).filter(
            Team.robaws_email.isnot(None),
            Team.robaws_email != "",
            Team.is_active == True
        ).all()

        for team in teams:
            asyncio.run(run_scraper_for_team(team, db))
            
    finally:
        db.close()
