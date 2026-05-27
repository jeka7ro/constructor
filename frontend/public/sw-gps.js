// sw-gps.js — GPS keepalive Service Worker
// Trimite ping GPS in background, chiar si cand telefonul e folosit pentru alte aplicatii.
// Functioneaza via Background Sync API (Chrome Android) — se declanseaza la orice activitate de retea.

const CACHE_NAME = 'gps-shift-v1'
const SHIFT_KEY = '/shift-active'

// ─── Stocare date tura in Cache Storage (accesibil din SW) ─────────────────
async function saveShiftData(data) {
    try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(SHIFT_KEY, new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        }))
    } catch (e) {}
}

async function loadShiftData() {
    try {
        const cache = await caches.open(CACHE_NAME)
        const res = await cache.match(SHIFT_KEY)
        if (!res) return null
        return await res.json()
    } catch (e) { return null }
}

async function clearShiftData() {
    try {
        const cache = await caches.open(CACHE_NAME)
        await cache.delete(SHIFT_KEY)
    } catch (e) {}
}

// ─── Primeste mesaje de la pagina ───────────────────────────────────────────
self.addEventListener('message', async (event) => {
    const { type, ...data } = event.data || {}

    if (type === 'SHIFT_START') {
        // Salveaza date tura: { lat, lon, token, apiBase, segmentId }
        await saveShiftData(data)
    }

    if (type === 'LOCATION_UPDATE') {
        // Actualizeaza coordonatele in timp ce tura e activa
        const existing = await loadShiftData()
        if (existing) {
            await saveShiftData({ ...existing, lat: data.lat, lon: data.lon })
        }
    }

    if (type === 'SHIFT_END') {
        await clearShiftData()
    }
})

// ─── Background Sync ─────────────────────────────────────────────────────────
// Se declanseaza de Chrome cand telefonul are retea activa,
// inclusiv cand utilizatorul foloseste alte aplicatii.
self.addEventListener('sync', async (event) => {
    if (event.tag === 'gps-ping') {
        event.waitUntil(sendGpsPing())
    }
})

async function sendGpsPing() {
    const shift = await loadShiftData()
    if (!shift || !shift.token || !shift.lat || !shift.lon) return

    try {
        await fetch(`${shift.apiBase}/api/timesheets/location-ping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${shift.token}`
            },
            body: JSON.stringify({
                latitude: shift.lat,
                longitude: shift.lon
            })
        })
    } catch (e) {
        // Retransmite la urmatoarea sincronizare
        throw e
    }
}

// ─── Install / Activate ──────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})
