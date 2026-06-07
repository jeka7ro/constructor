import asyncio
from playwright.async_api import async_playwright

async def main():
    print("Starting playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page()
        print("Navigating to login...")
        await page.goto("https://app.robaws.com/login", wait_until="networkidle")
        
        # Fill credentials
        print("Filling credentials...")
        await page.locator("input[type='email'], input[name='username']").first.fill("davidechapeteam1@gmail.com")
        await page.locator("input[type='password']").first.fill("Chapeteam1!!")
        await page.locator("input[type='password']").first.press("Enter")
        
        print("Waiting for login to process...")
        try:
            await page.wait_for_timeout(10000) # wait 10 seconds to ensure load
            # await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception as e:
            print("Wait state error:", e)
            
        print("Current URL:", page.url)
        content = await page.content()
        with open("robaws_dump.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("DOM dumped to robaws_dump.html")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
