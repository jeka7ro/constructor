import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)

        rows = page.locator("tr[dynamicoverviewtablerow]")
        if await rows.count() > 0:
            await rows.nth(0).locator("td").nth(1).click()
            await page.wait_for_timeout(5000)
            
            # Click the documents tab
            docs_tab = page.locator("a[href='#tabDocuments']")
            if await docs_tab.count() > 0:
                print("Clicking Documents tab...")
                await docs_tab.click()
                await page.wait_for_timeout(3000)
                
                content = await page.content()
                with open("robaws_docs.html", "w") as f:
                    f.write(content)
                print("Saved docs tab to robaws_docs.html")
            else:
                print("Documents tab not found")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
