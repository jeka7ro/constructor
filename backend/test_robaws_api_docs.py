import asyncio
from playwright.async_api import async_playwright
import requests

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        session_id = None

        page.on("request", lambda request: set_session_id(request.url))
        
        def set_session_id(url):
            nonlocal session_id
            if "_s=" in url and not session_id:
                session_id = url.split("_s=")[1].split("&")[0]

        print("Logging in to get session id...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        print("Session ID:", session_id)
        await browser.close()
        
        if session_id:
            # Let's try some endpoints
            endpoints = [
                f"https://app.robaws.com/api/v2/resource-files?resourceType=work-order&resourceId=27108&_s={session_id}",
                f"https://app.robaws.com/api/v2/work-orders/27108/documents?_s={session_id}",
                f"https://app.robaws.com/api/v2/work-orders/27108/files?_s={session_id}",
                f"https://app.robaws.com/api/v1/work-orders/27108/documents?_s={session_id}",
            ]
            for ep in endpoints:
                print("Trying", ep.split('?')[0])
                r = requests.get(ep)
                if r.status_code == 200:
                    print("SUCCESS!", r.json() if "application/json" in r.headers.get("Content-Type", "") else r.text[:200])
                else:
                    print("Failed:", r.status_code)

if __name__ == "__main__":
    asyncio.run(main())
