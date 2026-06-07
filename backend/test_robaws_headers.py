import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        headers_dict = {}

        page.on("request", lambda request: headers_dict.update({request.url: request.headers}) if "api" in request.url else None)
        
        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        for url, headers in headers_dict.items():
            if "api/v2/views/filter-values" in url or "api/v2/tenants" in url:
                print("Headers for API:")
                for k, v in headers.items():
                    print(f"  {k}: {v[:50]}...")
                break
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
