import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 800, 'height': 600})
        
        # Load the SVG directly
        svg_path = os.path.abspath('frontend/public/davide_logo.svg')
        await page.goto(f"file://{svg_path}")
        
        # Take a screenshot of the SVG element
        svg_element = await page.query_selector('svg')
        if svg_element:
            await svg_element.screenshot(path='frontend/public/davide_logo.png', omit_background=True)
        else:
            await page.screenshot(path='frontend/public/davide_logo.png', full_page=True, omit_background=True)
            
        await browser.close()

asyncio.run(main())
