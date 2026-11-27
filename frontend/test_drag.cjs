const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 1. Create a dummy work order
const dbPath = path.join(__dirname, '../backend/sql_app.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Insert a dummy work order for today
    const today = new Date().toISOString().split('T')[0] + "T12:00:00";
    const id = "test-drag-wo";
    const org_id = "f0a5be7f-0763-455b-b9ab-b1ef382ab398"; // Usually DavideChape
    const client_id = "test-client";
    
    // Just try inserting, ignore error if it fails
    db.run(`INSERT INTO work_orders (id, title, start_date, duration_days, status, source_system, organization_id, client_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id, 'Test Drag', today, 1, 'planning', 'partner', org_id, client_id], function(err) {
        if (err) console.log("Insert err:", err.message);
        else console.log("Created test work order");
    });
});
db.close();

// 2. Run Puppeteer
setTimeout(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
    try {
        console.log("Going to planning...");
        await page.goto('http://127.0.0.1:5678/partner/planning', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        
        // Find ALL cards to see what we have
        const cards = await page.$$('div[draggable="true"]');
        console.log(`Found ${cards.length} draggable cards`);
        
        if (cards.length > 0) {
            const box = await cards[0].boundingBox();
            console.log("Dragging card 200px to the right...");
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2, { steps: 10 });
            await page.mouse.up();
            
            console.log("Waiting for modal to appear...");
            await new Promise(r => setTimeout(r, 1000));
            
            const saveBtn = await page.$('button.bg-blue-600');
            if (saveBtn) {
                console.log("Clicking save on modal...");
                await saveBtn.click();
                await new Promise(r => setTimeout(r, 3000));
            } else {
                console.log("No modal found.");
            }
        }
    } catch (e) {
        console.log("Error:", e);
    } finally {
        await browser.close();
    }
}, 1000);
