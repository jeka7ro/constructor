import asyncio
from playwright.async_api import async_playwright
import requests

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        session_id = None
        cookies_header = None

        async def handle_request(route, request):
            nonlocal session_id, cookies_header
            if "_s=" in request.url and not session_id:
                session_id = request.url.split("_s=")[1].split("&")[0]
            if "api/v2" in request.url:
                cookies = await context.cookies()
                cookie_strs = [f"{c['name']}={c['value']}" for c in cookies]
                cookies_header = "; ".join(cookie_strs)
            await route.continue_()

        await page.route("**/*", handle_request)

        print("Logging in to get session id and cookies...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        print("Session ID:", session_id)
        await browser.close()
        
        if session_id and cookies_header:
            headers = {"Cookie": cookies_header, "Accept": "application/json"}
            endpoints = [
                f"https://app.robaws.com/api/v2/resource-files?resourceType=work-order&resourceId=27108&_s={session_id}",
                f"https://app.robaws.com/api/v2/work-orders/27108/documents?_s={session_id}",
                f"https://app.robaws.com/api/v2/work-orders/27108/files?_s={session_id}",
            ]
            for ep in endpoints:
                print("Trying", ep.split('?')[0])
                r = requests.get(ep, headers=headers)
                print(r.status_code)
                if r.status_code == 200:
                    print("SUCCESS!", r.json())

if __name__ == "__main__":
    asyncio.run(main())
