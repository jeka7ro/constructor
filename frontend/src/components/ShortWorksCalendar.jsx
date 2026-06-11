import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Hand, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Loader2, AlertTriangle, Edit2, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isSameWeek } from 'date-fns';
import { ro, enUS, nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useTenantStore } from '../store/tenantStore';
import api from '../lib/api';

const weatherCache = {};

function WeatherWidget({ lat, lon, dateStr }) {
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
            if (weatherCache[cacheKey] instanceof Promise) {
                setLoading(true);
                weatherCache[cacheKey].then(daily => {
                    if (daily) processData(daily);
                    setLoading(false);
                });
            } else {
                processData(weatherCache[cacheKey]);
            }
            return;
        }

        setLoading(true);
        const promise = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=30`)
            .then(res => res.json())
            .then(resData => {
                const daily = resData?.daily;
                weatherCache[cacheKey] = daily;
                return daily;
            })
            .catch(() => {
                weatherCache[cacheKey] = null;
                return null;
            });
            
        weatherCache[cacheKey] = promise;
        
        promise.then(daily => {
            if (daily) processData(daily);
            setLoading(false);
        });
    }, [lat, lon, dateStr]);

    if (!lat || !lon || !dateStr) return null;
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

const calculateOrderSand = (wo) => {
    if (!wo.volumes || !Array.isArray(wo.volumes)) return 0;
    let totalKg = 0;
    wo.volumes.forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        if (surface > 0 && thickness > 0) {
            totalKg += surface * thickness * 16;
        }
    });
    return totalKg / 1000;
};

export default function ShortWorksCalendar({ 
    workOrders = [], 
    onOrderRescheduled, 
    onTeamDrop, 
    onClientDrop,
    onTeamDropOnEmpty,
    onClientDropOnEmpty,
    onEmptyCellClick,
    onOrderClick,
    onOrderEdit
}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [syncing, setSyncing] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOrder, setDraggedOrder] = useState(null);
    const [hoveredOrder, setHoveredOrder] = useState(null);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [animatingOrder, setAnimatingOrder] = useState(null);
    const containerRef = useRef(null);
    const { openDialog } = useUIStore();
    const { tenant } = useTenantStore();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const getLocale = () => {
        if (i18n.language?.startsWith('ro')) return ro;
        if (i18n.language?.startsWith('nl')) return nl;
        return enUS;
    };
    const dateLocale = getLocale();

    // Generate week days (Monday to Sunday)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    const isCurrentWeek = isSameWeek(currentDate, new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekLabel = isCurrentWeek 
        ? t('admin_overview.current_week_short', 'Săpt. curentă') 
        : `${format(weekStart, 'dd MMM', { locale: dateLocale })} - ${format(weekEnd, 'dd MMM', { locale: dateLocale })}`;

    // Filter work orders that fall in this week
    const weeklyOrders = useMemo(() => {
        return workOrders.filter(wo => {
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return false;
            try {
                const datePart = dateStr.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                const woDate = new Date(year, month - 1, day, 12, 0, 0);
                return weekDays.some(d => isSameDay(d, woDate));
            } catch (e) {
                return false;
            }
        });
    }, [workOrders, weekDays]);

    const navigateWeek = (dir) => {
        setCurrentDate(prev => addDays(prev, dir * 7));
    };

    const dynamicStartHour = useMemo(() => {
        let earliest = 24;
        weeklyOrders.forEach(wo => {
            if (wo.start_time) {
                const h = parseInt(wo.start_time.split(':')[0], 10);
                if (!isNaN(h) && h < earliest) earliest = h;
            }
        });
        if (earliest === 24) return 7; // Dacă nu există comenzi, afișăm de la 07:00
        if (earliest < 6) return earliest; // Dacă are comenzi la 05:00, afișăm de la 05:00!
        if (earliest > 8) return 8; // Dacă prima e târziu (ex. 10:00), pornim de la 08:00
        return earliest;
    }, [weeklyOrders]);

    const getGridRowFromTime = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 3; // Default
        const [hours] = timeStr.split(':').map(Number);
        if (isNaN(hours)) return 3; // Prevent NaN infinite loop
        const row = hours - dynamicStartHour + 1; // dynamically shift rows
        const finalRow = Math.max(1, Math.min(13, row));
        return isNaN(finalRow) ? 3 : finalRow;
    };

    // Auto-scroll to earliest event
    useEffect(() => {
        if (containerRef.current) {
            let earliestRow = 13;
            let latestRow = 1;
            let hasEvents = false;
            
            weeklyOrders.forEach(wo => {
                const dateStr = wo.start_date || wo.deadline_date;
                if (!dateStr) return;
                try {
                    const datePart = dateStr.split('T')[0];
                    const [year, month, day] = datePart.split('T')[0].split('-').map(Number);
                    const woDate = new Date(year, month - 1, day, 12, 0, 0);
                    if (weekDays.some(d => isSameDay(d, woDate))) {
                        hasEvents = true;
                        const row = getGridRowFromTime(wo.start_time);
                        earliestRow = Math.min(earliestRow, row);
                        latestRow = Math.max(latestRow, row);
                    }
                } catch (e) {}
            });
            
            const targetRow = hasEvents ? Math.max(1, earliestRow - 1) : 2; // scroll a bit above the earliest event, or default 07:00
            const newScrollTop = (targetRow - 1) * 80;
            containerRef.current.scrollTop = newScrollTop;

            if (!hasEvents) {
                setShowScrollHint(false);
            } else {
                // Determine if any events are out of view.
                // clientHeight is usually ~480px, but we check real value with fallback.
                const clientH = containerRef.current.clientHeight || 480;
                const visibleBottom = newScrollTop + clientH;
                
                // Assuming an event takes at least 1 hour (80px)
                const eventsBottom = latestRow * 80;
                
                if (eventsBottom > visibleBottom) {
                    setShowScrollHint(true);
                } else {
                    setShowScrollHint(false);
                }
            }
        }
    }, [weeklyOrders, currentDate]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[800px] relative">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between" style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-white/90" />
                    <h2 className="text-lg font-bold text-white capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                    </h2>
                </div>
                <div className="flex items-center gap-3">

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-blue-500 dark:border-slate-700 shadow-sm">
                    <button onClick={() => navigateWeek(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[110px] text-center">{weekLabel}</span>
                    <button onClick={() => navigateWeek(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    </div>
                </div>
            </div>

            {/* Overlay Badge */}
            {!isScrollable && showScrollHint && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none hidden md:block">
                    <div className="bg-slate-900/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm animate-pulse">
                        <Hand className="w-3.5 h-3.5" />
                        {t('admin_overview.click_to_scroll', 'Click pentru a derula')}
                    </div>
                </div>
            )}

            {/* Calendar Grid Container (Desktop) */}
            <div 
                ref={containerRef}
                className={`flex-1 hidden md:flex relative ${isScrollable ? 'overflow-auto' : 'overflow-hidden cursor-pointer'}`}
                onClick={() => !isScrollable && setIsScrollable(true)}
                onMouseLeave={() => setIsScrollable(false)}
            >
                {/* Time Gutter */}
                <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 sticky left-0 z-20">
                    <div className="h-14 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-900/80 z-20" />
                    {Array.from({ length: 13 }).map((_, i) => (
                        <div key={i} className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-start justify-center text-[10px] text-slate-400 font-medium pt-1">
                            {(i + dynamicStartHour).toString().padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex-1 min-w-[800px]">

                    {/* Header: Days */}
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            let dailySand = 0;
                            weeklyOrders.forEach(wo => {
                                const dateStr = wo.start_date || wo.deadline_date;
                                if (!dateStr) return;
                                try {
                                    const datePart = dateStr.split('T')[0];
                                    const [year, month, d] = datePart.split('-').map(Number);
                                    const woDate = new Date(year, month - 1, d, 12, 0, 0);
                                    if (isSameDay(day, woDate)) {
                                        dailySand += calculateOrderSand(wo);
                                    }
                                } catch (e) {}
                            });
                            const sandDisplay = dailySand > 0 ? `${dailySand.toFixed(1)}T` : '';

                            return (
                                <div key={i} className={`h-14 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 relative ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <span className={`text-[11px] uppercase font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                        {format(day, 'EEE', { locale: dateLocale })}
                                    </span>
                                    <span className={`text-sm font-black leading-none mt-0.5 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {dailySand > 0 && (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mt-0.5" title={t('admin_overview.total_sand_day', 'Total nisip estimat pentru această zi')}>
                                            {sandDisplay}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Events Grid */}
                    <div className="relative grid grid-cols-7 grid-rows-[repeat(13,minmax(80px,80px))] bg-slate-50/30 dark:bg-slate-900/30">
                        {weeklyOrders.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <span className="text-slate-400 text-sm">{t('admin_overview.no_orders_week', 'Nicio comandă în această săptămână')}</span>
                            </div>
                        )}
                        
                        {/* Grid Lines acting as Drop Zones */}
                        {Array.from({ length: 13 * 7 }).map((_, i) => {
                            const dayIndex = i % 7;
                            const hourIndex = Math.floor(i / 7);
                            return (
                                <div 
                                    key={i} 
                                    className={`group relative flex items-center justify-center border-r border-b border-slate-200 dark:border-slate-800/60 transition-colors cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 ${isDragging ? 'hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''}`}
                                    onClick={() => {
                                        if (!isDragging) {
                                            const targetDate = format(weekDays[dayIndex], "yyyy-MM-dd");
                                            const targetTime = `${(hourIndex + dynamicStartHour).toString().padStart(2, '0')}:00`;
                                            if (onEmptyCellClick) {
                                                onEmptyCellClick(targetDate, targetTime);
                                            } else {
                                                navigate(`/admin/work-orders/new?date=${targetDate}&time=${targetTime}`);
                                            }
                                        }
                                    }}
                                    onDragEnter={(e) => e.preventDefault()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                    }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        const type = e.dataTransfer.getData("type");
                                        const targetDate = format(weekDays[dayIndex], "yyyy-MM-dd");
                                        const targetTime = `${(hourIndex + dynamicStartHour).toString().padStart(2, '0')}:00`;

                                        if (type === "team") {
                                            const teamId = e.dataTransfer.getData("id");
                                            if (teamId && typeof onTeamDropOnEmpty === 'function') {
                                                onTeamDropOnEmpty(targetDate, targetTime, teamId);
                                            }
                                            return;
                                        }

                                        if (type === "client") {
                                            const clientId = e.dataTransfer.getData("id");
                                            const clientName = e.dataTransfer.getData("name");
                                            if (clientId && typeof onClientDropOnEmpty === 'function') {
                                                onClientDropOnEmpty(targetDate, targetTime, clientId, clientName);
                                            }
                                            return;
                                        }

                                        const woId = e.dataTransfer.getData("text/plain");
                                        if (!woId || type === "team") return;

                                        const wo = workOrders.find(o => o.id === woId);
                                        if (wo && wo.start_date?.startsWith(targetDate) && wo.start_time === targetTime) return;

                                        setSyncing(true);
                                        try {
                                            await api.put(`/admin/work-orders/${woId}`, {
                                                start_date: targetDate,
                                                start_time: targetTime
                                            });
                                            if (onOrderRescheduled) {
                                                onOrderRescheduled();
                                            } else {
                                                window.location.reload();
                                            }
                                        } catch (error) {
                                            console.error("Eroare la mutare comanda:", error);
                                        } finally {
                                            setSyncing(false);
                                        }
                                    }}
                                >
                                    {!isDragging && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                                            <Plus className="w-5 h-5 text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Events overlay */}
                        {(() => {
                            const renderableOrders = [];
                            const dayOccupancy = {};
                            
                            const sortedOrders = [...weeklyOrders].sort((a, b) => {
                                const tA = a.start_time ? String(a.start_time) : '07:00';
                                const tB = b.start_time ? String(b.start_time) : '07:00';
                                return tA.localeCompare(tB);
                            });
                            
                            sortedOrders.forEach(wo => {
                                const dateStr = wo.start_date || wo.deadline_date;
                                if (!dateStr) return;
                                try {
                                    const datePart = dateStr.split('T')[0];
                                    const [year, month, day] = datePart.split('-').map(Number);
                                    const woDate = new Date(year, month - 1, day, 12, 0, 0);
                                    
                                    const dayIndex = weekDays.findIndex(d => isSameDay(d, woDate));
                                    if (dayIndex === -1) return;
                                    
                                    let rowStart = getGridRowFromTime(wo.start_time);
                                    
                                    if (!dayOccupancy[dayIndex]) dayOccupancy[dayIndex] = new Set();
                                    
                                    while (dayOccupancy[dayIndex].has(rowStart)) {
                                        rowStart++;
                                    }
                                    dayOccupancy[dayIndex].add(rowStart);
                                    
                                    renderableOrders.push({ ...wo, dayIndex, rowStart });
                                } catch (e) {}
                            });
                            
                            return renderableOrders.map(wo => {
                                const colorHex = wo.team?.color || wo.assigned_team_color || '#93c5fd';
                                
                                // Calculate offset to avoid overlap
                                const baseWidthPercent = 100 / 7;
                                const leftPercent = wo.dayIndex * baseWidthPercent;
                                const widthValue = `calc(${baseWidthPercent}% - 8px)`;
                                const isThisDragged = draggedOrder === wo.id;
                                const isCompleted = wo.status === 'completed';

                                return (
                                    <div 
                                        key={wo.id}
                                        draggable={true}
                                        onDragStart={(e) => {
                                            e.stopPropagation();
                                            e.dataTransfer.setData("text/plain", String(wo.id));
                                            e.dataTransfer.setData("type", "workOrder");
                                            e.dataTransfer.effectAllowed = "move";
                                            setTimeout(() => {
                                                setIsDragging(true);
                                                setDraggedOrder(wo.id);
                                            }, 0);
                                        }}
                                        onDragEnd={() => {
                                            setIsDragging(false);
                                            setDraggedOrder(null);
                                        }}
                                        onMouseEnter={() => setHoveredOrder(wo.id)}
                                        onMouseLeave={() => setHoveredOrder(null)}
                                        className={`absolute p-1.5 overflow-hidden rounded-md shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-move mx-1 
                                            ${!wo.assigned_team_id ? 'bg-white dark:bg-slate-900 border-2 border-red-500 border-l-[6px] border-l-red-500' : 'border-l-4'}
                                            ${isThisDragged ? 'opacity-50 ring-2 ring-blue-500' : ''} 
                                            ${syncing ? 'opacity-70 pointer-events-none' : ''} 
                                            ${isDragging && !isThisDragged ? 'pointer-events-none' : ''}
                                            ${animatingOrder === wo.id ? 'ring-4 ring-green-500 bg-green-100 dark:bg-green-900/50 scale-[1.02] z-[60]' : ''}`}
                                        style={{
                                            top: `${(wo.rowStart - 1) * 80 + 4}px`,
                                            height: '72px',
                                            left: `${leftPercent}%`,
                                            width: widthValue,
                                            backgroundColor: !wo.assigned_team_id ? undefined : (isCompleted ? '#f0fdf4' : `${colorHex}30`),
                                            borderLeftColor: !wo.assigned_team_id ? undefined : (isCompleted ? '#22c55e' : colorHex),
                                            borderColor: !wo.assigned_team_id ? undefined : (isCompleted ? '#22c55e' : `${colorHex}50`),
                                            borderWidth: isCompleted ? '2px' : undefined,
                                            borderStyle: isCompleted ? 'dashed' : undefined,
                                            opacity: 1,
                                            zIndex: isThisDragged ? 50 : (10 + (wo._layoutIndex || 0)),
                                            pointerEvents: isDragging ? 'auto' : 'auto' // ensure it can receive drops!
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isDragging) {
                                                if (onOrderClick) onOrderClick(wo);
                                                else navigate(`/admin/work-orders/${wo.id}`);
                                            }
                                        }}
                                        onDragEnter={(e) => e.preventDefault()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.dataTransfer.dropEffect = "move";
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            
                                            // Handle Team Drop
                                            const type = e.dataTransfer.getData("type");
                                            if (type === "team") {
                                                const teamId = e.dataTransfer.getData("id");
                                                if (teamId && onTeamDrop) {
                                                    setAnimatingOrder(wo.id);
                                                    setTimeout(() => setAnimatingOrder(null), 1000);
                                                    onTeamDrop(wo.id, teamId);
                                                }
                                                return;
                                            }

                                            // Handle Client Drop
                                            if (type === "client") {
                                                const clientId = e.dataTransfer.getData("id");
                                                if (clientId && onClientDrop) {
                                                    setAnimatingOrder(wo.id);
                                                    setTimeout(() => setAnimatingOrder(null), 1000);
                                                    onClientDrop(wo.id, clientId);
                                                }
                                                return;
                                            }
                                            
                                            // Handle Work Order Swap
                                            const draggedWoId = e.dataTransfer.getData("text/plain");
                                            if (!draggedWoId || draggedWoId === String(wo.id)) return;
                                            
                                            const draggedWo = workOrders.find(o => String(o.id) === draggedWoId);
                                            if (!draggedWo) return;

                                            const targetDate = wo.start_date || wo.deadline_date;
                                            const targetTime = wo.start_time || '07:00';
                                            
                                            const sourceDate = draggedWo.start_date || draggedWo.deadline_date;
                                            const sourceTime = draggedWo.start_time || '07:00';

                                            setSyncing(true);
                                            try {
                                                // Update dragged order
                                                await api.put(`/admin/work-orders/${draggedWo.id}`, {
                                                    start_date: targetDate,
                                                    start_time: targetTime
                                                });
                                                // Update target order to dragged order's original time
                                                await api.put(`/admin/work-orders/${wo.id}`, {
                                                    start_date: sourceDate,
                                                    start_time: sourceTime
                                                });
                                                
                                                if (onOrderRescheduled) {
                                                    onOrderRescheduled();
                                                } else {
                                                    window.location.reload();
                                                }
                                            } catch (error) {
                                                console.error("Eroare la schimbul de comenzi:", error);
                                            } finally {
                                                setSyncing(false);
                                            }
                                        }}
                                        title={`${wo.title} — trageți pentru a muta`}
                                    >
                                        {!isCompleted && (
                                            <div className={`absolute top-1 right-1 z-10 transition-opacity duration-150 ${hoveredOrder === wo.id && !isDragging ? 'opacity-0' : 'opacity-100'}`}>
                                                <WeatherWidget lat={wo.site_latitude || 50.8503} lon={wo.site_longitude || 4.3517} dateStr={wo.start_date || wo.deadline_date} />
                                            </div>
                                        )}

                                        {hoveredOrder === wo.id && !isDragging && (
                                            <div className="absolute top-1 right-1 flex items-center gap-1 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md shadow-sm p-0.5 border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (onOrderEdit) onOrderEdit(wo);
                                                        else navigate(`/admin/work-orders/${wo.id}/edit`); 
                                                    }}
                                                    className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-500 rounded transition-colors"
                                                    title={t('common.edit', 'Editează')}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setOrderToDelete(wo); }}
                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 text-slate-500 rounded transition-colors"
                                                    title={t('common.delete', 'Șterge')}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}

                                        <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate pr-8 flex items-center gap-1" title={wo.title}>
                                            {wo.status === 'draft' && <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" title="Draft - Incomplet" />}
                                            {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" title="Finalizată" />}
                                            <span className="truncate">{wo.title}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1 truncate pr-8">
                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                <span className="truncate">{wo.client_name || wo.site_name || wo.site_address || t('common.no_location', 'Fără locație')}</span>
                                            </div>
                                            {wo.status === 'completed' && (
                                                <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm bg-emerald-100 text-emerald-700 uppercase tracking-wider shrink-0">
                                                    {t('common.completed', 'Finalizată')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-semibold mt-1 truncate flex items-center justify-between" style={{ color: colorHex }}>
                                            <span>{wo.assigned_team_name || t('common.unassigned', 'Neasignat')}</span>
                                            {calculateOrderSand(wo) > 0 && (
                                                <span className="text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/30 px-1 rounded">
                                                    {calculateOrderSand(wo).toFixed(1)}T
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Calendar List View (Mobile) */}
            <div className="flex-1 overflow-y-auto md:hidden p-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                {weeklyOrders.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                        <span className="text-slate-400 text-sm font-semibold">{t('admin_overview.no_orders_week', 'Nicio comandă în această săptămână')}</span>
                    </div>
                ) : (
                    (() => {
                        const sorted = [...weeklyOrders].sort((a, b) => {
                            const dateA = a.start_date || a.deadline_date || '';
                            const dateB = b.start_date || b.deadline_date || '';
                            if (dateA !== dateB) return String(dateA).localeCompare(String(dateB));
                            const tA = a.start_time ? String(a.start_time) : '07:00';
                            const tB = b.start_time ? String(b.start_time) : '07:00';
                            return tA.localeCompare(tB);
                        });
                        
                        let lastDate = null;
                        
                        return sorted.map(wo => {
                            const dateStr = wo.start_date || wo.deadline_date;
                            const isNewDay = dateStr !== lastDate;
                            lastDate = dateStr;
                            
                            const colorHex = wo.team?.color || '#3b82f6';
                            const parsedDate = dateStr ? new Date(dateStr.split('T')[0]) : null;
                            const isCompleted = wo.status === 'completed';
                            
                            return (
                                <React.Fragment key={wo.id}>
                                    {isNewDay && parsedDate && (
                                        <div className="mt-2 mb-1">
                                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                                {format(parsedDate, 'EEEE, d MMM', { locale: dateLocale })}
                                            </span>
                                        </div>
                                    )}
                                    <div 
                                        className={`relative p-3 rounded-xl border shadow-sm flex flex-col gap-2 cursor-pointer active:scale-[0.98] transition-transform ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-dashed border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                                        style={!isCompleted ? { borderLeft: `4px solid ${colorHex}`, backgroundColor: `${colorHex}15` } : { borderLeft: `4px solid #22c55e` }}
                                        onClick={() => {
                                            if (onOrderClick) onOrderClick(wo);
                                            else navigate(`/admin/work-orders/${wo.id}`);
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-bold text-slate-800 dark:text-white text-sm leading-tight pr-10 flex items-center gap-1.5">
                                                {wo.status === 'draft' && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" title="Draft - Incomplet" />}
                                                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" title="Finalizată" />}
                                                <span>{wo.title}</span>
                                            </div>
                                            {!isCompleted && (
                                                <div className="absolute top-2 right-2">
                                                    <WeatherWidget lat={wo.site_latitude || 50.8503} lon={wo.site_longitude || 4.3517} dateStr={wo.start_date || wo.deadline_date} />
                                                </div>
                                            )}
                                        </div>
                                        {calculateOrderSand(wo) > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md shrink-0">
                                                    {calculateOrderSand(wo).toFixed(1)}T Nisip
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{wo.client_name || wo.site_name || wo.site_address || t('common.no_location', 'Fără locație')}</span>
                                            </div>
                                            {wo.status === 'completed' && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 uppercase tracking-wider shrink-0 ml-2">
                                                    {t('common.completed', 'Finalizată')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold mt-1" style={{ color: colorHex }}>
                                            {wo.assigned_team_name || t('common.unassigned', 'Neasignat')}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        });
                    })()
                )}
            </div>

            {/* Delete Confirmation Popup */}
            {orderToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">{t('admin_overview.delete_order', 'Ștergere Comandă')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                                {t('admin_overview.delete_order_confirm', 'Ești sigur că vrei să ștergi lucrarea')} <span className="font-bold text-slate-700 dark:text-slate-300">"{orderToDelete.title}"</span>?
                            </p>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setOrderToDelete(null)}
                                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors"
                                >
                                    {t('common.cancel', 'Anulează')}
                                </button>
                                <button 
                                    onClick={async () => {
                                        try {
                                            setSyncing(true);
                                            await api.delete(`/admin/work-orders/${orderToDelete.id}`);
                                            if (onOrderRescheduled) onOrderRescheduled();
                                            else window.location.reload();
                                        } catch (e) {
                                            console.error("Eroare la stergere:", e);
                                        } finally {
                                            setSyncing(false);
                                            setOrderToDelete(null);
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.yes_delete', 'Da, șterge')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
