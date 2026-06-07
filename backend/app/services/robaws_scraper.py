import os
import asyncio
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.orm import Session
from playwright.async_api import async_playwright
import uuid

from app.database import SessionLocal
from app.models import Team, WorkOrder, Organization, Client

async def run_scraper_for_team(team: Team, db: Session):
    """
    Simulates a browser to log into Robaws and fetch orders for a specific team.
    Currently, this is a skeleton that takes a screenshot or prints the title.
    We will update this with actual DOM parsing once we know the exact layout.
    """
    if not team.robaws_email or not team.robaws_password:
        print(f"[Robaws] Sărit {team.name}: Lipsesc credențiale.")
        return

    print(f"[Robaws] Se începe extragerea pentru {team.name} ({team.robaws_email})")
    
    try:
        async with async_playwright() as p:
            # We use headless=True for production, but can use False locally for debugging
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            # Navigate to root (which redirects to SSO login properly)
            await page.goto("https://app.robaws.com/", wait_until="networkidle")
            
            # Fill login form. 
            email_input = page.locator("input[name='username']")
            if await email_input.count() > 0:
                await email_input.first.fill(team.robaws_email)
            else:
                print(f"[Robaws] Eroare la {team.name}: Nu am găsit câmpul de email.")
                await browser.close()
                return

            pass_input = page.locator("input[name='password']")
            if await pass_input.count() > 0:
                await pass_input.first.fill(team.robaws_password)
            else:
                print(f"[Robaws] Eroare la {team.name}: Nu am găsit câmpul de parolă.")
                await browser.close()
                return

            # Press Enter to login
            await pass_input.first.press("Enter")
            
            # Wait for dashboard to load (usually URL changes or a specific dashboard element appears)
            try:
                await page.wait_for_timeout(10000)
            except Exception:
                pass 
            
            # Extract content and parse with bs4
            content = await page.content()
            
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, "html.parser")
            rows = soup.find_all("tr", attrs={"dynamicoverviewtablerow": ""})
            
            extracted_orders = []
            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 11: continue
                
                ext_id = tds[1].get_text(strip=True)
                raw_date = tds[2].get_text(strip=True) # DD/MM/YYYY
                title = tds[3].get_text(strip=True)
                client = tds[7].get_text(strip=True)
                address = tds[10].get_text(strip=True)
                
                # Format date to YYYY-MM-DD
                start_date = None
                try:
                    if raw_date:
                        d, m, y = raw_date.split('/')
                        start_date = f"{y}-{m}-{d}"
                except Exception:
                    pass

                # Append Client to Title if useful
                full_title = f"[{client}] {title}" if client else title

                extracted_orders.append({
                    "external_id": ext_id,
                    "title": full_title[:255],
                    "client": client,
                    "site_address": address,
                    "start_date": start_date,
                    "start_time": "08:00" # Default as no time is provided
                })

            # ── Salvare în baza de date ───────────────────────────────
            inserted_count = 0
            for order in extracted_orders:
                if not order["external_id"]: continue
                
                # Verificăm dacă există deja
                existing = db.query(WorkOrder).filter(
                    WorkOrder.external_id == order["external_id"],
                    WorkOrder.organization_id == team.organization_id
                ).first()
                
                if not existing:
                    # Gestionare Client
                    client_id = None
                    if order.get("client"):
                        client_record = db.query(Client).filter(
                            Client.name == order["client"],
                            Client.organization_id == team.organization_id
                        ).first()
                        
                        if not client_record:
                            client_record = Client(
                                organization_id=team.organization_id,
                                name=order["client"],
                                client_type="juridica",
                                country="BE"  # Robaws is generally used in BE/FR
                            )
                            db.add(client_record)
                            db.flush() # get ID
                            
                        client_id = client_record.id

                    # Cream comanda noua
                    new_wo = WorkOrder(
                        organization_id=team.organization_id,
                        token=uuid.uuid4().hex,
                        title=order["title"],
                        client_id=client_id,
                        client_name=order.get("client"),
                        site_address=order.get("site_address"),
                        start_date=order.get("start_date"),
                        start_time=order.get("start_time"),
                        assigned_team_id=team.id,
                        status="isoflex",
                        external_id=order["external_id"],
                        source_system="robaws",
                        created_by=None
                    )
                    db.add(new_wo)
                    inserted_count += 1
            
            db.commit()
            print(f"[Robaws] Extragere completă pentru {team.name}. Comenzi noi adăugate: {inserted_count} din {len(extracted_orders)} găsite pe pagină.")

            await browser.close()
    except Exception as e:
        print(f"[Robaws] Eroare neașteptată pentru {team.name}: {e}")

def run_all_scrapers():
    """
    Această funcție va fi chemată de APScheduler.
    Ea va rula asincron Playwright pentru fiecare echipă.
    """
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
