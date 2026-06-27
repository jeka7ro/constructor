import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Hand, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Loader2, AlertTriangle, Edit2, Trash2, Plus, CheckCircle2, Maximize2, Minimize2, Truck, Building2, Star } from 'lucide-react';
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
            .then(resData => {
                const daily = resData?.daily;
                weatherCache[cacheKey] = daily;
                return daily;
            })
            .catch(() => {
                weatherCache[cacheKey] = { _error: true, _ts: Date.now() };
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
    // 1. Check materials for explicit sand
    if (wo.materials && Array.isArray(wo.materials)) {
        let matSandKg = 0;
        wo.materials.forEach(m => {
            if (m.name && m.name.toLowerCase().includes('nisip')) {
                let q = parseFloat(m.quantity) || 0;
                if (m.unit && m.unit.toLowerCase().startsWith('t')) q *= 1000;
                matSandKg += q;
            }
        });
        if (matSandKg > 0) return matSandKg / 1000;
    }

    let totalKg = 0;
    // 2. Check volumes
    if (wo.volumes && Array.isArray(wo.volumes)) {
        wo.volumes.forEach(vol => {
            const surface = parseFloat(vol.quantity) || 0;
            const thickness = parseFloat(vol.thickness) || 0;
            if (surface > 0 && thickness > 0) {
                totalKg += surface * thickness * 16;
            }
        });
    }

    // 3. Check legacy surface_area/thickness fields
    if (totalKg === 0) {
        const fallbackSurface = parseFloat(wo.surface_area) || parseFloat(wo.surface) || 0;
        const fallbackThick = parseFloat(wo.thickness) || 0;
        if (fallbackSurface > 0 && fallbackThick > 0) {
            totalKg = fallbackSurface * fallbackThick * 16;
        }
    }

    // 4. Ultimate fallback: try to extract area from title (e.g. "93 m2 - Chape") assuming 5cm thickness
    if (totalKg === 0 && wo.title) {
        const titleAreaMatch = wo.title.match(/(\d+(?:[.,]\d+)?)\s*m/i);
        if (titleAreaMatch) {
            const extractedSurface = parseFloat(titleAreaMatch[1].replace(',', '.'));
            if (extractedSurface > 0) {
                totalKg = extractedSurface * 0.05 * 16; // assume 5cm
            }
        }
    }

    return totalKg / 1000;
};

export default function ShortWorksCalendar({ 
    isCalendarFull,
    toggleCalendarFullscreen,
    workOrders = [], 
    teams = [],
    clients = [],
    onOrderRescheduled, 
    onTeamDrop, 
    onClientDrop,
    onTeamDropOnEmpty,
    onClientDropOnEmpty,
    onEmptyCellClick,
    onOrderClick,
    onOrderEdit,
    onOrderComplete
}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [syncing, setSyncing] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const hasAutoScrolled = useRef(false); // prevent re-jumping on data refresh
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOrder, setDraggedOrder] = useState(null);
    const [hoveredOrder, setHoveredOrder] = useState(null);
    const [hoveredDay, setHoveredDay] = useState(null);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [animatingOrder, setAnimatingOrder] = useState(null);
    const containerRef = useRef(null);
    const { openDialog } = useUIStore();
    const { tenant } = useTenantStore();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [completing, setCompleting] = useState(null);

    const handleComplete = async (wo, e) => {
        e.stopPropagation();
        if (completing) return;
        setCompleting(wo.id);
        try {
            await api.put(`/admin/work-orders/${wo.id}`, { status: 'completed' });
            if (onOrderComplete) onOrderComplete();
            else if (onOrderRescheduled) onOrderRescheduled();
            else window.location.reload();
        } catch (err) {
            console.error('Eroare finalizare:', err);
        } finally {
            setCompleting(null);
        }
    };
    const handleCompleteDay = async (day, e) => {
        e.stopPropagation();
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOrders = weeklyOrders.filter(wo => {
            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
            return ds === dayStr && wo.status !== 'completed';
        });
        if (!dayOrders.length) return;
        setSyncing(true);
        try {
            await Promise.all(dayOrders.map(wo =>
                api.put(`/admin/work-orders/${wo.id}`, { status: 'completed' })
            ));
            if (onOrderComplete) onOrderComplete();
            else if (onOrderRescheduled) onOrderRescheduled();
            else window.location.reload();
        } catch (err) {
            console.error('Eroare finalizare zi:', err);
        } finally {
            setSyncing(false);
        }
    };

    const handleUncomplete = async (wo, e) => {
        e.stopPropagation();
        try {
            await api.put(`/admin/work-orders/${wo.id}`, { status: 'confirmed' });
            if (onOrderComplete) onOrderComplete();
            else if (onOrderRescheduled) onOrderRescheduled();
            else window.location.reload();
        } catch (err) {
            console.error('Eroare revenire status:', err);
        }
    };

    const handleUnCompleteDay = async (day, e) => {
        e.stopPropagation();
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOrders = weeklyOrders.filter(wo => {
            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
            return ds === dayStr && wo.status === 'completed';
        });
        if (!dayOrders.length) return;
        setSyncing(true);
        try {
            await Promise.all(dayOrders.map(wo =>
                api.put(`/admin/work-orders/${wo.id}`, { status: 'confirmed' })
            ));
            if (onOrderComplete) onOrderComplete();
            else if (onOrderRescheduled) onOrderRescheduled();
            else window.location.reload();
        } catch (err) {
            console.error('Eroare revenire status zi:', err);
        } finally {
            setSyncing(false);
        }
    };


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

    const END_HOUR = 21; // Calendar ends at 21:00

    const getGridRowFromTime = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 3;
        const [hours] = timeStr.split(':').map(Number);
        if (isNaN(hours)) return 3;
        const row = hours - dynamicStartHour + 1;
        const numRows = END_HOUR - dynamicStartHour;
        const finalRow = Math.max(1, Math.min(numRows, row));
        return isNaN(finalRow) ? 3 : finalRow;
    };

    // Auto-scroll to earliest event — only once per week change, not on every data refresh
    useEffect(() => {
        hasAutoScrolled.current = false; // reset when week changes
    }, [currentDate]);

    useEffect(() => {
        if (containerRef.current && !hasAutoScrolled.current && weeklyOrders.length > 0) {
            let earliestRow = END_HOUR - dynamicStartHour;
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
            
            if (hasEvents) {
                const targetRow = Math.max(1, earliestRow - 1);
                const newScrollTop = (targetRow - 1) * 70;
                containerRef.current.scrollTop = newScrollTop;
                hasAutoScrolled.current = true;

                const clientH = containerRef.current.clientHeight || 480;
                const visibleBottom = newScrollTop + clientH;
                const eventsBottom = latestRow * 70;
                setShowScrollHint(eventsBottom > visibleBottom);
            } else {
                setShowScrollHint(false);
            }
        }
    }, [weeklyOrders, currentDate]);

    const [swipeDir, setSwipeDir] = useState(0); // -1 left, 1 right
    const [swipePhase, setSwipePhase] = useState('idle'); // idle | exit | enter
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
    const [dragOffset, setDragOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const onTouchStart = (e) => {
        setTouchEnd({ x: null, y: null });
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e) => {
        if (!touchStart.x) return;
        const currentX = e.targetTouches[0].clientX;
        const currentY = e.targetTouches[0].clientY;
        const diffX = currentX - touchStart.x;
        const diffY = currentY - touchStart.y;
        
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
            // Block vertical page scroll during horizontal swipe
            e.preventDefault();
            setIsSwiping(true);
            setDragOffset(diffX);
        }
        setTouchEnd({ x: currentX, y: currentY });
    };

    const onTouchEndEvent = () => {
        if (!touchStart.x || !touchEnd.x) {
            setIsSwiping(false);
            setDragOffset(0);
            return;
        }
        
        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const minSwipeDistance = 60;
        
        if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
            const direction = distanceX > 0 ? 1 : -1; // 1 = next, -1 = prev
            setIsSwiping(false);
            setDragOffset(0);
            // Phase 1: slide out
            setSwipeDir(direction);
            setSwipePhase('exit');
            setTimeout(() => {
                navigateWeek(direction);
                setSwipePhase('enter');
                // Phase 2: slide in from opposite
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setSwipePhase('idle');
                        setSwipeDir(0);
                    });
                });
            }, 220);
        } else {
            setIsSwiping(false);
            setDragOffset(0);
        }
    };

    const calendarSwipeRef = useRef(null);

    // Attach non-passive touchmove so preventDefault() blocks page scroll
    useEffect(() => {
        const el = calendarSwipeRef.current;
        if (!el) return;
        const handler = (e) => onTouchMove(e);
        el.addEventListener('touchmove', handler, { passive: false });
        return () => el.removeEventListener('touchmove', handler);
    });

    return (
        <div 
            ref={calendarSwipeRef}
            className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative ${isCalendarFull ? 'h-full' : 'h-[800px]'}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEndEvent}
        >
            {/* Header */}
            <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 shrink-0" style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}>
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-white/90" />
                        <h2 className="text-lg font-bold text-white capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {toggleCalendarFullscreen && (
                            <button 
                                onClick={toggleCalendarFullscreen} 
                                className="bg-white dark:bg-slate-800 px-2.5 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center"
                                title={isCalendarFull ? 'Ieși din fullscreen (ESC)' : 'Calendar Fullscreen'}
                            >
                                {isCalendarFull
                                    ? <Minimize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                    : <Maximize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                }
                            </button>
                        )}
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

                {isCalendarFull && (
                    <div className="px-4 pb-3 flex items-center gap-6 overflow-x-auto custom-scrollbar">
                        {/* Echipe */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black text-white/70 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1"><Truck className="w-3.5 h-3.5"/> {t('admin_overview.trucks_teams', 'Équipes')}</span>
                            <div className="flex gap-2 items-center">
                                {teams?.map(team => (
                                    <div 
                                        key={team.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("type", "team")
                                            e.dataTransfer.setData("id", String(team.id))
                                        }}
                                        className="px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold cursor-grab active:cursor-grabbing hover:scale-105 transition-transform whitespace-nowrap flex items-center gap-1.5"
                                        style={{ backgroundColor: team.color || '#3b82f6', color: 'white' }}
                                    >
                                        <Truck className="w-3 h-3 shrink-0" />
                                        {team.name.replace(/^echipa\s*/i, '')}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Divizor */}
                        <div className="w-px h-6 bg-white/20 shrink-0"></div>

                        {/* Clienti */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black text-white/70 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1"><Building2 className="w-3.5 h-3.5"/> {t('admin_overview.frequent_clients', 'Clients')}</span>
                            <div className="flex gap-2 items-center">
                                {clients?.filter(c => c.is_favorite).map(client => (
                                    <div 
                                        key={`fav-${client.id}`}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("type", "client")
                                            e.dataTransfer.setData("id", String(client.id))
                                            e.dataTransfer.setData("name", client.name)
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg shadow-sm text-xs font-bold cursor-grab active:cursor-grabbing hover:scale-105 transition-transform whitespace-nowrap flex items-center gap-1.5"
                                        style={{ 
                                            backgroundColor: tenant?.primary_color || '#2563eb',
                                            color: 'white',
                                            border: '2px solid white'
                                        }}
                                    >
                                        <Star className="w-3 h-3 shrink-0 fill-white" />
                                        {client.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
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

            {/* Calendar Swipe Animation Wrapper */}
            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">

                <div 
                    className="flex-1 flex flex-col w-full h-full relative z-10" 
                    style={{ 
                        transform: isSwiping 
                            ? `translateX(${dragOffset * 0.4}px)` 
                            : swipePhase === 'exit' 
                                ? `translateX(${swipeDir * -60}px)` 
                                : swipePhase === 'enter' 
                                    ? `translateX(${swipeDir * 60}px)` 
                                    : 'translateX(0)',
                        opacity: swipePhase === 'exit' || swipePhase === 'enter' ? 0 : 1,
                        filter: swipePhase === 'exit' || swipePhase === 'enter' ? 'blur(2px)' : 'blur(0px)',
                        transition: isSwiping 
                            ? 'none' 
                            : 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, filter 0.22s ease',
                    }}
                >

            {/* Calendar Grid Container (Desktop) */}
            <div 
                ref={containerRef}
                className="flex-1 hidden md:flex relative overflow-auto"
            >
                {/* Time Gutter */}
                <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 sticky left-0 z-20">
                    <div className="h-14 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-900/80 z-20" />
                    {Array.from({ length: END_HOUR - dynamicStartHour }).map((_, i) => (
                        <div key={i} className="h-[70px] border-b border-slate-200 dark:border-slate-800 flex items-start justify-center text-[10px] text-slate-400 font-medium pt-1">
                            {(i + dynamicStartHour).toString().padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex-1 min-w-[800px]">

                    {/* Header: Days */}
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-30">
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
                                <div
                                    key={i}
                                    className={`h-14 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 relative ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                    onMouseEnter={() => setHoveredDay(i)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    onDoubleClick={(e) => handleUnCompleteDay(day, e)}
                                >
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
                                    {hoveredDay === i && (() => {
                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const dayOrders = weeklyOrders.filter(wo => {
                                            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
                                            return ds === dayStr;
                                        });
                                        const allDone = dayOrders.length > 0 && dayOrders.every(wo => wo.status === 'completed');
                                        return (
                                            <button
                                                onClick={(e) => allDone ? handleUnCompleteDay(day, e) : handleCompleteDay(day, e)}
                                                className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full text-white shadow-sm transition-colors ${allDone ? 'bg-emerald-600 hover:bg-slate-500' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                                title={allDone ? 'Anulează finalizare zi' : 'Finalizează toate comenzile din această zi'}
                                            >
                                                <CheckCircle2 className="w-3 h-3" />
                                            </button>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>

                    {/* Events Grid */}
                    <div className="relative grid grid-cols-7 bg-slate-50/30 dark:bg-slate-900/30" style={{ gridTemplateRows: `repeat(${END_HOUR - dynamicStartHour}, minmax(70px, 70px))` }}>
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
                                                navigate(`/admin/work-orders/new?date=${targetDate}&time=${targetTime}`, { state: { from: '/admin/planning' } });
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
                                        className={`group absolute p-1.5 overflow-hidden rounded-md shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-move mx-1 
                                            ${!wo.assigned_team_id ? 'bg-white dark:bg-slate-900 border-2 border-red-500 border-l-[6px] border-l-red-500' : 'border-l-4'}
                                            ${isThisDragged ? 'opacity-50 ring-2 ring-blue-500' : ''} 
                                            ${syncing ? 'opacity-70 pointer-events-none' : ''} 
                                            ${isDragging && !isThisDragged ? 'pointer-events-none' : ''}
                                            ${animatingOrder === wo.id ? 'ring-4 ring-green-500 bg-green-100 dark:bg-green-900/50 scale-[1.02] z-[60]' : ''}`}
                                        style={{
                                            top: `${(wo.rowStart - 1) * 70 + 2}px`,
                                            height: '64px',
                                            left: `${leftPercent}%`,
                                            width: widthValue,
                                            backgroundColor: !wo.assigned_team_id ? undefined : `${colorHex}25`,
                                            borderLeftColor: !wo.assigned_team_id ? undefined : colorHex,
                                            borderColor: isCompleted ? '#22c55e' : (!wo.assigned_team_id ? undefined : `${colorHex}50`),
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
                                                else navigate(`/admin/work-orders/${wo.id}`, { state: { from: '/admin/planning' } });
                                            }
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            if (isCompleted) handleUncomplete(wo, e);
                                        }}
                                        onDragEnter={(e) => e.preventDefault()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.dataTransfer.dropEffect = isCompleted ? 'none' : 'move';
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (isCompleted) {
                                                openDialog({
                                                    title: 'Lucrare finalizată',
                                                    message: 'Această lucrare este marcată ca Finalizată. Schimbați statusul comenzii pentru a o putea modifica.',
                                                    confirmLabel: 'OK',
                                                    hideCancel: true,
                                                });
                                                return;
                                            }
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
                                        title={`${wo.client_name || wo.title} — trageți pentru a muta`}
                                    >
                                        {!isCompleted && (
                                            <div className={`absolute top-1 right-1 z-10 transition-opacity duration-150 opacity-100 group-hover:opacity-0`}>
                                                <WeatherWidget lat={wo.site_latitude || 50.8503} lon={wo.site_longitude || 4.3517} dateStr={wo.start_date || wo.deadline_date} />
                                            </div>
                                        )}

                                        <div className="absolute top-1 right-1 flex items-center gap-1 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md shadow-sm p-0.5 border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                                                <button
                                                    onClick={(e) => isCompleted ? handleUncomplete(wo, e) : handleComplete(wo, e)}
                                                    className={`p-1 rounded transition-colors ${isCompleted ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400'}`}
                                                    title={isCompleted ? 'Anulează finalizare' : 'Marchează Finalizat'}
                                                    disabled={completing === wo.id}
                                                >
                                                    {completing === wo.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (onOrderEdit) onOrderEdit(wo);
                                                        else navigate(`/admin/work-orders/${wo.id}/edit`, { state: { from: '/admin/planning' } }); 
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

                                        <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate pr-8 flex items-center gap-1" title={wo.client_name || wo.title}>
                                            {wo.status === 'draft' && <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" title="Draft - Incomplet" />}
                                            {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" title="Finalizată" />}
                                            <span className="truncate">{wo.client_name || wo.title}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                                            <span className="truncate">{wo.client_name || wo.site_name || wo.site_address || t('common.no_location', 'Fără locație')}</span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 truncate bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-full shadow-sm">
                                                <Truck className="w-3 h-3 shrink-0" style={{ color: colorHex }} />
                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                    {(wo.assigned_team_name || t('common.unassigned', 'Neasignat')).replace(/^echipa\s*/i, '')}
                                                </span>
                                            </div>
                                            {calculateOrderSand(wo) > 0 && (
                                                <span className="text-[9px] text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded shadow-sm">
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
            <div className="flex-1 overflow-y-auto md:hidden p-4 pb-32 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                {weeklyOrders.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                        <span className="text-slate-400 text-sm font-semibold">{t('admin_overview.no_orders_week', 'Nicio comandă în această săptămână')}</span>
                    </div>
                ) : (
                    (() => {
                        const sorted = [...weeklyOrders].sort((a, b) => {
                            const dateA = a.start_date || a.deadline_date || '';
                            const dateB = b.start_date || b.deadline_date || '';
                            if (dateA !== dateB) return String(dateB).localeCompare(String(dateA));
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
                                            else navigate(`/admin/work-orders/${wo.id}`, { state: { from: '/admin/planning' } });
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-bold text-slate-800 dark:text-white text-sm leading-tight pr-10 flex items-center gap-1.5">
                                                {wo.status === 'draft' && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" title="Draft - Incomplet" />}
                                                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" title="Finalizată" />}
                                                <span>{wo.client_name || wo.title}</span>
                                            </div>
                                            {!isCompleted && (
                                                <div className="absolute top-2 right-2">
                                                    <WeatherWidget lat={wo.site_latitude || 50.8503} lon={wo.site_longitude || 4.3517} dateStr={wo.start_date || wo.deadline_date} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 mb-1">
                                            {wo.volumes && wo.volumes.length > 0 && wo.volumes.map((v, idx) => {
                                                const sq = parseFloat(v.quantity);
                                                const th = parseFloat(v.thickness);
                                                if (!sq && !th) return null;
                                                return (
                                                    <span key={idx} className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                                                        {v.label ? `${v.label}: ` : ''}
                                                        {sq > 0 ? `${sq}m²` : ''}
                                                        {sq > 0 && th > 0 ? ' × ' : ''}
                                                        {th > 0 ? `${th}cm` : ''}
                                                    </span>
                                                );
                                            })}
                                            {calculateOrderSand(wo) > 0 && (
                                                <span className="text-[11px] text-amber-700 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50 shrink-0">
                                                    {calculateOrderSand(wo).toFixed(1)}T Nisip
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{wo.client_name || wo.site_name || wo.site_address || t('common.no_location', 'Fără locație')}</span>
                                        </div>
                                        <div className="mt-1.5">
                                            <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-full shadow-sm max-w-full">
                                                <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: colorHex }} />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                                    {wo.assigned_team_name || t('common.unassigned', 'Neasignat')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        });
                    })()
                )}
            </div>
                </div>
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
