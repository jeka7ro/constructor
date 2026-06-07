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
        
        await page.wait_for_timeout(5000)
        print("Logged in, fetching dashboard...")

        content = await page.content()
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, "html.parser")
        
        rows = soup.find_all("tr", attrs={"dynamicoverviewtablerow": ""})
        if not rows:
            print("No rows found")
            await browser.close()
            return
            
        print(f"Found {len(rows)} rows.")
        first_row = rows[0]
        
        # Try to find a link in the row
        link = first_row.find("a")
        if link and link.has_attr('href'):
            url = link['href']
            print(f"Navigating to detail: {url}")
            if not url.startswith('http'):
                url = "https://app.robaws.com" + url
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_timeout(3000)
            detail_content = await page.content()
            
            with open("robaws_detail.html", "w") as f:
                f.write(detail_content)
            print("Saved detail page to robaws_detail.html")
            
            # Print any links that might be files
            dsoup = BeautifulSoup(detail_content, "html.parser")
            for a in dsoup.find_all("a"):
                href = a.get("href", "")
                text = a.get_text(strip=True)
                if "file" in href.lower() or "download" in href.lower() or "attachment" in href.lower():
                    print(f"File Link: {text} -> {href}")
        else:
            print("No link found in row, printing row html:", first_row.prettify())

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
