import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        # User standard chrome
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.screenshot(path="robaws_login_page2.png")
        content = await page.content()
        with open("robaws_login_dump2.html", "w", encoding="utf-8") as f:
            f.write(content)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
