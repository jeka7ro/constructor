from playwright.sync_api import sync_playwright

def test_pdf():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content("<h1>Test Invoice PDF</h1><p>This is a test invoice generated via playwright.</p>")
        page.pdf(path="test_invoice.pdf", format="A4")
        browser.close()
        print("PDF generated successfully.")

if __name__ == "__main__":
    test_pdf()
