from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://app.robaws.com/login")
    print("Page Title:", page.title())
    browser.close()

with sync_playwright() as p:
    run(p)
