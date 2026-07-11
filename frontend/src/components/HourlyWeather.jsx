import React, { useState, useEffect, useRef } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Loader2, Droplets, Wind, Thermometer, X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const weatherCache = {};

export default function HourlyWeather({ lat, lon, dateStr, address, orderTime, compact, inline }) {
    const { t } = useTranslation();
    const [hourlyData, setHourlyData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!lat || !lon || !dateStr) {
            setError(true);
            return;
        }

        const targetDate = dateStr.split('T')[0];
        // Round to 1 decimal (~11km) to drastically increase cache hits and reduce API calls
        const roundedLat = parseFloat(lat).toFixed(1);
        const roundedLon = parseFloat(lon).toFixed(1);
        const cacheKey = `hourly_${roundedLat}_${roundedLon}_${targetDate}`;

        const targetHour = orderTime ? parseInt(orderTime.split(':')[0], 10) : 8;

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
                
                if (datePart === targetDate && hourNum >= targetHour && hourNum < targetHour + 6) {
                    const prob = hourly.precipitation_probability 
                                ? hourly.precipitation_probability[i] 
                                : (hourly.precipitation && hourly.precipitation[i] > 0 ? 100 : 0);
                    filtered.push({
                        time: hourStr,
                        temp: Math.round(hourly.temperature_2m[i]),
                        precipProb: prob,
                        code: hourly.weather_code[i],
                        humidity: hourly.relative_humidity_2m ? Math.round(hourly.relative_humidity_2m[i]) : null,
                        wind: hourly.wind_speed_10m ? Math.round(hourly.wind_speed_10m[i]) : null,
                        feelsLike: hourly.apparent_temperature ? Math.round(hourly.apparent_temperature[i]) : Math.round(hourly.temperature_2m[i])
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
            if (weatherCache[cacheKey]?._error && (Date.now() - weatherCache[cacheKey]._ts) < 600000) {
                setError(true);
                return;
            }
            if (weatherCache[cacheKey] instanceof Promise) {
                setLoading(true);
                weatherCache[cacheKey].then(res => {
                    if (res && !res._error) processData(res);
                    else setError(true);
                    setLoading(false);
                });
            } else if (!weatherCache[cacheKey]?._error) {
                processData(weatherCache[cacheKey]);
            } else {
                setError(true);
            }
            return;
        }

        setLoading(true);
        const dateObj = new Date(targetDate);
        const today = new Date();
        const diffDays = (today - dateObj) / (1000 * 60 * 60 * 24);
        
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&hourly=temperature_2m,precipitation_probability,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
        if (diffDays > 80) {
            url = `https://archive-api.open-meteo.com/v1/archive?latitude=${roundedLat}&longitude=${roundedLon}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&timezone=auto`;
        }
        
        const promise = fetch(url)
            .then(res => res.json())
            .then(resData => {
                if (resData.error || !resData.hourly) {
                    const errObj = { _error: true, _ts: Date.now() };
                    weatherCache[cacheKey] = errObj;
                    return errObj;
                }
                const h = resData.hourly;
                weatherCache[cacheKey] = h;
                return h;
            })
            .catch(() => {
                const errObj = { _error: true, _ts: Date.now() };
                weatherCache[cacheKey] = errObj;
                return errObj;
            });
            
        weatherCache[cacheKey] = promise;
        promise.then(res => {
            if (res && !res._error) {
                processData(res);
            } else {
                setError(true);
            }
            setLoading(false);
        });

    }, [lat, lon, dateStr]);

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

    if (!lat || !lon || !dateStr) return null;

    if (inline) {
        if (loading || error || !hourlyData) return null;
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/50 dark:bg-slate-800/50 border border-blue-100/50 dark:border-slate-700/50 rounded-full shadow-sm">
                {getIcon(hourlyData[0]?.code, "w-4 h-4")}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{hourlyData[0]?.temp}°</span>
            </div>
        );
    }
    
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
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('weather.no_data', 'Date meteo indisponibile pentru')} {dateStr.split('T')[0]}</p>
            </div>
        );
    }



    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden ${compact ? 'p-3' : 'p-5'}`}>
            {/* Top part: Current / Order Hour */}
            <div className={`flex justify-between items-start ${compact ? 'mb-2' : 'mb-4'}`}>
                <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-orange-400"/> {t('weather.location', 'Vremea la locație')}
                    </div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 truncate max-w-[200px] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0"/>
                        <span className="truncate">{address?.split(',')[0] || t('weather.no_location', 'Locație nespecificată')}</span>
                    </div>
                    <div className={`${compact ? 'text-4xl' : 'text-5xl'} font-extralight tracking-tighter text-slate-900 dark:text-white mt-1`}>
                        {hourlyData[0]?.temp}°
                    </div>
                    <div className={`text-xs font-semibold text-blue-600 dark:text-blue-400 ${compact ? 'mt-1' : 'mt-2'} uppercase tracking-wide`}>
                        {t('weather.start', 'Start')}: {orderTime ? orderTime.substring(0,5) : '08:00'}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    {getIcon(hourlyData[0]?.code, compact ? "w-8 h-8 mb-1" : "w-10 h-10 mb-2")}
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {t('weather.feels_like', 'Ressenti')} {hourlyData[0]?.feelsLike}°
                    </div>
                </div>
            </div>

            <div className={`text-[11px] font-medium text-slate-500 dark:text-slate-400 flex justify-between ${compact ? 'mb-3' : 'mb-5'}`}>
                <span>{t('weather.wind', 'Vent')}: {hourlyData[0]?.wind} km/h</span>
                <span>{t('weather.humidity', 'Humidité')}: {hourlyData[0]?.humidity}%</span>
            </div>

            {/* Bottom part: Next 5-6 hours */}
            <div className="flex justify-between items-center w-full mt-auto">
                {hourlyData.map((hour, idx) => {
                    const isCold = hour.temp < 5;
                    const isHot = hour.temp > 28;
                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 relative">
                            <span className={`text-[10px] font-bold ${idx === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {idx === 0 ? 'Start' : hour.time.split(':')[0]}
                            </span>
                            
                            <div className="relative">
                                {getIcon(hour.code, "w-6 h-6")}
                                {hour.precipProb > 0 && (
                                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-500 whitespace-nowrap">
                                        {hour.precipProb}%
                                    </span>
                                )}
                            </div>
                            
                            <span className={`text-xs font-bold mt-2 ${isCold ? 'text-blue-600' : isHot ? 'text-orange-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                {hour.temp}°
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
