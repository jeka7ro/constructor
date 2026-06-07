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
        print("Logged in, fetching dashboard...")

        rows = page.locator("tr[dynamicoverviewtablerow]")
        count = await rows.count()
        print(f"Found {count} rows.")
        if count > 0:
            # click the second td of the first row
            await rows.nth(0).locator("td").nth(1).click()
            await page.wait_for_timeout(5000)
            url = page.url
            print("Navigated to:", url)
            
            content = await page.content()
            with open("robaws_detail.html", "w") as f:
                f.write(content)
            print("Saved detail to robaws_detail.html")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
