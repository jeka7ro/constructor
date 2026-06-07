import asyncio
from playwright.async_api import async_playwright
import json

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

        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        print("Session ID:", session_id)
        
        # Now fetch from inside the page!
        if session_id:
            js_code = f"""
            async () => {{
                let res = await fetch('https://app.robaws.com/api/v2/resource-files?resourceType=work-order&resourceId=27108&_s={session_id}');
                if (res.ok) return await res.json();
                
                let res2 = await fetch('https://app.robaws.com/api/v2/resource-files?resourceType=WORK_ORDER&resourceId=27108&_s={session_id}');
                if (res2.ok) return await res2.json();
                
                return "Failed";
            }}
            """
            result = await page.evaluate(js_code)
            print("Fetch Result:", json.dumps(result, indent=2)[:500])
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
