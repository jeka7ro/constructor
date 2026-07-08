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

    if (loading && !data) return <Loader2 className="w-4 h-4 animate-spin opacity-50 text-slate-500" />;
    if (!data || data.error) return null;

    const getWeatherStyle = (code) => {
        if (code === 0) return { icon: <Sun className="w-7 h-7 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-700/50", text: "text-amber-700 dark:text-amber-400" };
        if ([1, 2].includes(code)) return { icon: <CloudSun className="w-7 h-7 text-sky-500" />, bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-200 dark:border-sky-700/50", text: "text-sky-700 dark:text-sky-400" };
        if (code === 3) return { icon: <Cloud className="w-7 h-7 text-slate-500" />, bg: "bg-slate-50 dark:bg-slate-800/50", border: "border-slate-200 dark:border-slate-700/50", text: "text-slate-700 dark:text-slate-400" };
        if ([45, 48].includes(code)) return { icon: <CloudFog className="w-7 h-7 text-slate-400" />, bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-400" };
        if ([51, 53, 55, 56, 57].includes(code)) return { icon: <CloudDrizzle className="w-7 h-7 text-blue-400" />, bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-700/50", text: "text-blue-700 dark:text-blue-400" };
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: <CloudRain className="w-7 h-7 text-blue-600" />, bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", text: "text-blue-800 dark:text-blue-300" };
        if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: <CloudSnow className="w-7 h-7 text-sky-300" />, bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-200 dark:border-sky-700/50", text: "text-sky-700 dark:text-sky-400" };
        if ([95, 96, 99].includes(code)) return { icon: <CloudLightning className="w-7 h-7 text-purple-600" />, bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-700/50", text: "text-purple-700 dark:text-purple-400" };
        return { icon: <Cloud className="w-7 h-7 text-slate-500" />, bg: "bg-slate-50 dark:bg-slate-800/50", border: "border-slate-200 dark:border-slate-700/50", text: "text-slate-700 dark:text-slate-400" };
    };

    const style = getWeatherStyle(data.code);

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-sm border ${style.bg} ${style.border}`} title={`Max: ${data.maxTemp}°C / Min: ${data.minTemp}°C`}>
            {style.icon}
            <span className={`text-base font-black leading-none ${style.text}`}>{data.maxTemp}°</span>
        </div>
    );
}
