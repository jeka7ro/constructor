import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        view_data = None

        async def handle_response(response):
            nonlocal view_data
            if "views/" in response.url and "/data" in response.url and response.request.method == "GET":
                try:
                    view_data = await response.json()
                    print("Intercepted view data!")
                except Exception as e:
                    print("Failed to parse view data:", e)

        page.on("response", handle_response)
        
        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        if view_data:
            print("Items count:", len(view_data.get('items', [])))
            if view_data.get('items'):
                print("First item:", json.dumps(view_data['items'][0], indent=2)[:1000])
        else:
            print("No view data intercepted")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
