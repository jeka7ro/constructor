import os
import asyncio
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.orm import Session
from playwright.async_api import async_playwright
import uuid

from app.database import SessionLocal
from app.models import Team, WorkOrder, Organization

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

            # Navigate to login
            await page.goto("https://app.robaws.com/login", wait_until="networkidle")
            
            # Fill login form. 
            # Note: We assume standard inputs here, but we might need to adjust based on Robaws' real DOM
            # Usually input[type="email"] and input[type="password"]
            email_input = page.locator("input[type='email'], input[name='username'], input[name='email']")
            if await email_input.count() > 0:
                await email_input.first.fill(team.robaws_email)
            else:
                print(f"[Robaws] Eroare la {team.name}: Nu am găsit câmpul de email.")
                await browser.close()
                return

            pass_input = page.locator("input[type='password'], input[name='password']")
            if await pass_input.count() > 0:
                await pass_input.first.fill(team.robaws_password)
            else:
                print(f"[Robaws] Eroare la {team.name}: Nu am găsit câmpul de parolă.")
                await browser.close()
                return

            # Press Enter to login or click the button
            await pass_input.first.press("Enter")
            
            # Wait for dashboard to load (usually URL changes or a specific dashboard element appears)
            try:
                await page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass # Timeout might happen, let's just proceed
            
            # Take a screenshot to verify login status later or save for debugging
            # screenshot_path = f"robaws_debug_{team.id}.png"
            # await page.screenshot(path=screenshot_path)
            # print(f"[Robaws] Login screenshot salvat la {screenshot_path}")

            # TODO: Add logic here to navigate to the "Calendar" or "Planning" section 
            # and extract the work orders into dictionaries.
            # Example extracted order format:
            # extracted_orders = [
            #     {
            #         "external_id": "robaws_12345",
            #         "title": "Turnare placă beton",
            #         "site_address": "Strada Muncii 1",
            #         "start_date": "2026-06-08",
            #         "start_time": "08:00"
            #     }
            # ]
            
            extracted_orders = [] # Replace with actual parsing

            # ── Salvare în baza de date ───────────────────────────────
            for order in extracted_orders:
                # Verificăm dacă există deja
                existing = db.query(WorkOrder).filter(
                    WorkOrder.external_id == order["external_id"],
                    WorkOrder.organization_id == team.organization_id
                ).first()
                
                if not existing:
                    # Cream comanda noua
                    new_wo = WorkOrder(
                        organization_id=team.organization_id,
                        token=uuid.uuid4().hex, # Dummy token sau generat de noi
                        title=order["title"],
                        site_address=order.get("site_address"),
                        start_date=order.get("start_date"),
                        start_time=order.get("start_time"),
                        assigned_team_id=team.id,
                        status="draft",
                        external_id=order["external_id"],
                        source_system="robaws",
                        created_by=team.team_leader_id # Setam creatorul ca fiind seful de echipa sau adminul
                    )
                    db.add(new_wo)
            
            db.commit()
            print(f"[Robaws] Extragere completă pentru {team.name}. Comenzi noi găsite: {len(extracted_orders)}.")

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
