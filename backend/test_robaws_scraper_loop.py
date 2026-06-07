import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        docs_payloads = {}

        async def handle_response(response):
            if "/documents" in response.url and "api" in response.url and response.request.method == "GET":
                try:
                    data = await response.json()
                    if "work-orders/" in response.url:
                        wo_id = response.url.split("work-orders/")[1].split("/")[0]
                        docs_payloads[wo_id] = data
                except:
                    pass

        page.on("response", handle_response)
        
        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        rows_loc = page.locator("tr[dynamicoverviewtablerow]")
        count = await rows_loc.count()
        print("Found rows:", count)
        
        for i in range(min(2, count)):
            print(f"Processing row {i}...")
            # We must re-fetch the locator if the page navigated
            rows_loc = page.locator("tr[dynamicoverviewtablerow]")
            await rows_loc.nth(i).locator("td").nth(1).click()
            await page.wait_for_timeout(4000)
            
            docs_tab = page.locator("a[href='#tabDocuments']")
            if await docs_tab.count() > 0:
                await docs_tab.click()
                await page.wait_for_timeout(3000)
                
            print("Going back...")
            await page.go_back()
            await page.wait_for_timeout(4000)
            
        print("Docs intercepted:")
        for k, v in docs_payloads.items():
            print(f"ID {k} -> {len(v)} documents")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
