const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('requestfailed', request => console.log('API FAILED:', request.url(), request.failure().errorText));
    page.on('response', response => {
        if (response.url().includes('/api/') && response.status() >= 400) {
            console.log('API ERROR RESPONSE:', response.url(), response.status());
        }
    });

    try {
        console.log("Navigating to partner login...");
        await page.goto('http://127.0.0.1:5678/partner/login');
        
        // Try to login if not already
        try {
            await page.waitForSelector('input[name="email"]', { timeout: 2000 });
            await page.type('input[name="email"]', 'test@test.com');
            await page.type('input[name="password"]', 'test');
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log("Logged in.");
        } catch (e) {
            console.log("No login needed or failed to login.", e.message);
        }

        console.log("Going to planning...");
        await page.goto('http://127.0.0.1:5678/partner/planning', { waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        
        // Find a card to drag
        const card = await page.$('div[draggable="true"]');
        if (!card) {
            console.log("NO DRAGGABLE CARD FOUND!");
            await browser.close();
            return;
        }
        
        console.log("Found card. Getting bounding box...");
        const box = await card.boundingBox();
        
        console.log("Dragging card 200px to the right...");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        
        console.log("Waiting for modal to appear...");
        await page.waitForTimeout(1000);
        
        const saveBtn = await page.$('button.bg-blue-600');
        if (saveBtn) {
            console.log("Clicking save on modal...");
            await saveBtn.click();
            await page.waitForTimeout(2000); // wait for API and re-render
        } else {
            console.log("No modal found.");
        }
        
        console.log("Test finished.");
        
    } catch (e) {
        console.log("Error:", e);
    } finally {
        await browser.close();
    }
})();
