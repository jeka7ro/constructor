import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        urls = []
        page.on("request", lambda request: urls.append(request.url) if "api" in request.url else None)
        
        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        # Click the row
        rows = page.locator("tr[dynamicoverviewtablerow]")
        if await rows.count() > 0:
            urls.clear() # clear dashboard urls
            await rows.nth(0).locator("td").nth(1).click()
            await page.wait_for_timeout(5000)
            
            # Click documents tab
            docs_tab = page.locator("a[href='#tabDocuments']")
            if await docs_tab.count() > 0:
                await docs_tab.click()
                await page.wait_for_timeout(3000)
                
                print("API URLs during documents tab:")
                for u in set(urls):
                    if "api" in u:
                        print(" -", u)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
