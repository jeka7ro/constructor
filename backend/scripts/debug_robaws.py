import sys
import os
import asyncio
from playwright.async_api import async_playwright

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import Team

async def debug_scraper():
    db = SessionLocal()
    team = db.query(Team).filter(Team.robaws_email.isnot(None), Team.robaws_email != "").first()
    if not team:
        print("No team with robaws credentials")
        return
        
    print(f"Using {team.robaws_email}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto("https://app.robaws.com/")
        await page.wait_for_timeout(3000)
        
        email_input = page.locator("input[name='username']")
        await email_input.first.fill(team.robaws_email)
        pass_input = page.locator("input[name='password']")
        await pass_input.first.fill(team.robaws_password)
        await pass_input.first.press("Enter")
        
        print("Logged in, waiting...")
        await page.wait_for_timeout(8000)
        
        rows = page.locator("tr[dynamicoverviewtablerow]")
        count = await rows.count()
        if count == 0:
            print("No rows found")
            return
            
        # Get first 3 rows
        for r in range(min(3, count)):
            row = rows.nth(r)
            tds = row.locator("td")
            td_count = await tds.count()
            print(f"--- ROW {r} ({td_count} cols) ---")
            for i in range(td_count):
                try:
                    text = await tds.nth(i).inner_text()
                    print(f"Col {i}: {text.strip()}")
                except:
                    print(f"Col {i}: Error")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_scraper())
