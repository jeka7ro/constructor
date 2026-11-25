async function test() {
    try {
        const loginRes = await fetch('http://localhost:8000/api/partner/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'eugen1ro@gmail.com',
                password: 'password'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        if (!token) {
            console.error("Login failed", loginData);
            return;
        }
        console.log("Logged in!");
        
        const woRes = await fetch('http://localhost:8000/api/partner/work-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const works = await woRes.json();
        
        console.log(`Total works: ${works.length}`);
        const augustWorks = works.filter(w => {
            const date = w.start_date || w.deadline_date;
            return date && date.startsWith('2026-08');
        });
        console.log(`August works: ${augustWorks.length}`);
        if (augustWorks.length > 0) {
            console.log(augustWorks.map(w => ({id: w.id, title: w.title, date: w.start_date})));
        }
    } catch (err) {
        console.error(err.message);
    }
}
test();
