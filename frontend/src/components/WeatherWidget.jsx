import React, { useState, useEffect } from 'react';
import { 
    Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
    CloudRain, CloudSnow, CloudLightning, Loader2 
} from 'lucide-react';

export const weatherCache = {};
const STORAGE_CACHE_KEY = 'pontaj_calendar_weather_v3';
const OPEN_METEO_COOLDOWN_KEY = 'pontaj_open_meteo_429_until';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes persistent cache

// Hydrate in-memory cache from localStorage on load so page refresh makes 0 redundant API calls
try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (raw) {
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed)) {
                if (v && v._ts && (now - v._ts) < CACHE_TTL_MS && !v._error) {
                    weatherCache[k] = v;
                }
            }
        }
    }
} catch (_) {}

const saveWeatherCacheToStorage = (key, val) => {
    try {
        const raw = localStorage.getItem(STORAGE_CACHE_KEY);
        const store = raw ? JSON.parse(raw) : {};
        store[key] = { ...val, _ts: Date.now() };
        // Keep max 40 grid cells
        const keys = Object.keys(store);
        if (keys.length > 40) {
            delete store[keys[0]];
        }
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(store));
    } catch (_) {}
};

const isOpenMeteoOnCooldown = () => {
    try {
        const until = Number(localStorage.getItem(OPEN_METEO_COOLDOWN_KEY) || 0);
        return Date.now() < until;
    } catch (_) {
        return false;
    }
};

const markOpenMeteoCooldown = () => {
    try {
        localStorage.setItem(OPEN_METEO_COOLDOWN_KEY, String(Date.now() + 30 * 60 * 1000));
    } catch (_) {}
};

const mapMetSymbolToWmo = (sym = '') => {
    const s = String(sym).toLowerCase();
    if (s.includes('thunder')) return 95;
    if (s.includes('snow') || s.includes('sleet')) return 73;
    if (s.includes('heavyrain')) return 65;
    if (s.includes('rain') || s.includes('drizzle')) return 61;
    if (s.includes('fog')) return 45;
    if (s.includes('partlycloudy') || s.includes('fair')) return 2;
    if (s.includes('cloudy')) return 3;
    return 0;
};

const convertMetNorwayToOpenMeteoShape = (metJson) => {
    const tsList = metJson?.properties?.timeseries;
    if (!Array.isArray(tsList) || tsList.length === 0) return null;

    const hourlyTime = [];
    const hourlyTemp = [];
    const hourlyCode = [];
    const dailyMap = {};

    for (const entry of tsList) {
        if (!entry?.time) continue;
        // Convert UTC ISO "2026-11-22T14:00:00Z" to local "YYYY-MM-DDTHH:00"
        const dObj = new Date(entry.time);
        const yyyy = dObj.getFullYear();
        const mm = String(dObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dObj.getDate()).padStart(2, '0');
        const hh = String(dObj.getHours()).padStart(2, '0');
        const datePart = `${yyyy}-${mm}-${dd}`;
        const localHourIso = `${datePart}T${hh}:00`;

        const temp = entry.data?.instant?.details?.air_temperature;
        if (temp == null) continue;
        const sym = entry.data?.next_1_hours?.summary?.symbol_code
            || entry.data?.next_6_hours?.summary?.symbol_code
            || entry.data?.next_12_hours?.summary?.symbol_code
            || '';
        const code = mapMetSymbolToWmo(sym);

        hourlyTime.push(localHourIso);
        hourlyTemp.push(temp);
        hourlyCode.push(code);

        if (!dailyMap[datePart]) {
            dailyMap[datePart] = { min: temp, max: temp, code };
        } else {
            dailyMap[datePart].min = Math.min(dailyMap[datePart].min, temp);
            dailyMap[datePart].max = Math.max(dailyMap[datePart].max, temp);
            if (code > dailyMap[datePart].code) dailyMap[datePart].code = code;
        }
    }

    const dailyDates = Object.keys(dailyMap).sort();
    return {
        hourly: {
            time: hourlyTime,
            temperature_2m: hourlyTemp,
            weather_code: hourlyCode,
        },
        daily: {
            time: dailyDates,
            temperature_2m_max: dailyDates.map(d => dailyMap[d].max),
            temperature_2m_min: dailyDates.map(d => dailyMap[d].min),
            weather_code: dailyDates.map(d => dailyMap[d].code),
        }
    };
};

export default function WeatherWidget({ lat, lon, dateStr, isLarge = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lat || !lon || !dateStr) return;
        
        // Snap to 0.25° grid (~25km) so nearby Belgian cities share a single cached forecast
        const roundedLat = (Math.round(parseFloat(lat) * 4) / 4).toFixed(2);
        const roundedLon = (Math.round(parseFloat(lon) * 4) / 4).toFixed(2);
        const cacheKey = `${roundedLat}_${roundedLon}`;
        const hasTime = dateStr.includes('T') && dateStr.split('T')[1].length >= 5;
        const targetDate = dateStr.split('T')[0];
        const targetHourStr = hasTime ? dateStr.substring(0, 13) + ':00' : null; // e.g., "2024-07-14T14:00"

        const processData = (res) => {
            if (!res) {
                setData({ error: true });
                return;
            }
            if (hasTime && res.hourly && res.hourly.time) {
                const index = res.hourly.time.findIndex(t => t === targetHourStr);
                if (index !== -1) {
                    setData({
                        code: res.hourly.weather_code[index],
                        maxTemp: Math.round(res.hourly.temperature_2m[index]),
                        minTemp: Math.round(res.hourly.temperature_2m[index]),
                        isHourly: true
                    });
                    return;
                }
            }
            
            // Fallback to daily
            if (res.daily && res.daily.time) {
                const index = res.daily.time.findIndex(t => t === targetDate);
                if (index !== -1) {
                    setData({
                        code: res.daily.weather_code[index],
                        maxTemp: Math.round(res.daily.temperature_2m_max[index]),
                        minTemp: Math.round(res.daily.temperature_2m_min[index]),
                        isHourly: false
                    });
                    return;
                }
            }
            setData({ error: true });
        };

        if (weatherCache[cacheKey]) {
            if (weatherCache[cacheKey]?._error && (Date.now() - weatherCache[cacheKey]._ts) < 600000) {
                setData({ error: true });
                return;
            }
            if (weatherCache[cacheKey] instanceof Promise) {
                setLoading(true);
                weatherCache[cacheKey].then(daily => {
                    if (daily && !daily._error) processData(daily);
                    else setData({ error: true });
                    setLoading(false);
                });
            } else if (!weatherCache[cacheKey]?._error) {
                processData(weatherCache[cacheKey]);
            } else {
                setData({ error: true });
            }
            return;
        }

        setLoading(true);
        const fetchFromMetNorway = async () => {
            const metRes = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundedLat}&lon=${roundedLon}`).then(r => r.json()).catch(() => null);
            const converted = convertMetNorwayToOpenMeteoShape(metRes);
            if (converted) {
                weatherCache[cacheKey] = converted;
                saveWeatherCacheToStorage(cacheKey, converted);
                return converted;
            }
            const errObj = { _error: true, _ts: Date.now() };
            weatherCache[cacheKey] = errObj;
            return errObj;
        };

        const promise = (isOpenMeteoOnCooldown()
            ? fetchFromMetNorway()
            : fetch(`https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&past_days=7`)
                .then(res => {
                    if (res.status === 429) markOpenMeteoCooldown();
                    return res.json();
                })
                .then(async json => {
                    if (json && !json.error && (json.daily || json.hourly)) {
                        weatherCache[cacheKey] = json;
                        saveWeatherCacheToStorage(cacheKey, json);
                        return json;
                    }
                    markOpenMeteoCooldown();
                    return fetchFromMetNorway();
                })
                .catch(() => fetchFromMetNorway())
        );
            
        weatherCache[cacheKey] = promise;
        promise.then(result => {
            if (result && !result._error) {
                processData(result);
            } else {
                setData({ error: true });
            }
            setLoading(false);
        });
    }, [lat, lon, dateStr]);

    if (loading && !data) return <Loader2 className="w-4 h-4 animate-spin opacity-50 text-slate-500" />;
    if (!data || data.error) return (
        <div className="flex items-center gap-0.5 opacity-50" title="Vreme indisponibilă">
            <Cloud className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 leading-none">--°</span>
        </div>
    );

    if (!isLarge) {
        const getSmallIcon = (code) => {
            if (code === 0) return <Sun className="w-3 h-3 text-orange-500" />;
            if ([1, 2].includes(code)) return <CloudSun className="w-3 h-3 text-blue-500" />;
            if (code === 3) return <Cloud className="w-3 h-3 text-slate-500" />;
            if ([45, 48].includes(code)) return <CloudFog className="w-3 h-3 text-slate-400" />;
            if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle className="w-3 h-3 text-blue-400" />;
            if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className="w-3 h-3 text-blue-600" />;
            if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-3 h-3 text-sky-300" />;
            if ([95, 96, 99].includes(code)) return <CloudLightning className="w-3 h-3 text-purple-600" />;
            return <Cloud className="w-3 h-3 text-slate-500" />;
        };

        return (
            <div className="flex items-center gap-0.5 opacity-90" title={data.isHourly ? `Temp la ora lucrării: ${data.maxTemp}°C` : `Max: ${data.maxTemp}°C / Min: ${data.minTemp}°C`}>
                {getSmallIcon(data.code)}
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none">{data.maxTemp}°</span>
            </div>
        );
    }

    const getWeatherStyle = (code) => {
        const iconSize = isLarge ? "w-7 h-7" : "w-4 h-4";
        if (code === 0) return { icon: <Sun className={`${iconSize} text-amber-500`} />, bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400" };
        if ([1, 2].includes(code)) return { icon: <CloudSun className={`${iconSize} text-sky-500`} />, bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-400" };
        if (code === 3) return { icon: <Cloud className={`${iconSize} text-slate-500`} />, bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-700 dark:text-slate-400" };
        if ([45, 48].includes(code)) return { icon: <CloudFog className={`${iconSize} text-slate-400`} />, bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" };
        if ([51, 53, 55, 56, 57].includes(code)) return { icon: <CloudDrizzle className={`${iconSize} text-blue-400`} />, bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400" };
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: <CloudRain className={`${iconSize} text-blue-600`} />, bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300" };
        if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: <CloudSnow className={`${iconSize} text-sky-300`} />, bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-400" };
        if ([95, 96, 99].includes(code)) return { icon: <CloudLightning className={`${iconSize} text-purple-600`} />, bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400" };
        return { icon: <Cloud className={`${iconSize} text-slate-500`} />, bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-700 dark:text-slate-400" };
    };

    const style = getWeatherStyle(data.code);

    const wrapperClass = isLarge 
        ? `flex items-center gap-1.5 opacity-90` 
        : `flex items-center gap-1 opacity-90`; // no padding, no background

    const textClass = isLarge 
        ? `text-sm font-bold leading-none text-slate-800 dark:text-white` 
        : `text-[11px] font-extrabold leading-none tabular-nums ${style.text}`;

    return (
        <div className={wrapperClass} title={`Max: ${data.maxTemp}°C / Min: ${data.minTemp}°C`}>
            {style.icon}
            <span className={textClass}>{data.maxTemp}°</span>
        </div>
    );
}
