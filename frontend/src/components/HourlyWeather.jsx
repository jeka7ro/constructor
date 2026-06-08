import React, { useState, useEffect } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Loader2, Droplets } from 'lucide-react';

const weatherCache = {};

export default function HourlyWeather({ lat, lon, dateStr }) {
    const [hourlyData, setHourlyData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!lat || !lon || !dateStr) {
            setError(true);
            return;
        }

        const targetDate = dateStr.split('T')[0];
        const cacheKey = `hourly_${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}_${targetDate}`;

        const processData = (hourly) => {
            if (!hourly || !hourly.time) {
                setError(true);
                return;
            }
            
            // Filter only hours between 06:00 and 19:00 for the target date
            const filtered = [];
            hourly.time.forEach((t, i) => {
                const hourStr = t.split('T')[1];
                const datePart = t.split('T')[0];
                const hourNum = parseInt(hourStr.split(':')[0], 10);
                
                if (datePart === targetDate && hourNum >= 6 && hourNum <= 19) {
                    const prob = hourly.precipitation_probability 
                                ? hourly.precipitation_probability[i] 
                                : (hourly.precipitation && hourly.precipitation[i] > 0 ? 100 : 0);
                    filtered.push({
                        time: hourStr,
                        temp: Math.round(hourly.temperature_2m[i]),
                        precipProb: prob,
                        code: hourly.weather_code[i]
                    });
                }
            });
            
            if (filtered.length > 0) {
                setHourlyData(filtered);
                setError(false);
            } else {
                setError(true);
            }
        };

        if (weatherCache[cacheKey]) {
            if (weatherCache[cacheKey] instanceof Promise) {
                setLoading(true);
                weatherCache[cacheKey].then(res => {
                    if (res) processData(res);
                    setLoading(false);
                });
            } else {
                processData(weatherCache[cacheKey]);
            }
            return;
        }

        setLoading(true);
        const dateObj = new Date(targetDate);
        const today = new Date();
        const diffDays = (today - dateObj) / (1000 * 60 * 60 * 24);
        
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
        if (diffDays > 80) {
            url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m,precipitation,weather_code&timezone=auto`;
        }
        
        const promise = fetch(url)
            .then(res => res.json())
            .then(resData => {
                const h = resData?.hourly;
                weatherCache[cacheKey] = h;
                return h;
            })
            .catch(() => {
                weatherCache[cacheKey] = null;
                return null;
            });
            
        weatherCache[cacheKey] = promise;
        promise.then(res => {
            processData(res);
            setLoading(false);
        });

    }, [lat, lon, dateStr]);

    if (!lat || !lon || !dateStr) return null;
    
    if (loading && !hourlyData) {
        return (
            <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }
    
    if (error || !hourlyData) {
        return (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center">
                <CloudSun className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Date meteo indisponibile pentru {dateStr.split('T')[0]}</p>
            </div>
        );
    }

    const getIcon = (code, className="w-5 h-5") => {
        if (code === 0) return <Sun className={`${className} text-orange-500`} />;
        if ([1, 2].includes(code)) return <CloudSun className={`${className} text-blue-500`} />;
        if (code === 3) return <Cloud className={`${className} text-slate-500`} />;
        if ([45, 48].includes(code)) return <CloudFog className={`${className} text-slate-400`} />;
        if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle className={`${className} text-blue-400`} />;
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className={`${className} text-blue-600`} />;
        if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className={`${className} text-sky-300`} />;
        if ([95, 96, 99].includes(code)) return <CloudLightning className={`${className} text-purple-600`} />;
        return <Cloud className={`${className} text-slate-500`} />;
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-blue-100/50 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Prognoză Meteo Detaliată ({dateStr.split('T')[0]})</h2>
                </div>
            </div>
            <div className="p-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 min-w-max">
                    {hourlyData.map((hour, idx) => {
                        const isRainy = hour.precipProb >= 30;
                        const isCold = hour.temp < 5;
                        const isHot = hour.temp > 28;
                        
                        return (
                            <div key={idx} className="flex flex-col items-center bg-white dark:bg-slate-700 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-600 min-w-[70px] hover:-translate-y-1 transition-transform">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{hour.time}</span>
                                
                                <div className="mb-2">
                                    {getIcon(hour.code, "w-7 h-7")}
                                </div>
                                
                                <span className={`text-base font-black ${isCold ? 'text-blue-600' : isHot ? 'text-orange-600' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {hour.temp}°
                                </span>
                                
                                <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isRainy ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-400'}`}>
                                    <Droplets className="w-2.5 h-2.5" />
                                    <span>{hour.precipProb}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
