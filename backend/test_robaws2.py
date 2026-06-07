import asyncio
from playwright.async_api import async_playwright

async def main():
    print("Starting playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page()
        print("Navigating to login...")
        await page.goto("https://app.robaws.com/login", wait_until="networkidle")
        
        # Take screenshot and dump DOM
        await page.screenshot(path="robaws_login_page.png")
        content = await page.content()
        with open("robaws_login_dump.html", "w", encoding="utf-8") as f:
            f.write(content)
            
        print("DOM dumped to robaws_login_dump.html and screenshot saved.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
