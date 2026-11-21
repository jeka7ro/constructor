/**
 * liveWeatherCanvas.jsx — Pro Apple Weather / AccuWeather Live Radar & Atmospheric Canvas Engine
 * - Real-time Open-Meteo batch telemetry (24 Belgian & European stations, 10-min cache)
 * - RainViewer Doppler Radar layer (real meteorological precipitation echoes)
 * - Weather-state-driven localized Canvas FX (Rain streaks, Snowflakes, Storm lightning,
 *   Sunny warm shimmer, and ultra-fine silky wind streamlines)
 * - Collapsible "MÉTÉO EN ZONE" dark Liquid Glass card (matching the pro screenshot)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { CloudSun, ChevronUp, ChevronDown } from 'lucide-react';
import { isNightAtCoords } from './solarTerminator';

// Prevent React 18 / Vite HMR "Map container is already initialized" crash across all Leaflet maps
if (L?.Map?.prototype && !L.Map.prototype.__safeInitPatched) {
    const origInitContainer = L.Map.prototype._initContainer;
    L.Map.prototype._initContainer = function (id) {
        const container = typeof id === 'string' ? document.getElementById(id) : id;
        if (container && container._leaflet_id) {
            container._leaflet_id = null;
            container.innerHTML = '';
        }
        return origInitContainer.call(this, id);
    };
    L.Map.prototype.__safeInitPatched = true;
}

export const WEATHER_STATIONS_24 = [
    { id: 'bruxelles', name: 'Bruxelles', lat: 50.8503, lng: 4.3517, priority: 1 },
    { id: 'antwerpen', name: 'Antwerpen', lat: 51.2194, lng: 4.4025, priority: 1 },
    { id: 'gent', name: 'Gent', lat: 51.0543, lng: 3.7174, priority: 1 },
    { id: 'charleroi', name: 'Charleroi', lat: 50.4108, lng: 4.4446, priority: 1 },
    { id: 'liege', name: 'Liège', lat: 50.6326, lng: 5.5797, priority: 1 },
    { id: 'namur', name: 'Namur', lat: 50.4674, lng: 4.8720, priority: 1 },
    { id: 'brugge', name: 'Brugge', lat: 51.2093, lng: 3.2247, priority: 2 },
    { id: 'mons', name: 'Mons', lat: 50.4542, lng: 3.9567, priority: 2 },
    { id: 'leuven', name: 'Leuven', lat: 50.8798, lng: 4.7005, priority: 2 },
    { id: 'hasselt', name: 'Hasselt', lat: 50.9307, lng: 5.3325, priority: 2 },
    { id: 'arlon', name: 'Arlon', lat: 49.6833, lng: 5.8167, priority: 1 },
    { id: 'bastogne', name: 'Bastogne', lat: 50.0000, lng: 5.7167, priority: 2 },
    { id: 'tournai', name: 'Tournai', lat: 50.6054, lng: 3.3880, priority: 2 },
    { id: 'kortrijk', name: 'Kortrijk', lat: 50.8279, lng: 3.2649, priority: 2 },
    { id: 'mechelen', name: 'Mechelen', lat: 51.0259, lng: 4.4775, priority: 2 },
    { id: 'oostende', name: 'Oostende', lat: 51.2154, lng: 2.9286, priority: 2 },
    { id: 'rochefort', name: 'Rochefort', lat: 50.1611, lng: 5.2217, priority: 2 },
    { id: 'luxembourg', name: 'Luxembourg', lat: 49.6116, lng: 6.1319, priority: 1 },
    { id: 'lille', name: 'Lille', lat: 50.6292, lng: 3.0573, priority: 1 },
    { id: 'maastricht', name: 'Maastricht', lat: 50.8514, lng: 5.6910, priority: 2 },
    { id: 'eindhoven', name: 'Eindhoven', lat: 51.4416, lng: 5.4697, priority: 2 },
    { id: 'rotterdam', name: 'Rotterdam', lat: 51.9244, lng: 4.4777, priority: 2 },
    { id: 'koln', name: 'Köln', lat: 50.9375, lng: 6.9603, priority: 2 },
    { id: 'paris', name: 'Paris', lat: 48.8566, lng: 2.3522, priority: 3 },
];

const WEATHER_TTL_MS = 10 * 60 * 1000;
const RADAR_TTL_MS = 10 * 60 * 1000;

let cachedWeatherStations = null;
let cachedWeatherTimestamp = 0;
let liveWeatherInFlight = null;

let cachedRadarUrl = null;
let cachedRadarTimestamp = 0;

/**
 * Pure Vector SVG Apple Weather Icon renderer with Day/Night support.
 */
export function getAppleWeatherSvgString(kind, isNight, size = 18) {
    if (kind === 'storm') {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 16.5H7a4 4 0 01-.8-7.92A5.5 5.5 0 0116.9 7.5a3.5 3.5 0 01.6 9z" fill="url(#st_g)"/><path d="M13 12.5l-3 5h3l-1 4.5 4.2-6.5h-3l.8-3z" fill="#FBBF24"/><defs><linearGradient id="st_g" x1="6" y1="6" x2="18" y2="17" gradientUnits="userSpaceOnUse"><stop stop-color="#94A3B8"/><stop offset="1" stop-color="#475569"/></linearGradient></defs></svg>`;
    }
    if (kind === 'snow') {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 15H7a4 4 0 01-.8-7.92A5.5 5.5 0 0116.9 6a3.5 3.5 0 01.6 9z" fill="#94A3B8"/><circle cx="8.5" cy="18.5" r="1.4" fill="#E0F2FE"/><circle cx="12" cy="20" r="1.4" fill="#E0F2FE"/><circle cx="15.5" cy="18.5" r="1.4" fill="#E0F2FE"/></svg>`;
    }
    if (kind === 'rain' || kind === 'drizzle') {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 15H7a4 4 0 01-.8-7.92A5.5 5.5 0 0116.9 6a3.5 3.5 0 01.6 9z" fill="#60A5FA"/><path d="M9 17.5l-1.2 3.2M12.5 17.5l-1.2 3.2M16 17.5l-1.2 3.2" stroke="#38BDF8" stroke-width="1.9" stroke-linecap="round"/></svg>`;
    }
    if (kind === 'fog') {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 10h16M6 14h12M4 18h14" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    if (kind === 'cloudy') {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 18H7a4 4 0 01-.8-7.92A5.5 5.5 0 0116.9 9a3.5 3.5 0 01.6 9z" fill="#93C5FD"/></svg>`;
    }
    if (kind === 'partly') {
        if (isNight) {
            return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 4.5a5 5 0 004.5 7 5 5 0 01-7-7 4.9 4.9 0 012.5 0z" fill="#FDE68A"/><path d="M17 19H7.5a3.5 3.5 0 01-.7-6.93A4.8 4.8 0 0116.2 11a3 3 0 01.8 8z" fill="#93C5FD"/></svg>`;
        }
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8.5" cy="8.5" r="4" fill="#FBBF24"/><path d="M17.5 19H8a3.5 3.5 0 01-.7-6.93A4.8 4.8 0 0116.7 11a3 3 0 01.8 8z" fill="#93C5FD"/></svg>`;
    }
    if (isNight) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" fill="#FDE68A"/></svg>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" fill="#FBBF24"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/></svg>`;
}

export function renderAppleWeatherIcon(kind, isNight, size = 18) {
    return (
        <span
            className="inline-flex items-center justify-center shrink-0"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: getAppleWeatherSvgString(kind, isNight, size) }}
        />
    );
}

export function getLocalizedWeatherLabel(kind, isNight, precipMm, snowCm, lang = 'fr') {
    const l = (lang || 'fr').slice(0, 2).toLowerCase();
    const p = Math.max(0, Number(precipMm) || 0);
    const s = Math.max(0, Number(snowCm) || 0);

    const dict = {
        ro: {
            storm: `Furtună (${p.toFixed(1)} mm)`,
            snow: `Ninsoare (${(s || p).toFixed(1)} cm)`,
            rain: `Ploaie (${p.toFixed(1)} mm)`,
            drizzle: `Burniță (${p.toFixed(1)} mm)`,
            fog: 'Ceață',
            cloudy: 'Noros',
            partly: 'Parțial noros',
            clearNight: 'Noapte senină',
            clearDay: 'Senin',
        },
        fr: {
            storm: `Orage (${p.toFixed(1)} mm)`,
            snow: `Neige (${(s || p).toFixed(1)} cm)`,
            rain: `Pluie (${p.toFixed(1)} mm)`,
            drizzle: `Bruine (${p.toFixed(1)} mm)`,
            fog: 'Brouillard',
            cloudy: 'Nuageux',
            partly: 'Partiellement nuageux',
            clearNight: 'Nuit claire',
            clearDay: 'Serein',
        },
        nl: {
            storm: `Onweer (${p.toFixed(1)} mm)`,
            snow: `Sneeuw (${(s || p).toFixed(1)} cm)`,
            rain: `Regen (${p.toFixed(1)} mm)`,
            drizzle: `Motregen (${p.toFixed(1)} mm)`,
            fog: 'Mist',
            cloudy: 'Bewolkt',
            partly: 'Halfbewolkt',
            clearNight: 'Heldere nacht',
            clearDay: 'Helder',
        },
        en: {
            storm: `Storm (${p.toFixed(1)} mm)`,
            snow: `Snow (${(s || p).toFixed(1)} cm)`,
            rain: `Rain (${p.toFixed(1)} mm)`,
            drizzle: `Drizzle (${p.toFixed(1)} mm)`,
            fog: 'Fog',
            cloudy: 'Cloudy',
            partly: 'Partly cloudy',
            clearNight: 'Clear night',
            clearDay: 'Clear',
        },
    };
    const t = dict[l] || dict.fr;
    if (kind === 'storm') return t.storm;
    if (kind === 'snow') return t.snow;
    if (kind === 'rain') return t.rain;
    if (kind === 'drizzle') return t.drizzle;
    if (kind === 'fog') return t.fog;
    if (kind === 'cloudy') return t.cloudy;
    if (kind === 'partly') return t.partly;
    return isNight ? t.clearNight : t.clearDay;
}

export function mapWmoCodeToWeather(wmoCode, precipMm, snowCm, cloudCover, isNight) {
    const realPrecip = Math.max(0, Number(precipMm) || 0);
    const realSnow = Math.max(0, Number(snowCm) || 0);
    const code = Number(wmoCode) || 0;

    if (code >= 95 && realPrecip > 0.05) {
        return { kind: 'storm', label: `Orage (${realPrecip.toFixed(1)} mm)` };
    }
    if ((realSnow > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86) && (realPrecip > 0 || realSnow > 0)) {
        return { kind: 'snow', label: `Neige (${(realSnow || realPrecip).toFixed(1)} cm)` };
    }
    if (realPrecip >= 0.5) {
        return { kind: 'rain', label: `Pluie (${realPrecip.toFixed(1)} mm)` };
    }
    if (realPrecip >= 0.05) {
        return { kind: 'drizzle', label: `Bruine (${realPrecip.toFixed(1)} mm)` };
    }
    if (code === 45 || code === 48) {
        return { kind: 'fog', label: 'Brouillard' };
    }
    if ((Number(cloudCover) || 0) >= 75 || code === 3) {
        return { kind: 'cloudy', label: 'Nuageux' };
    }
    if ((Number(cloudCover) || 0) >= 28 || code === 1 || code === 2) {
        return { kind: 'partly', label: 'Partiellement nuageux' };
    }
    return { kind: 'clear', label: isNight ? 'Nuit claire' : 'Serein' };
}

export async function fetchLiveEuropeanWeather(force = false) {
    const now = Date.now();
    if (!force && cachedWeatherStations && now - cachedWeatherTimestamp < WEATHER_TTL_MS) {
        return cachedWeatherStations;
    }
    if (liveWeatherInFlight) return liveWeatherInFlight;

    const lats = WEATHER_STATIONS_24.map(s => s.lat.toFixed(4)).join(',');
    const lngs = WEATHER_STATIONS_24.map(s => s.lng.toFixed(4)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto`;

    liveWeatherInFlight = fetch(url)
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
        .then(payload => {
            const arr = Array.isArray(payload) ? payload : [payload];
            const enriched = WEATHER_STATIONS_24.map((st, idx) => {
                const cur = arr[idx]?.current || {};
                const precip = Math.max(
                    Number(cur.precipitation) || 0,
                    (Number(cur.rain) || 0) + (Number(cur.showers) || 0)
                );
                const snow = Number(cur.snowfall) || 0;
                const night = isNightAtCoords(st.lat, st.lng);
                const wInfo = mapWmoCodeToWeather(cur.weather_code, precip, snow, cur.cloud_cover, night);

                return {
                    ...st,
                    temp: cur.temperature_2m != null ? Math.round(Number(cur.temperature_2m)) : null,
                    precipMm: precip,
                    snowCm: snow,
                    cloudCover: Number(cur.cloud_cover) || 0,
                    windSpeedKmh: cur.wind_speed_10m != null ? Math.round(Number(cur.wind_speed_10m)) : 12,
                    windDirDeg: cur.wind_direction_10m != null ? Number(cur.wind_direction_10m) : 240,
                    isNight: night,
                    ...wInfo,
                };
            });
            cachedWeatherStations = enriched;
            cachedWeatherTimestamp = Date.now();
            return enriched;
        })
        .catch(() => cachedWeatherStations || [])
        .finally(() => {
            liveWeatherInFlight = null;
        });

    return liveWeatherInFlight;
}

export async function fetchLatestRainViewerUrl() {
    const now = Date.now();
    if (cachedRadarUrl && now - cachedRadarTimestamp < RADAR_TTL_MS) {
        return cachedRadarUrl;
    }
    try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) return cachedRadarUrl;
        const data = await res.json();
        const past = data?.radar?.past || [];
        if (past.length === 0) return cachedRadarUrl;
        const latest = past[past.length - 1];
        const host = data.host || 'https://tilecache.rainviewer.com';
        cachedRadarUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
        cachedRadarTimestamp = now;
        return cachedRadarUrl;
    } catch {
        return cachedRadarUrl;
    }
}

/**
 * Inverse-Distance Weighting (IDW) wind interpolation from the 24 cached stations.
 */
function sampleRealWindAt(lat, lng, stations) {
    if (!stations || stations.length === 0) {
        return { vx: 0.7, vy: -0.25, speedKmh: 12 };
    }
    let sumVx = 0;
    let sumVy = 0;
    let sumSpeed = 0;
    let sumW = 0;

    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        const dLat = lat - s.lat;
        const dLng = (lng - s.lng) * 0.65;
        const distSq = dLat * dLat + dLng * dLng + 0.03;
        const w = 1 / distSq;
        const moveRad = ((s.windDirDeg + 180) * Math.PI) / 180;
        const speed = Math.max(5, s.windSpeedKmh || 12);
        sumVx += Math.sin(moveRad) * speed * w;
        sumVy += -Math.cos(moveRad) * speed * w;
        sumSpeed += speed * w;
        sumW += w;
    }
    return {
        vx: (sumVx / sumW) * 0.16,
        vy: (sumVy / sumW) * 0.16,
        speedKmh: sumSpeed / sumW,
    };
}

/**
 * Pro AccuWeather / Apple Weather Canvas Atmospheric Engine:
 * - ZERO flying wind arrows/sticks across dry land.
 * - Multi-blob organic meteorological clouds / radar cells (matching Apple Weather & AccuWeather radar).
 * - Fine precipitation streaks / snowflakes / lightning strictly inside active rain/snow/storm radar clouds.
 * - Soft volumetric drifting cloud layers for cloudy/partly cloudy zones and warm sunlight glow for clear zones.
 */
export function startProWeatherCanvasAnimation(map, canvas, getStationsRef) {
    if (!map || !canvas) return () => { };
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const PRECIP_SLOTS = 90;

    // Pre-generate organic sub-blobs so each weather station renders a realistic, irregular radar/cloud shape
    const CLOUD_LOBES = [
        { dx: 0, dy: 0, rScale: 1.0, alphaScale: 1.0, speed: 0.0005, phase: 0.0 },
        { dx: -0.38, dy: 0.14, rScale: 0.78, alphaScale: 0.85, speed: 0.0006, phase: 1.3 },
        { dx: 0.36, dy: -0.16, rScale: 0.82, alphaScale: 0.88, speed: 0.00045, phase: 2.6 },
        { dx: 0.18, dy: 0.34, rScale: 0.70, alphaScale: 0.75, speed: 0.00055, phase: 3.9 },
        { dx: -0.24, dy: -0.28, rScale: 0.68, alphaScale: 0.72, speed: 0.0005, phase: 5.1 },
    ];

    let width = 0;
    let height = 0;
    let animId = null;
    let isVisible = true;
    let lastFrameTime = 0;

    const resizeCanvas = () => {
        const size = map.getSize();
        width = size.x || canvas.parentElement?.clientWidth || 800;
        height = size.y || canvas.parentElement?.clientHeight || 500;
        canvas.width = width;
        canvas.height = height;
    };
    resizeCanvas();

    const precipParticles = Array.from({ length: PRECIP_SLOTS }, (_, idx) => ({
        angle: (idx * 137.5 * Math.PI) / 180,
        radiusFactor: Math.sqrt((idx + 1) / PRECIP_SLOTS),
        phase: Math.random() * 28,
        speed: 0.75 + (idx % 7) * 0.14,
    }));

    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(entries => {
            if (entries[0]) isVisible = entries[0].isIntersecting;
        });
        io.observe(canvas);
    }

    const renderOrganicRadarCell = (cx, cy, baseR, stops, ts, seed) => {
        for (let l = 0; l < CLOUD_LOBES.length; l++) {
            const lobe = CLOUD_LOBES[l];
            const driftX = Math.sin(ts * lobe.speed + seed + lobe.phase) * (baseR * 0.08);
            const driftY = Math.cos(ts * lobe.speed * 0.85 + seed + lobe.phase) * (baseR * 0.06);
            const lx = cx + lobe.dx * baseR * 0.55 + driftX;
            const ly = cy + lobe.dy * baseR * 0.45 + driftY;
            const lr = baseR * lobe.rScale;

            const grad = ctx.createRadialGradient(lx, ly, lr * 0.05, lx, ly, lr);
            for (let s = 0; s < stops.length; s++) {
                const [offset, r, g, b, a] = stops[s];
                grad.addColorStop(offset, `rgba(${r}, ${g}, ${b}, ${(a * lobe.alphaScale).toFixed(3)})`);
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(lx, ly, lr, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const renderFrame = (ts) => {
        animId = requestAnimationFrame(renderFrame);
        if (typeof document !== 'undefined' && document.hidden) return;
        if (!isVisible) return;
        if (ts - lastFrameTime < 33) return;
        lastFrameTime = ts;

        ctx.clearRect(0, 0, width, height);
        const zoom = map.getZoom();
        if (zoom < 5) return;

        const stations = getStationsRef.current || [];
        if (stations.length === 0) return;

        const zoneRadiusPx = Math.max(70, Math.min(210, Math.pow(1.30, zoom - 5) * 46));

        for (let sIdx = 0; sIdx < stations.length; sIdx++) {
            const st = stations[sIdx];
            const pt = map.latLngToContainerPoint([st.lat, st.lng]);
            if (pt.x < -zoneRadiusPx * 1.4 || pt.x > width + zoneRadiusPx * 1.4 || pt.y < -zoneRadiusPx * 1.4 || pt.y > height + zoneRadiusPx * 1.4) {
                continue;
            }

            if (st.kind === 'rain' || st.kind === 'drizzle' || st.kind === 'storm') {
                // Organic multi-layered Doppler radar precipitation cell (like AccuWeather / Stockholm screenshot)
                const radarStops = st.kind === 'storm'
                    ? [
                        [0, 37, 99, 235, 0.28],
                        [0.45, 14, 165, 233, 0.20],
                        [0.75, 56, 189, 248, 0.10],
                        [1, 56, 189, 248, 0],
                    ]
                    : [
                        [0, 14, 165, 233, 0.22],
                        [0.5, 56, 189, 248, 0.14],
                        [0.8, 125, 211, 252, 0.06],
                        [1, 125, 211, 252, 0],
                    ];
                renderOrganicRadarCell(pt.x, pt.y, zoneRadiusPx, radarStops, ts, sIdx * 1.7);

                // Subtle fine rain streaks ONLY inside the precipitation radar cloud (matching screenshot 2)
                ctx.strokeStyle = 'rgba(14, 116, 144, 0.32)';
                ctx.lineWidth = 1.05;
                ctx.lineCap = 'round';
                const count = st.kind === 'drizzle' ? 16 : 26;
                for (let i = 0; i < count; i++) {
                    const pp = precipParticles[(sIdx * 13 + i) % precipParticles.length];
                    pp.phase = (pp.phase + pp.speed * 0.35) % 24;
                    const r = pp.radiusFactor * (zoneRadiusPx * 0.68);
                    const rx = pt.x + Math.cos(pp.angle) * r - pp.phase * 0.18;
                    const ry = pt.y + Math.sin(pp.angle) * r + (pp.phase - 12);
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx - 2.0, ry + 7.5);
                    ctx.stroke();
                }

                // Soft internal lightning pulse for thunderstorm cells
                if (st.kind === 'storm' && Math.sin(ts * 0.016 + sIdx) > 0.95) {
                    const flash = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, zoneRadiusPx * 0.75);
                    flash.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
                    flash.addColorStop(1, 'rgba(253, 224, 71, 0)');
                    ctx.fillStyle = flash;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, zoneRadiusPx * 0.75, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (st.kind === 'snow') {
                // Organic icy-cyan snow radar cell + gentle snowflakes inside the cloud
                renderOrganicRadarCell(
                    pt.x,
                    pt.y,
                    zoneRadiusPx,
                    [
                        [0, 56, 189, 248, 0.20],
                        [0.55, 186, 230, 253, 0.12],
                        [1, 186, 230, 253, 0],
                    ],
                    ts,
                    sIdx * 1.9
                );

                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                for (let i = 0; i < 20; i++) {
                    const pp = precipParticles[(sIdx * 11 + i) % precipParticles.length];
                    pp.phase = (pp.phase + pp.speed * 0.2) % 24;
                    const r = pp.radiusFactor * (zoneRadiusPx * 0.65);
                    const sx = pt.x + Math.cos(pp.angle) * r + Math.sin(ts * 0.002 + i) * 4;
                    const sy = pt.y + Math.sin(pp.angle) * r + (pp.phase - 12);
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (st.kind === 'cloudy' || st.kind === 'partly' || st.kind === 'fog') {
                // Soft volumetric satellite cloud cover drifting gently
                const cloudAlpha = st.kind === 'partly' ? 0.12 : 0.18;
                renderOrganicRadarCell(
                    pt.x,
                    pt.y,
                    zoneRadiusPx * 0.9,
                    [
                        [0, 100, 116, 139, cloudAlpha],
                        [0.55, 148, 163, 184, cloudAlpha * 0.55],
                        [1, 148, 163, 184, 0],
                    ],
                    ts,
                    sIdx * 2.1
                );
            } else if (st.kind === 'clear' && !st.isNight) {
                // Soft warm ambient sunlight glow over clear/sunny zones
                const pulse = 0.13 + Math.sin(ts * 0.0018 + sIdx) * 0.03;
                renderOrganicRadarCell(
                    pt.x,
                    pt.y,
                    zoneRadiusPx * 0.75,
                    [
                        [0, 251, 191, 36, pulse],
                        [0.55, 253, 224, 71, pulse * 0.45],
                        [1, 253, 224, 71, 0],
                    ],
                    ts,
                    sIdx * 1.4
                );
            }
        }
    };

    const onMapMove = () => {
        resizeCanvas();
    };

    map.on('move zoom resize', onMapMove);
    animId = requestAnimationFrame(renderFrame);

    return () => {
        if (animId) cancelAnimationFrame(animId);
        if (io) io.disconnect();
        try {
            map.off('move zoom resize', onMapMove);
        } catch (_) { }
    };
}

/**
 * Pro Apple Weather / AccuWeather Overlay:
 * - RainViewer Doppler Radar layer + Subtle Weather-State Canvas FX (toggled together)
 * - Dark Frosted-Glass Collapsible "MÉTÉO EN ZONE" Card (matching the pro screenshot)
 * - Optional black on-map weather pill only when clicking a city in the card
 */
function extractShortCityName(address) {
    if (!address) return '';
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    const zipPart = parts.find(p => /\b\d{4,6}\b/.test(p));
    if (zipPart) {
        return zipPart.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() || zipPart;
    }
    const noDigitPart = parts.find(p => !/\d/.test(p) && !/^(belgique|belgie|belgië|belgium|belgia)$/i.test(p));
    const chosen = noDigitPart || parts[0];
    return chosen.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() || chosen;
}

function matchNearestStationWeather(lat, lng, stations) {
    if (!stations || stations.length === 0) {
        return {
            temp: 6,
            precipMm: 0,
            snowCm: 0,
            windSpeedKmh: 9,
            windDirDeg: 240,
            kind: 'clear',
            label: 'Serein',
            isNight: isNightAtCoords(lat, lng),
        };
    }
    let best = stations[0];
    let bestDist = Infinity;
    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        const d = Math.hypot(s.lat - lat, (s.lng - lng) * 0.65);
        if (d < bestDist) {
            bestDist = d;
            best = s;
        }
    }
    return best;
}

export function LiveMapWeatherOverlay({ showCard, onToggleCard, showRadarFx, workOrders = [], isMapFull = false }) {
    const map = useMap();
    const { t, i18n } = useTranslation();
    const [internalShowHud, setInternalShowHud] = useState(true);
    const showHud = showCard !== undefined ? showCard : internalShowHud;
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [internalShowWeatherFx, setInternalShowWeatherFx] = useState(true);
    const showWeatherFx = showRadarFx !== undefined ? showRadarFx : internalShowWeatherFx;
    const [hudStations, setHudStations] = useState([]);
    const [selectedCityId, setSelectedCityId] = useState(null);
    const stationsRef = useRef([]);
    const canvasRef = useRef(null);
    const radarLayerRef = useRef(null);
    const selectedMarkerRef = useRef(null);

    // 1. ResizeObserver on map container
    useEffect(() => {
        if (!map) return;
        const container = map.getContainer();
        if (!container || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            try { map.invalidateSize({ animate: false }); } catch (_) { }
        });
        ro.observe(container);
        const t1 = setTimeout(() => { try { map.invalidateSize(); } catch (_) { } }, 60);
        const t2 = setTimeout(() => { try { map.invalidateSize(); } catch (_) { } }, 240);
        return () => {
            ro.disconnect();
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [map]);

    const updateHudList = useCallback(() => {
        const list = stationsRef.current || [];
        let todayStr = '';
        try {
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Brussels',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).formatToParts(new Date());
            const map = {};
            parts.forEach(p => { map[p.type] = p.value; });
            todayStr = `${map.year}-${map.month}-${map.day}`;
        } catch (_) {
            const now = new Date();
            todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }

        const todayOrders = (Array.isArray(workOrders) ? workOrders : [])
            .filter(wo => {
                const dStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
                return dStr === todayStr && !['cancelled', 'pending'].includes(wo.status);
            })
            .sort((a, b) => (a.start_time || '07:00').localeCompare(b.start_time || '07:00'));

        if (todayOrders.length > 0) {
            const seenKeys = new Set();
            const jobItems = [];
            for (const wo of todayOrders) {
                const lat = parseFloat(wo.site_latitude || wo.site_lat) || 50.8503;
                const lng = parseFloat(wo.site_longitude || wo.site_lng) || 4.3517;
                const wx = matchNearestStationWeather(lat, lng, list);
                const city = extractShortCityName(wo.site_address || '') || 'Chantier';
                const client = (wo.client_name && wo.client_name !== 'None') ? wo.client_name : (wo.title || '');
                const dedupKey = `${city.toLowerCase()}|${client.toLowerCase()}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);
                const startTime = (wo.start_time || '07:00').slice(0, 5);
                jobItems.push({
                    id: `wo-${wo.id}`,
                    name: city,
                    clientName: client,
                    startTime,
                    fullAddress: wo.site_address || '',
                    lat,
                    lng,
                    temp: wx.temp,
                    precipMm: wx.precipMm,
                    snowCm: wx.snowCm,
                    windSpeedKmh: wx.windSpeedKmh,
                    windDirDeg: wx.windDirDeg,
                    kind: wx.kind,
                    label: wx.label,
                    isNight: wx.isNight,
                });
            }
            setHudStations(jobItems);
            return;
        }

        setHudStations([]);
    }, [workOrders]);

    useEffect(() => {
        updateHudList();
    }, [updateHudList]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const data = await fetchLiveEuropeanWeather();
            if (!mounted) return;
            stationsRef.current = data;
            updateHudList();
        };
        load();
        const t = setInterval(load, WEATHER_TTL_MS);
        return () => {
            mounted = false;
            clearInterval(t);
        };
    }, [updateHudList]);

    useEffect(() => {
        if (!map) return;
        map.on('moveend zoomend', updateHudList);
        return () => {
            try { map.off('moveend zoomend', updateHudList); } catch (_) { }
        };
    }, [map, updateHudList]);

    // 2. RainViewer Doppler Radar Layer
    useEffect(() => {
        if (!map) return;
        let active = true;
        if (!showWeatherFx) {
            if (radarLayerRef.current) {
                try { map.removeLayer(radarLayerRef.current); } catch (_) { }
                radarLayerRef.current = null;
            }
            return;
        }
        fetchLatestRainViewerUrl().then(tileUrl => {
            if (!active || !tileUrl || !map) return;
            if (radarLayerRef.current) {
                try { map.removeLayer(radarLayerRef.current); } catch (_) { }
            }
            const layer = L.tileLayer(tileUrl, {
                opacity: 0.52,
                maxNativeZoom: 7,
                maxZoom: 18,
                zIndex: 320,
                attribution: 'RainViewer Doppler',
            });
            layer.addTo(map);
            radarLayerRef.current = layer;
        });
        return () => {
            active = false;
            if (radarLayerRef.current) {
                try { map.removeLayer(radarLayerRef.current); } catch (_) { }
                radarLayerRef.current = null;
            }
        };
    }, [map, showWeatherFx]);

    // 3. Subtle Pro Weather Canvas Animation
    useEffect(() => {
        if (!map || !canvasRef.current || !showWeatherFx) return;
        return startProWeatherCanvasAnimation(map, canvasRef.current, stationsRef);
    }, [map, showWeatherFx, hudStations.length]);

    // 4. Optional single city callout pill on map when user clicks a city in "MÉTÉO EN ZONE"
    useEffect(() => {
        if (!map) return;
        if (selectedMarkerRef.current) {
            try { map.removeLayer(selectedMarkerRef.current); } catch (_) { }
            selectedMarkerRef.current = null;
        }
        if (!selectedCityId) return;
        const st = hudStations.find(s => s.id === selectedCityId) || (stationsRef.current || []).find(s => s.id === selectedCityId);
        if (!st) return;

        const sign = st.temp > 0 ? '+' : '';
        const tempStr = st.temp != null ? `${sign}${st.temp}°C` : '';
        const localLabel = getLocalizedWeatherLabel(st.kind, st.isNight, st.precipMm, st.snowCm, i18n.language);
        const titleLabel = st.clientName ? `${st.name} (${st.clientName})` : st.name;
        const calloutIcon = L.divIcon({
            className: '',
            iconSize: [0, 0],
            iconAnchor: [0, 0],
            html: `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;background:rgba(15,23,42,0.92);backdrop-filter:blur(12px);border:1.5px solid rgba(255,255,255,0.25);color:#ffffff;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 8px 20px rgba(2,6,23,0.5);transform:translate(-50%,-135%);pointer-events:none;">
                ${getAppleWeatherSvgString(st.kind, st.isNight, 14)}
                <span>${titleLabel} ${tempStr} · ${localLabel}</span>
            </div>`,
        });
        const m = L.marker([st.lat, st.lng], { icon: calloutIcon, interactive: false, zIndexOffset: 400 });
        m.addTo(map);
        selectedMarkerRef.current = m;

        return () => {
            if (selectedMarkerRef.current) {
                try { map.removeLayer(selectedMarkerRef.current); } catch (_) { }
                selectedMarkerRef.current = null;
            }
        };
    }, [map, selectedCityId, hudStations, i18n.language]);

    return (
        <>
            {showWeatherFx && (
                <canvas
                    ref={canvasRef}
                    className="pointer-events-none absolute inset-0 z-[400]"
                    style={{ width: '100%', height: '100%' }}
                />
            )}

            {/* Left Weather Card — Ultra-Compact, No Scrollbar & Scales up in Full Screen alongside Zoom In/Out buttons */}
            {showHud && (
                <div
                    className="absolute z-[1000] w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700/90 pointer-events-auto flex flex-col gap-1 overflow-y-auto hide-scrollbar tabular-nums transition-transform duration-150"
                    style={
                        isMapFull
                            ? {
                                  top: '18px',
                                  left: '78px',
                                  transform: 'scale(1.48)',
                                  transformOrigin: 'top left',
                                  maxHeight: 'calc((100vh - 96px) / 1.48)',
                              }
                            : {
                                  top: '16px',
                                  left: '56px',
                                  maxHeight: 'calc(100% - 2rem)',
                              }
                    }
                    onClick={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(c => !c)}
                        className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-between gap-1.5 w-full cursor-pointer"
                    >
                        <div className="flex items-center gap-1.5">
                            <CloudSun className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                            <span>{t('live.weather', 'Meteo')} ({hudStations.length})</span>
                        </div>
                        <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </span>
                    </button>

                    {!isCollapsed && (
                        <div className="flex flex-col gap-0.5">
                            {hudStations.length === 0 ? (
                                <div className="text-[10px] text-slate-400 italic py-1 text-center">
                                    {t('logistics.no_planned_works', 'Nicio lucrare planificată.')}
                                </div>
                            ) : hudStations.map(st => {
                                const sign = st.temp > 0 ? '+' : '';
                                const isSelected = selectedCityId === st.id;
                                const localLabel = getLocalizedWeatherLabel(st.kind, st.isNight, st.precipMm, st.snowCm, i18n.language);
                                return (
                                    <div
                                        key={st.id}
                                        onClick={() => {
                                            setSelectedCityId(prev => prev === st.id ? null : st.id);
                                            map.flyTo([st.lat, st.lng], 13, { animate: true, duration: 1.15 });
                                        }}
                                        title={`${st.startTime ? st.startTime + ' · ' : ''}${st.clientName || ''} — ${st.fullAddress || st.name} · ${localLabel} (${st.windSpeedKmh ?? 10} km/h)`}
                                        className={`flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800/80 py-1 px-1.5 -mx-1 first:border-0 cursor-pointer transition-colors rounded-lg ${isSelected
                                            ? 'bg-blue-50/95 dark:bg-sky-950/60 ring-1 ring-blue-400/60 dark:ring-sky-500/50'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            {renderAppleWeatherIcon(st.kind, st.isNight, 14)}
                                            <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                                                {st.name}
                                            </span>
                                            {st.clientName && (
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                                                    · {st.clientName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tabular-nums">
                                                {st.temp != null ? `${sign}${st.temp}°C` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
