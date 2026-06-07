import asyncio
from playwright.async_api import async_playwright

async def main():
    print("Starting playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        print("Navigating to https://app.robaws.com/")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        
        print("Filling credentials...")
        await page.locator("input[name='username']").fill("davidechapeteam1@gmail.com")
        await page.locator("input[name='password']").fill("Chapeteam1!!")
        
        print("Submitting login...")
        await page.locator("input[name='password']").press("Enter")
        
        print("Waiting for dashboard to load...")
        try:
            # Wait for some common dashboard elements or just a timeout
            await page.wait_for_timeout(10000)
        except Exception as e:
            print("Timeout waiting for dashboard:", e)
            
        print("URL after login:", page.url)
        content = await page.content()
        with open("robaws_dash_dump.html", "w", encoding="utf-8") as f:
            f.write(content)
        await page.screenshot(path="robaws_dash.png")
        print("Saved dashboard DOM and screenshot.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
