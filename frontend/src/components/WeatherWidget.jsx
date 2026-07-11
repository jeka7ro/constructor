import React, { useState, useEffect } from 'react';
import { 
    Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
    CloudRain, CloudSnow, CloudLightning, Loader2 
} from 'lucide-react';

export const weatherCache = {};

export default function WeatherWidget({ lat, lon, dateStr, isLarge = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lat || !lon || !dateStr) return;
        
        // Round to 1 decimal (~11km) to drastically increase cache hits and reduce API calls
        const roundedLat = parseFloat(lat).toFixed(1);
        const roundedLon = parseFloat(lon).toFixed(1);
        const cacheKey = `${roundedLat}_${roundedLon}`;
        const targetDate = dateStr.split('T')[0];

        const processData = (daily) => {
            if (!daily || !daily.time) {
                setData({ error: true });
                return;
            }
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
        const promise = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=30`)
            .then(res => res.json())
            .then(json => {
                if (json.error || !json.daily) {
                    const errObj = { _error: true, _ts: Date.now() };
                    weatherCache[cacheKey] = errObj;
                    return errObj;
                }
                const daily = json.daily;
                weatherCache[cacheKey] = daily;
                return daily;
            })
            .catch(err => {
                const errObj = { _error: true, _ts: Date.now() };
                weatherCache[cacheKey] = errObj;
                return errObj;
            });
            
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
    if (!data || data.error) return null;

    if (!isLarge) {
        const getSmallIcon = (code) => {
            if (code === 0) return <Sun className="w-4 h-4 text-orange-500" />;
            if ([1, 2].includes(code)) return <CloudSun className="w-4 h-4 text-blue-500" />;
            if (code === 3) return <Cloud className="w-4 h-4 text-slate-500" />;
            if ([45, 48].includes(code)) return <CloudFog className="w-4 h-4 text-slate-400" />;
            if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle className="w-4 h-4 text-blue-400" />;
            if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className="w-4 h-4 text-blue-600" />;
            if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-4 h-4 text-sky-300" />;
            if ([95, 96, 99].includes(code)) return <CloudLightning className="w-4 h-4 text-purple-600" />;
            return <Cloud className="w-4 h-4 text-slate-500" />;
        };

        return (
            <div className="flex items-center gap-1 opacity-90" title={`Max: ${data.maxTemp}°C / Min: ${data.minTemp}°C`}>
                {getSmallIcon(data.code)}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-none">{data.maxTemp}°</span>
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
        : `text-[10px] font-bold leading-none ${style.text}`;

    return (
        <div className={wrapperClass} title={`Max: ${data.maxTemp}°C / Min: ${data.minTemp}°C`}>
            {style.icon}
            <span className={textClass}>{data.maxTemp}°</span>
        </div>
    );
}
