import React, { useState, useEffect } from 'react';
import { 
    Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
    CloudRain, CloudSnow, CloudLightning, Loader2 
} from 'lucide-react';

export const weatherCache = {};

export default function WeatherWidget({ lat, lon, dateStr }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lat || !lon || !dateStr) return;
        
        const cacheKey = `${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;
        const targetDate = dateStr.split('T')[0];

        const processData = (daily) => {
            const index = daily.time.findIndex(t => t === targetDate);
            if (index !== -1) {
                setData({
                    code: daily.weather_code[index],
                    maxTemp: Math.round(daily.temperature_2m_max[index]),
                    minTemp: Math.round(daily.temperature_2m_min[index])
                });
            } else {
                setData({ error: true });
            }
        };

        if (weatherCache[cacheKey]) {
            // Skip if cached error is less than 10 minutes old
            if (weatherCache[cacheKey]?._error && (Date.now() - weatherCache[cacheKey]._ts) < 600000) {
                return;
            }
            if (weatherCache[cacheKey] instanceof Promise) {
                setLoading(true);
                weatherCache[cacheKey].then(daily => {
                    if (daily) processData(daily);
                    setLoading(false);
                });
            } else if (!weatherCache[cacheKey]?._error) {
                processData(weatherCache[cacheKey]);
            }
            return;
        }

        setLoading(true);
        const promise = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=30`)
            .then(res => res.json())
            .then(json => {
                const daily = json.daily;
                weatherCache[cacheKey] = daily;
                return daily;
            })
            .catch(err => {
                weatherCache[cacheKey] = { _error: true, _ts: Date.now() };
                return null;
            });
            
        weatherCache[cacheKey] = promise;
        promise.then(daily => {
            if (daily) processData(daily);
            setLoading(false);
        });
    }, [lat, lon, dateStr]);

    if (loading && !data) return <Loader2 className="w-3 h-3 animate-spin opacity-50 text-slate-500" />;
    if (!data || data.error) return null;

    const getIcon = (code) => {
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
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700" title={`Max: ${data.maxTemp}°C / Min: ${data.minTemp}°C`}>
            {getIcon(data.code)}
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-none">{data.maxTemp}°</span>
        </div>
    );
}
