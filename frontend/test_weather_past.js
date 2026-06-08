async function test() {
    const targetDate = "2024-05-15";
    const lat = 50.85;
    const lon = 4.35;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
    try {
        const r = await fetch(url);
        const data = await r.json();
        console.log("Forecast API:", data.error ? data.reason : "OK");
    } catch(e) { console.error("Error", e); }
    
    const urlHist = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m,precipitation,weather_code&timezone=auto`;
    try {
        const r2 = await fetch(urlHist);
        const data2 = await r2.json();
        console.log("Archive API:", data2.error ? data2.reason : "OK", "hours length:", data2.hourly?.time?.length);
    } catch(e) { console.error("Error2", e); }
}
test();
