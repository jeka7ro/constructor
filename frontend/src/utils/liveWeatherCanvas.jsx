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
let cachedRadarFrames = null;
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
    if (!force && cachedWeatherStations && cachedWeatherStations.length > 0 && now - cachedWeatherTimestamp < WEATHER_TTL_MS) {
        return cachedWeatherStations;
    }
    if (!cachedWeatherStations) {
        try {
            const raw = localStorage.getItem('pontaj_live_eu_weather_v2');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.stations) && parsed.stations.length > 0 && now - (parsed.ts || 0) < 30 * 60 * 1000) {
                    cachedWeatherStations = parsed.stations;
                    cachedWeatherTimestamp = parsed.ts;
                    if (!force) return cachedWeatherStations;
                }
            }
        } catch (_) {}
    }
    if (liveWeatherInFlight) return liveWeatherInFlight;

    const lats = WEATHER_STATIONS_24.map(s => s.lat.toFixed(4)).join(',');
    const lngs = WEATHER_STATIONS_24.map(s => s.lng.toFixed(4)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto`;

    const fetchFromMetNorwayFallback = async () => {
        // Sample 6 key reference stations across Belgium & surroundings from MET Norway (ECMWF) and interpolate the 24 stations
        const anchors = [
            WEATHER_STATIONS_24[0],  // Bruxelles
            WEATHER_STATIONS_24[1],  // Antwerpen
            WEATHER_STATIONS_24[2],  // Gent
            WEATHER_STATIONS_24[4],  // Liège
            WEATHER_STATIONS_24[9],  // Oostende
            WEATHER_STATIONS_24[11], // Arlon
        ];
        const anchorResults = await Promise.all(
            anchors.map(async (a) => {
                try {
                    const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${a.lat.toFixed(4)}&lon=${a.lng.toFixed(4)}`);
                    const j = await r.json();
                    const ts0 = j?.properties?.timeseries?.[0];
                    const det = ts0?.data?.instant?.details || {};
                    const next1 = ts0?.data?.next_1_hours || ts0?.data?.next_6_hours || {};
                    const sym = String(next1?.summary?.symbol_code || '').toLowerCase();
                    const precip = Number(next1?.details?.precipitation_amount) || 0;
                    const isSnow = sym.includes('snow') || sym.includes('sleet');
                    let wmo = 0;
                    if (sym.includes('thunder')) wmo = 95;
                    else if (isSnow) wmo = 73;
                    else if (sym.includes('rain') || sym.includes('drizzle')) wmo = 61;
                    else if (sym.includes('fog')) wmo = 45;
                    else if (sym.includes('partlycloudy') || sym.includes('fair')) wmo = 2;
                    else if (sym.includes('cloudy')) wmo = 3;
                    return {
                        lat: a.lat,
                        lng: a.lng,
                        temp: det.air_temperature != null ? Number(det.air_temperature) : 7,
                        precipMm: precip,
                        snowCm: isSnow ? precip : 0,
                        cloudCover: Number(det.cloud_area_fraction) || 50,
                        windSpeedKmh: det.wind_speed != null ? Number(det.wind_speed) * 3.6 : 15,
                        windDirDeg: det.wind_from_direction != null ? Number(det.wind_from_direction) : 240,
                        wmo,
                    };
                } catch (_) {
                    return null;
                }
            })
        );
        const validAnchors = anchorResults.filter(Boolean);
        if (validAnchors.length === 0) return cachedWeatherStations || [];

        const enriched = WEATHER_STATIONS_24.map((st) => {
            let wSum = 0, tempSum = 0, precipSum = 0, snowSum = 0, cloudSum = 0, windSpdSum = 0, sinSum = 0, cosSum = 0;
            let nearest = validAnchors[0], minDist = Infinity;
            for (const a of validAnchors) {
                const d2 = (st.lat - a.lat) ** 2 + (st.lng - a.lng) ** 2;
                if (d2 < minDist) { minDist = d2; nearest = a; }
                const w = 1 / Math.max(0.0001, d2);
                wSum += w;
                tempSum += a.temp * w;
                precipSum += a.precipMm * w;
                snowSum += a.snowCm * w;
                cloudSum += a.cloudCover * w;
                windSpdSum += a.windSpeedKmh * w;
                const rad = (a.windDirDeg * Math.PI) / 180;
                sinSum += Math.sin(rad) * w;
                cosSum += Math.cos(rad) * w;
            }
            const precip = Number((precipSum / wSum).toFixed(2));
            const snow = Number((snowSum / wSum).toFixed(2));
            const cloud = Math.round(cloudSum / wSum);
            const night = isNightAtCoords(st.lat, st.lng);
            const dirDeg = ((Math.atan2(sinSum / wSum, cosSum / wSum) * 180) / Math.PI + 360) % 360;
            const wInfo = mapWmoCodeToWeather(nearest.wmo, precip, snow, cloud, night);
            return {
                ...st,
                temp: Math.round(tempSum / wSum),
                precipMm: precip,
                snowCm: snow,
                cloudCover: cloud,
                windSpeedKmh: Math.round(windSpdSum / wSum),
                windDirDeg: Math.round(dirDeg),
                isNight: night,
                ...wInfo,
            };
        });
        cachedWeatherStations = enriched;
        cachedWeatherTimestamp = Date.now();
        try {
            localStorage.setItem('pontaj_live_eu_weather_v2', JSON.stringify({ ts: cachedWeatherTimestamp, stations: enriched }));
        } catch (_) {}
        return enriched;
    };

    liveWeatherInFlight = fetch(url)
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
        .then(payload => {
            if (payload && payload.error) throw new Error(payload.reason || 'Open-Meteo error');
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
            try {
                localStorage.setItem('pontaj_live_eu_weather_v2', JSON.stringify({ ts: cachedWeatherTimestamp, stations: enriched }));
            } catch (_) {}
            return enriched;
        })
        .catch(() => fetchFromMetNorwayFallback())
        .finally(() => {
            liveWeatherInFlight = null;
        });

    return liveWeatherInFlight;
}

export async function fetchRainViewerFrames() {
    const now = Date.now();
    if (cachedRadarFrames && now - cachedRadarTimestamp < RADAR_TTL_MS) {
        return cachedRadarFrames;
    }
    try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) return cachedRadarFrames || [];
        const data = await res.json();
        const past = data?.radar?.past || [];
        if (past.length === 0) return cachedRadarFrames || [];
        const host = data.host || 'https://tilecache.rainviewer.com';
        // Last 6 real Doppler radar frames (1 hour of real radar evolution)
        const recent = past.slice(-6).map(frame => ({
            time: frame.time,
            url: `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
        }));
        cachedRadarFrames = recent;
        cachedRadarUrl = recent[recent.length - 1]?.url || null;
        cachedRadarTimestamp = now;
        return recent;
    } catch {
        return cachedRadarFrames || [];
    }
}

export async function fetchLatestRainViewerUrl() {
    const frames = await fetchRainViewerFrames();
    return frames.length > 0 ? frames[frames.length - 1].url : cachedRadarUrl;
}

/**
 * Inverse-Distance Weighting (IDW) real meteorological field interpolation
 * from the 24 live Open-Meteo stations (real wind vector, real wind speed km/h, real precipitation mm).
 */
function sampleRealMeteorologyAt(lat, lng, stations) {
    if (!stations || stations.length === 0) {
        return { vx: 0.85, vy: -0.32, speedKmh: 14, precipMm: 0, snowCm: 0, isStorm: false };
    }
    let sumVx = 0;
    let sumVy = 0;
    let sumSpeed = 0;
    let sumPrecip = 0;
    let sumSnow = 0;
    let sumW = 0;
    let isStorm = false;

    for (let i = 0; i < stations.length; i++) {
        const s = stations[i];
        const dLat = lat - s.lat;
        const dLng = (lng - s.lng) * 0.64;
        const distSq = dLat * dLat + dLng * dLng + 0.018;
        const w = 1 / (distSq * distSq);
        const moveRad = (((Number(s.windDirDeg) || 240) + 180) * Math.PI) / 180;
        const speed = Math.max(4, Number(s.windSpeedKmh) || 12);
        sumVx += Math.sin(moveRad) * speed * w;
        sumVy += -Math.cos(moveRad) * speed * w;
        sumSpeed += speed * w;
        sumPrecip += (Number(s.precipMm) || 0) * w;
        sumSnow += (Number(s.snowCm) || 0) * w;
        if (s.kind === 'storm' && distSq < 0.25) isStorm = true;
        sumW += w;
    }

    const avgSpeed = sumSpeed / sumW;
    const rawVx = sumVx / sumW;
    const rawVy = sumVy / sumW;
    const mag = Math.hypot(rawVx, rawVy) || 1;
    const pixelSpeed = Math.min(2.6, Math.max(0.55, avgSpeed * 0.068));

    return {
        vx: (rawVx / mag) * pixelSpeed,
        vy: (rawVy / mag) * pixelSpeed,
        speedKmh: avgSpeed,
        precipMm: sumPrecip / sumW,
        snowCm: sumSnow / sumW,
        isStorm,
    };
}

/**
 * Pro Apple Weather / Windy.com Real-Data Atmospheric Streamline & Precipitation Engine:
 * - ZERO fake circles or grey smudges over cities.
 * - High-DPI Retina canvas (devicePixelRatio) rendered smoothly at 60fps.
 * - Silky, tapered multi-point wind streamlines driven 100% by real Open-Meteo wind speed & direction (IDW field).
 * - Stylized Apple Weather slanted rain streaks + micro-splash ripples & snowflakes ONLY where real precipitation > 0.05 mm is falling.
 */
export function startProWeatherCanvasAnimation(map, canvas, getStationsRef) {
    if (!map || !canvas) return () => { };
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const STREAMLINE_COUNT = 115;
    const TRAIL_LENGTH = 15;
    const RAIN_DROP_COUNT = 95;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animId = null;
    let isVisible = true;
    let isMapMoving = false;
    let moveTimeout = null;

    const resizeCanvas = () => {
        const size = map.getSize();
        width = size.x || canvas.parentElement?.clientWidth || 800;
        height = size.y || canvas.parentElement?.clientHeight || 500;
        dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    const createStreamline = (randomAge = true) => {
        const x = Math.random() * (width || 800);
        const y = Math.random() * (height || 500);
        const maxAge = 85 + Math.floor(Math.random() * 75);
        return {
            x,
            y,
            trail: [{ x, y }],
            age: randomAge ? Math.floor(Math.random() * maxAge) : 0,
            maxAge,
            speedKmh: 14,
        };
    };

    const streamlines = Array.from({ length: STREAMLINE_COUNT }, () => createStreamline(true));

    const rainDrops = Array.from({ length: RAIN_DROP_COUNT }, () => ({
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 500),
        z: 0.6 + Math.random() * 0.7,
    }));

    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(entries => {
            if (entries[0]) isVisible = entries[0].isIntersecting;
        });
        io.observe(canvas);
    }

    const getWindColorRgb = (speedKmh) => {
        if (speedKmh >= 32) return '245, 158, 11'; // Strong gusts: warm amber-gold
        if (speedKmh >= 20) return '16, 185, 129'; // Moderate-fresh wind: aqua-emerald
        return '14, 165, 233';                     // Gentle-moderate breeze: vivid sky-cyan
    };

    const renderFrame = () => {
        animId = requestAnimationFrame(renderFrame);
        if (typeof document !== 'undefined' && document.hidden) return;
        if (!isVisible) return;

        ctx.clearRect(0, 0, width, height);
        if (isMapMoving || width <= 0 || height <= 0) return;

        const zoom = map.getZoom();
        if (zoom < 5) return;

        const stations = getStationsRef.current || [];
        if (stations.length === 0) return;

        // 1. Silky Real-Wind Streamlines across the viewport
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < streamlines.length; i++) {
            const p = streamlines[i];
            p.age++;

            if (p.age >= p.maxAge || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) {
                streamlines[i] = createStreamline(false);
                continue;
            }

            const latLng = map.containerPointToLatLng([p.x, p.y]);
            const meteo = sampleRealMeteorologyAt(latLng.lat, latLng.lng, stations);
            p.speedKmh = meteo.speedKmh;

            const wave = Math.sin(p.age * 0.07 + i) * 0.14;
            const nx = p.x + meteo.vx - meteo.vy * wave;
            const ny = p.y + meteo.vy + meteo.vx * wave;

            p.x = nx;
            p.y = ny;
            p.trail.push({ x: nx, y: ny });
            if (p.trail.length > TRAIL_LENGTH) {
                p.trail.shift();
            }

            const len = p.trail.length;
            if (len < 3) continue;

            const lifeRatio = p.age / p.maxAge;
            const lifeAlpha = lifeRatio < 0.18
                ? lifeRatio / 0.18
                : lifeRatio > 0.80
                    ? (1 - lifeRatio) / 0.20
                    : 1;

            const rgb = getWindColorRgb(p.speedKmh);
            const headPt = p.trail[len - 1];
            const tailPt = p.trail[0];

            const grad = ctx.createLinearGradient(tailPt.x, tailPt.y, headPt.x, headPt.y);
            grad.addColorStop(0, `rgba(${rgb}, 0)`);
            grad.addColorStop(0.55, `rgba(${rgb}, ${(0.22 * lifeAlpha).toFixed(3)})`);
            grad.addColorStop(1, `rgba(${rgb}, ${(0.62 * lifeAlpha).toFixed(3)})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = p.speedKmh >= 22 ? 1.85 : 1.45;
            ctx.beginPath();
            ctx.moveTo(tailPt.x, tailPt.y);
            for (let t = 1; t < len - 1; t++) {
                const xc = (p.trail[t].x + p.trail[t + 1].x) * 0.5;
                const yc = (p.trail[t].y + p.trail[t + 1].y) * 0.5;
                ctx.quadraticCurveTo(p.trail[t].x, p.trail[t].y, xc, yc);
            }
            ctx.lineTo(headPt.x, headPt.y);
            ctx.stroke();

            ctx.fillStyle = `rgba(${rgb}, ${(0.72 * lifeAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(headPt.x, headPt.y, p.speedKmh >= 22 ? 1.6 : 1.25, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Real-Time Stylized Precipitation (Slanted Rain Streaks + Splash Ripples / Snowflakes)
        // ONLY where real Open-Meteo telemetry reports active precipitation!
        const hasAnyRealPrecip = stations.some(s => (Number(s.precipMm) || 0) >= 0.05 || (Number(s.snowCm) || 0) > 0);
        if (hasAnyRealPrecip) {
            for (let i = 0; i < rainDrops.length; i++) {
                const d = rainDrops[i];
                const latLng = map.containerPointToLatLng([d.x, d.y]);
                const meteo = sampleRealMeteorologyAt(latLng.lat, latLng.lng, stations);

                if (meteo.precipMm < 0.05 && meteo.snowCm <= 0) {
                    const rainyStations = stations.filter(s => (Number(s.precipMm) || 0) >= 0.05 || (Number(s.snowCm) || 0) > 0);
                    if (rainyStations.length > 0) {
                        const target = rainyStations[i % rainyStations.length];
                        const pt = map.latLngToContainerPoint([target.lat, target.lng]);
                        const spread = Math.max(65, Math.min(180, Math.pow(1.28, zoom - 5) * 42));
                        d.x = pt.x + (Math.random() - 0.5) * spread * 1.8;
                        d.y = pt.y + (Math.random() - 0.5) * spread * 1.8;
                    }
                    continue;
                }

                if (meteo.snowCm > 0) {
                    d.x += meteo.vx * 0.45 + Math.sin(d.y * 0.05 + i) * 0.4;
                    d.y += (1.1 + d.z * 0.8);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, 1.6 * d.z, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    const dropLen = (10 + Math.min(10, meteo.precipMm * 2.5)) * d.z;
                    const windShiftX = meteo.vx * 2.2;
                    const fallSpeedY = (6.5 + d.z * 4.5);

                    const x2 = d.x + windShiftX;
                    const y2 = d.y + dropLen;

                    const rainGrad = ctx.createLinearGradient(d.x, d.y, x2, y2);
                    rainGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
                    rainGrad.addColorStop(1, 'rgba(14, 165, 233, 0.68)');

                    ctx.strokeStyle = rainGrad;
                    ctx.lineWidth = 1.25 * d.z;
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    d.x += windShiftX * 0.45;
                    d.y += fallSpeedY;

                    if (Math.random() < 0.08) {
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
                        ctx.lineWidth = 0.9;
                        ctx.beginPath();
                        ctx.ellipse(x2, y2, 3.2 * d.z, 1.3 * d.z, 0, 0, Math.PI * 2);
                        ctx.stroke();
                        d.y -= 75 + Math.random() * 55;
                    }
                }

                if (d.y > height + 20 || d.x < -20 || d.x > width + 20) {
                    d.x = Math.random() * width;
                    d.y = -10;
                }
            }
        }
    };

    const onMapMoveStart = () => {
        isMapMoving = true;
        if (moveTimeout) clearTimeout(moveTimeout);
    };

    const onMapMoveEnd = () => {
        resizeCanvas();
        for (let i = 0; i < streamlines.length; i++) {
            streamlines[i] = createStreamline(true);
        }
        if (moveTimeout) clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            isMapMoving = false;
        }, 60);
    };

    map.on('movestart zoomstart', onMapMoveStart);
    map.on('moveend zoomend resize', onMapMoveEnd);
    animId = requestAnimationFrame(renderFrame);

    return () => {
        if (animId) cancelAnimationFrame(animId);
        if (moveTimeout) clearTimeout(moveTimeout);
        if (io) io.disconnect();
        try {
            map.off('movestart zoomstart', onMapMoveStart);
            map.off('moveend zoomend resize', onMapMoveEnd);
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
    const workOrdersRef = useRef(workOrders);
    workOrdersRef.current = workOrders;
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

        const currentWorkOrders = workOrdersRef.current;
        const todayOrders = (Array.isArray(currentWorkOrders) ? currentWorkOrders : [])
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
    }, []);

    useEffect(() => {
        updateHudList();
    }, [workOrders, updateHudList]);

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

    // 2. RainViewer Multi-Frame Animated Doppler Radar Layer (maxNativeZoom: 6 prevents RainViewer free-tier placeholder grids at zoom >= 7!)
    useEffect(() => {
        if (!map) return;
        let active = true;
        let radarAnimTimer = null;
        let layers = [];

        const cleanupLayers = () => {
            if (radarAnimTimer) clearInterval(radarAnimTimer);
            layers.forEach(l => {
                try { map.removeLayer(l); } catch (_) { }
            });
            layers = [];
            if (radarLayerRef.current) {
                try { map.removeLayer(radarLayerRef.current); } catch (_) { }
                radarLayerRef.current = null;
            }
        };

        if (!showWeatherFx) {
            cleanupLayers();
            return;
        }

        fetchRainViewerFrames().then(frames => {
            if (!active || !frames || frames.length === 0 || !map) return;
            cleanupLayers();

            // Preload the latest 4 real Doppler radar frames and smoothly cycle through them like Apple Weather radar
            const recentFrames = frames.slice(-4);
            layers = recentFrames.map((frame, idx) => {
                const isLast = idx === recentFrames.length - 1;
                const layer = L.tileLayer(frame.url, {
                    opacity: isLast ? 0.55 : 0,
                    maxNativeZoom: 6,
                    maxZoom: 18,
                    zIndex: 240,
                    className: 'tms-doppler-radar-tile',
                    attribution: 'RainViewer Doppler',
                });
                layer.addTo(map);
                return layer;
            });
            radarLayerRef.current = layers[layers.length - 1] || null;

            if (layers.length > 1) {
                let currentIdx = layers.length - 1;
                radarAnimTimer = setInterval(() => {
                    if (typeof document !== 'undefined' && document.hidden) return;
                    currentIdx = (currentIdx + 1) % layers.length;
                    layers.forEach((l, idx) => {
                        try {
                            l.setOpacity(idx === currentIdx ? 0.55 : 0);
                        } catch (_) { }
                    });
                }, 1400);
            }
        });

        return () => {
            active = false;
            cleanupLayers();
        };
    }, [map, showWeatherFx]);

    // 3. Subtle Pro Weather Canvas Animation (placed at z-[350] BELOW markers at z-[600] so trucks are always 100% crisp!)
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
