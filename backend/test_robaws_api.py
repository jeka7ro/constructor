import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        api_urls = []
        token = None

        page.on("request", lambda request: api_urls.append(request.url) if "api" in request.url else None)
        
        async def handle_request(route, request):
            nonlocal token
            auth = request.headers.get("authorization")
            if auth:
                token = auth
            await route.continue_()
            
        await page.route("**/*", handle_request)

        print("Logging in...")
        await page.goto("https://app.robaws.com/", wait_until="networkidle")
        await page.fill("input[name='username']", "davidechapeteam1@gmail.com")
        await page.fill("input[name='password']", "Chapeteam1!!")
        await page.press("input[name='password']", "Enter")
        
        await page.wait_for_timeout(10000)
        
        print("Token:", token)
        print("API URLs called:")
        for u in set(api_urls):
            if "robaws.com/api" in u or "api" in u:
                print(" -", u)
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
