import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Hand } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isSameWeek } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import api from '../lib/api';

export default function ShortWorksCalendar({ workOrders = [], onOrderRescheduled }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [syncing, setSyncing] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOrder, setDraggedOrder] = useState(null);
    const containerRef = useRef(null);
    const { openDialog } = useUIStore();
    const navigate = useNavigate();

    // Generate week days (Monday to Sunday)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    const isCurrentWeek = isSameWeek(currentDate, new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekLabel = isCurrentWeek 
        ? "Săpt. curentă" 
        : `${format(weekStart, 'dd MMM', { locale: ro })} - ${format(weekEnd, 'dd MMM', { locale: ro })}`;

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

    const getGridRowFromTime = (timeStr) => {
        if (!timeStr) return 3; // Default to 08:00 (row 3 when starting at 06:00)
        const [hours] = timeStr.split(':').map(Number);
        const row = hours - 6 + 1; // 06:00 is row 1
        return Math.max(1, Math.min(13, row));
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px] relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ro })}
                    </h2>
                </div>
                <div className="flex items-center gap-3">

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
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
                        Click pentru a derula
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
                    <div className="h-12 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-900/80 z-20" />
                    {Array.from({ length: 13 }).map((_, i) => (
                        <div key={i} className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-start justify-center text-[10px] text-slate-400 font-medium pt-1">
                            {(i + 6).toString().padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex-1 min-w-[800px]">

                    {/* Header: Days */}
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div key={i} className={`h-12 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <span className={`text-[11px] uppercase font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                        {format(day, 'EEE', { locale: ro })}
                                    </span>
                                    <span className={`text-sm font-black ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Events Grid */}
                    <div className="relative grid grid-cols-7 grid-rows-[repeat(13,minmax(80px,80px))] bg-slate-50/30 dark:bg-slate-900/30">
                        {weeklyOrders.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <span className="text-slate-400 text-sm">Nicio comandă în această săptămână</span>
                            </div>
                        )}
                        
                        {/* Grid Lines acting as Drop Zones */}
                        {Array.from({ length: 13 * 7 }).map((_, i) => {
                            const dayIndex = i % 7;
                            const hourIndex = Math.floor(i / 7);
                            return (
                                <div 
                                    key={i} 
                                    className={`border-r border-b border-slate-200 dark:border-slate-800/60 transition-colors ${isDragging ? 'hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''}`}
                                    onDragEnter={(e) => e.preventDefault()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                    }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        setDraggedOrder(null);
                                        const woId = e.dataTransfer.getData("text/plain");
                                        if (!woId) return;

                                        const targetDate = format(weekDays[dayIndex], "yyyy-MM-dd");
                                        const targetTime = `${(hourIndex + 6).toString().padStart(2, '0')}:00`;

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
                                />
                            );
                        })}

                        {/* Events overlay */}
                        {(() => {
                            const renderableOrders = [];
                            const dayOccupancy = {};
                            
                            const sortedOrders = [...weeklyOrders].sort((a, b) => {
                                const tA = a.start_time || '07:00';
                                const tB = b.start_time || '07:00';
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
                                const colorHex = wo.assigned_team_color || '#93c5fd';
                                
                                // Calculate offset to avoid overlap
                                const baseWidthPercent = 100 / 7;
                                const leftPercent = wo.dayIndex * baseWidthPercent;
                                const widthValue = `calc(${baseWidthPercent}% - 8px)`;
                                const isThisDragged = draggedOrder === wo.id;

                                return (
                                    <div 
                                        key={wo.id}
                                        draggable={true}
                                        onDragStart={(e) => {
                                            e.stopPropagation();
                                            e.dataTransfer.setData("text/plain", String(wo.id));
                                            e.dataTransfer.effectAllowed = "move";
                                            // Defer state update to avoid React unmounting/re-rendering canceling the drag
                                            setTimeout(() => {
                                                setIsDragging(true);
                                                setDraggedOrder(wo.id);
                                            }, 0);
                                        }}
                                        onDragEnd={() => {
                                            setIsDragging(false);
                                            setDraggedOrder(null);
                                        }}
                                        className={`absolute p-1.5 overflow-hidden rounded-md border-l-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-move mx-1 ${isThisDragged ? 'opacity-50 ring-2 ring-blue-500' : ''} ${syncing ? 'opacity-70 pointer-events-none' : ''} ${isDragging && !isThisDragged ? 'pointer-events-none' : ''}`}
                                        style={{
                                            top: `${(wo.rowStart - 1) * 80 + 4}px`,
                                            height: '72px',
                                            left: `${leftPercent}%`,
                                            width: widthValue,
                                            backgroundColor: `${colorHex}30`,
                                            borderLeftColor: colorHex,
                                            borderColor: `${colorHex}50`,
                                            zIndex: isThisDragged ? 50 : (10 + (wo._layoutIndex || 0))
                                        }}
                                        onClick={() => !isDragging && navigate(`/admin/work-orders/${wo.id}`)}
                                        title={`${wo.title} — trageți pentru a muta`}
                                    >
                                        <div className="text-[10px] text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {wo.start_time || '07:00'}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate" title={wo.title}>
                                            {wo.title}
                                        </div>
                                        <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {wo.client_name || wo.site_name || 'Fără locație'}
                                        </div>
                                        <div className="text-[10px] font-semibold mt-1 truncate" style={{ color: colorHex }}>
                                            {wo.assigned_team_name || 'Neasignat'}
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
                        <span className="text-slate-400 text-sm font-semibold">Nicio comandă în această săptămână</span>
                    </div>
                ) : (
                    (() => {
                        const sorted = [...weeklyOrders].sort((a, b) => {
                            const dateA = a.start_date || a.deadline_date || '';
                            const dateB = b.start_date || b.deadline_date || '';
                            if (dateA !== dateB) return dateA.localeCompare(dateB);
                            const tA = a.start_time || '07:00';
                            const tB = b.start_time || '07:00';
                            return tA.localeCompare(tB);
                        });
                        
                        let lastDate = null;
                        
                        return sorted.map(wo => {
                            const dateStr = wo.start_date || wo.deadline_date;
                            const isNewDay = dateStr !== lastDate;
                            lastDate = dateStr;
                            
                            const colorHex = wo.assigned_team_color || '#3b82f6';
                            const parsedDate = dateStr ? new Date(dateStr.split('T')[0]) : null;
                            
                            return (
                                <React.Fragment key={wo.id}>
                                    {isNewDay && parsedDate && (
                                        <div className="mt-2 mb-1">
                                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                                {format(parsedDate, 'EEEE, d MMM', { locale: ro })}
                                            </span>
                                        </div>
                                    )}
                                    <div 
                                        className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                                        style={{ borderLeft: `4px solid ${colorHex}`, backgroundColor: `${colorHex}15` }}
                                        onClick={() => navigate(`/admin/work-orders/${wo.id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-bold text-slate-800 dark:text-white text-sm leading-tight">
                                                {wo.title}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {wo.start_time || '07:00'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{wo.client_name || wo.site_name || 'Fără locație'}</span>
                                        </div>
                                        <div className="text-xs font-bold mt-1" style={{ color: colorHex }}>
                                            {wo.assigned_team_name || 'Neasignat'}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        });
                    })()
                )}
            </div>
        </div>
    );
}
