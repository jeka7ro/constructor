import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Clock, MapPin, Truck, ChevronRight, Navigation, Map, CheckCircle2, Calculator, ChevronLeft, Package, Check, CheckCheck, Send, AlertTriangle, Calendar, LayoutGrid, CalendarDays, Layers, Wind, Thermometer } from 'lucide-react';
import StreetViewPhotos from './StreetViewPhotos';
import WeatherWidget from './WeatherWidget';
import { format, addDays, startOfWeek, isSameDay, isSameWeek, subWeeks, addWeeks, parseISO } from 'date-fns';
import { ro, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';


function haversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const toRad = x => x * Math.PI / 180;
    const R = 6371; 
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


const osrmCache = {};

function OsrmDistance({ lat1, lon1, lat2, lon2, label }) {
    const [distance, setDistance] = React.useState(null);

    React.useEffect(() => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return;
        
        const key = `${lat1},${lon1}|${lat2},${lon2}`;
        if (osrmCache[key]) {
            setDistance(osrmCache[key]);
            return;
        }

        let isMounted = true;
        fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`)
            .then(res => res.json())
            .then(data => {
                if (data && data.code === "Ok" && data.routes && data.routes.length > 0) {
                    const km = (data.routes[0].distance / 1000).toFixed(1);
                    osrmCache[key] = km;
                    if (isMounted) setDistance(km);
                }
            })
            .catch(err => console.error("OSRM error:", err));
            
        return () => { isMounted = false; };
    }, [lat1, lon1, lat2, lon2]);

    if (distance === null) return null;
    return <span>• {distance} km {label}</span>;
}

export default function MobileAgenda({ orders, onOrderClick, currentDate, setCurrentDate, isHistory = false, showTeamName = true, isPartner = false, getOrderReminderState, onOpenReminderModal }) {
    const { t, i18n } = useTranslation();
    const isFrench = i18n.language === 'fr';
    const locale = isFrench ? fr : ro;

    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('mobile_agenda_view') || 'jour'; } catch { return 'jour'; }
    });
    const weekScrollRef = useRef(null);

    const toggleView = (mode) => {
        setViewMode(mode);
        try { localStorage.setItem('mobile_agenda_view', mode); } catch {}
    };

    const weekDays = useMemo(() => {
        return [...Array(7)].map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
    }, [currentDate]);

    const days = [currentDate];

    const ordersByDay = useMemo(() => {
        const grouped = {};
        weekDays.forEach(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            grouped[dateStr] = [];
        });

        orders.forEach(wo => {
            const woDateStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
            if (!woDateStr) return;

            const duration = parseInt(wo.duration_days) || 1;
            const startDate = parseISO(woDateStr);

            for (let i = 0; i < duration; i++) {
                const currentDate = addDays(startDate, i);
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                if (grouped[dateStr]) {
                    // Prevent duplicates if multiple components loop over it
                    if (!grouped[dateStr].find(o => o.id === wo.id)) {
                        grouped[dateStr].push(wo);
                    }
                }
            }
        });

        Object.values(grouped).forEach(dayOrders => {
            dayOrders.sort((a, b) => {
                const tA = a.start_time || '00:00';
                const tB = b.start_time || '00:00';
                return tA.localeCompare(tB);
            });
        });

        return grouped;
    }, [orders, weekDays]);

    const formatDayName = (date) => {
        return format(date, 'EEEE, d MMM', { locale });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'confirmed': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'completed': return t('status.completed', 'Finalizat');
            case 'in_progress': return t('status.in_progress', 'În progres');
            case 'confirmed': return t('status.confirmed', 'Confirmat');
            default: return status;
        }
    };

    const calcOrderSandTons = (wo) => {
        if (wo.actual_sand_quantity && parseFloat(wo.actual_sand_quantity) > 0) {
            const v = parseFloat(wo.actual_sand_quantity);
            return v > 200 ? v / 1000 : v;
        }
        if (wo.route_sand_kg && parseFloat(wo.route_sand_kg) > 0) {
            return parseFloat(wo.route_sand_kg) / 1000;
        }
        let totalKg = 0;
        (wo.volumes || []).forEach(vol => {
            const s = parseFloat(vol.quantity) || 0;
            const th = parseFloat(vol.thickness) || 0;
            const lbl = String(vol.label || '').toLowerCase();
            if (s > 0 && th > 0 && !lbl.includes('pur') && !lbl.includes('eps')) {
                totalKg += s * th * 16;
            }
        });
        return totalKg / 1000;
    };

    const selectedDateStr = format(currentDate, 'yyyy-MM-dd');
    const selectedDayOrders = ordersByDay[selectedDateStr] || [];
    const selectedDaySandTons = selectedDayOrders.reduce((sum, wo) => sum + calcOrderSandTons(wo), 0);

    return (
        <div className="flex flex-col pb-8">
            {/* Row 1: Apple HIG Calendar Header — Month/Year Navigation on Left, Jour/Semaine Segmented Control on Right */}
            <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <button 
                        type="button"
                        onClick={() => setCurrentDate(d => addWeeks(d, -1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                        aria-label="Semaine précédente"
                    >
                        <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    
                    <div className="flex flex-col px-1 min-w-0">
                        <span className="text-[9.5px] font-black tracking-widest text-slate-400 uppercase leading-none">
                            {format(currentDate, 'yyyy', { locale })}
                        </span>
                        <span className="text-[15px] font-black text-slate-900 dark:text-slate-100 capitalize tracking-tight leading-tight truncate">
                            {format(currentDate, 'MMMM', { locale })}
                        </span>
                    </div>

                    <button 
                        type="button"
                        onClick={() => setCurrentDate(d => addWeeks(d, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                        aria-label="Semaine suivante"
                    >
                        <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Apple Segmented Control: Jour / Semaine */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 gap-0.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => toggleView('jour')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all duration-200 ${
                            viewMode === 'jour'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <CalendarDays className="w-3.5 h-3.5" />
                        {t('mobile_agenda.day', 'Jour')}
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleView('semaine')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all duration-200 ${
                            viewMode === 'semaine'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        {t('mobile_agenda.week', 'Semaine')}
                    </button>
                </div>
            </div>

            {/* ============ MODE: JOUR ============ */}
            {viewMode === 'jour' && (
            <>
            {/* Row 2: Apple Style Week Strip with Daily Sand Tonnage under each day */}
            <div className="flex items-center justify-between px-3 py-2 mb-2 border-y border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
                {weekDays.map((d, i) => {
                    const isSelected = isSameDay(d, currentDate);
                    const isToday = isSameDay(d, new Date());
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dOrders = ordersByDay[dateStr] || [];
                    const hasOrders = dOrders.length > 0;
                    const daySand = dOrders.reduce((s, wo) => s + calcOrderSandTons(wo), 0);
                    
                    return (
                        <button 
                            type="button"
                            key={i}
                            onClick={() => setCurrentDate(d)}
                            className="flex flex-col items-center justify-center gap-1 group flex-1 outline-none"
                        >
                            <span className={`text-[10px] font-bold uppercase leading-none ${isSelected ? 'text-[color:var(--tenant-accent)]' : isToday ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                {format(d, 'EEEEE', { locale })}
                            </span>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold tabular-nums transition-all ${isSelected ? 'bg-[color:var(--tenant-accent)] text-white shadow-md shadow-blue-500/25' : isToday ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                {format(d, 'd')}
                            </div>
                            {/* Daily Sand Tonnage or Event Dot */}
                            <div className="h-3.5 flex items-center justify-center">
                                {daySand > 0 ? (
                                    <span className={`text-[9.5px] font-extrabold tabular-nums leading-none ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-amber-600/85 dark:text-amber-400/85'}`}>
                                        {daySand.toFixed(0)}T
                                    </span>
                                ) : hasOrders ? (
                                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[color:var(--tenant-accent)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                ) : null}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Zilele Saptamanii */}
            <div className="space-y-3">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayOrders = ordersByDay[dateStr] || [];
                    const isTodayFlag = isSameDay(day, new Date());

                    return (
                        <div key={dateStr} className="flex flex-col gap-2">
                            {/* Header Zi + Cantitate Totală de Nisip & Număr Șantiere */}
                            <div className="flex items-center gap-2 px-3.5 mb-0.5">
                                {isTodayFlag && <div className="w-2 h-2 rounded-full bg-[color:var(--tenant-accent)]" />}
                                <h3 className={`text-xs font-extrabold uppercase tracking-wider ${isTodayFlag ? 'text-[color:var(--tenant-accent)]' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {isTodayFlag ? t("general.today", "Aujourd'hui") : format(day, 'EEEE, d MMM', { locale })}
                                </h3>
                                <div className="ml-auto flex items-center gap-1.5 tabular-nums">
                                    {selectedDaySandTons > 0 && (
                                        <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                                            {selectedDaySandTons.toFixed(1)} t {t('dynamic_island.sand_short', 'sable')}
                                        </span>
                                    )}
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                        {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                    </span>
                                </div>
                            </div>

                            {/* Lista Comenzi pt Zi */}
                            {dayOrders.length > 0 ? (
                                (() => {
                                    const teamCounters = {};
                                    const teamIndices = [];
                                    dayOrders.forEach(wo => {
                                        const tId = wo.assigned_team_id || 'unassigned';
                                        if (teamCounters[tId] === undefined) teamCounters[tId] = 0;
                                        teamIndices.push(teamCounters[tId]++);
                                    });

                                    return (
                                        <div className="space-y-2 px-3.5">
                                            {dayOrders.map((wo, index) => {
                                                const legNumber = teamIndices[index] + 1;
                                                const rawTeamName = wo.team?.name || wo.assigned_team_name || t('common.unassigned', 'Non assigné');
                                                const teamName = rawTeamName.replace(/^echip[aă]\s*/i, '');
                                                
                                                let sandTons = 0;
                                                let totalSurface = 0;
                                                if (wo.actual_surface_m2) {
                                                    totalSurface = parseFloat(wo.actual_surface_m2);
                                                }

                                                if (wo.actual_sand_quantity) {
                                                    sandTons = parseFloat(wo.actual_sand_quantity) / 1000;
                                                    if (!totalSurface) {
                                                        (wo.volumes || []).forEach(vol => {
                                                            const surface = parseFloat(vol.quantity) || 0;
                                                            totalSurface += surface;
                                                        });
                                                    }
                                                } else {
                                                    let totalKg = 0;
                                                    (wo.volumes || []).forEach(vol => {
                                                        const surface = parseFloat(vol.quantity) || 0;
                                                        const thickness = parseFloat(vol.thickness) || 0;
                                                        if (!wo.actual_surface_m2) {
                                                            totalSurface += surface;
                                                        }
                                                        if (surface > 0 && thickness > 0) totalKg += surface * thickness * 16;
                                                    });
                                                    sandTons = totalKg / 1000;
                                                }

                                                let prevWo = null;
                                                let prevLat = null;
                                                let prevLng = null;
                                                let prevAddress = null;
                                                if (index > 0) {
                                                    prevWo = dayOrders[index - 1];
                                                    prevLat = prevWo.site_latitude || prevWo.site_lat;
                                                    prevLng = prevWo.site_longitude || prevWo.site_lng;
                                                    prevAddress = prevWo.site_address || prevWo.address || prevWo.client_name;
                                                }

                                                const color = wo.team?.color || wo.assigned_team_color || '#3b82f6';
                                                const bgStyle = {
                                                    backgroundColor: color + '1a',
                                                    borderColor: color + '33',
                                                    backdropFilter: 'blur(8px)'
                                                };

                                                const lat = wo.site_latitude || wo.site_lat;
                                                const lng = wo.site_longitude || wo.site_lng;
                                                const address = wo.site_address || wo.site?.address || wo.address;
                                                const staticMapLoc = (lat && lng) ? `${lat},${lng}` : (address ? encodeURIComponent(address) : null);

                                                return (
                                                    <div
                                                        key={wo.id}
                                                        draggable={false}
                                                        onDragStart={(e) => e.preventDefault()}
                                                        onClick={() => onOrderClick(wo, prevLat, prevLng, prevAddress)}
                                                        className="w-full text-left rounded-2xl shadow-xs border overflow-hidden transition-colors relative text-slate-800 dark:text-slate-100 touch-pan-y select-none cursor-pointer"
                                                        style={bgStyle}
                                                    >
                                                        {staticMapLoc && (
                                                            <div 
                                                                className="absolute top-0 right-0 bottom-0 w-2/3 pointer-events-none overflow-hidden rounded-r-2xl opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-lighten" 
                                                                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black)', maskImage: 'linear-gradient(to right, transparent, black)' }}
                                                            >
                                                                <img 
                                                                    src={`https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&size=400,300&z=14&l=map`} 
                                                                    alt="Map" 
                                                                    draggable={false}
                                                                    className="w-full h-full object-cover pointer-events-none select-none" 
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="px-3 py-2.5 flex flex-col gap-1.5 relative z-10">
                                                            <div className="flex items-center justify-between w-full gap-1">
                                                                {showTeamName ? (
                                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0" style={{ backgroundColor: color + '26' }}>
                                                                        <span className="text-[11.5px] font-extrabold text-slate-900 dark:text-white truncate max-w-[120px] drop-shadow-sm">#{legNumber} {teamName}</span>
                                                                    </div>
                                                                ) : (
                                                                    <h4 className="font-bold text-[15px] leading-tight opacity-90 truncate flex-1">
                                                                        {wo.client?.name || wo.client_name || 'Client Inconnu'}
                                                                    </h4>
                                                                )}
                                                                <div className={`flex items-center justify-center ${showTeamName ? 'flex-1' : 'shrink-0'}`}>
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800/70 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                                                        <div className="text-[10.5px] font-bold shrink-0">
                                                                            {prevWo ? (
                                                                                <OsrmDistance 
                                                                                    lat1={prevLat} lon1={prevLng} 
                                                                                    lat2={lat} lon2={lng} 
                                                                                    label="" 
                                                                                />
                                                                            ) : (
                                                                                <OsrmDistance 
                                                                                    lat1={50.88243} lon1={4.39343} 
                                                                                    lat2={lat} lon2={lng} 
                                                                                    label=""
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        {wo.route_sand_kg > 0 && (
                                                                            <>
                                                                                <div className="w-px h-2.5 bg-slate-300 dark:bg-slate-600 mx-0.5"></div>
                                                                                <div className="text-[10.5px] font-bold text-amber-600 dark:text-amber-500 shrink-0">
                                                                                    {(wo.route_sand_kg / 1000).toFixed(1)} t
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 flex items-center justify-end">
                                                                    {(lat && lng) && (
                                                                        <div className="scale-110 origin-right pr-1">
                                                                            <WeatherWidget lat={lat} lon={lng} dateStr={wo.start_date || dateStr} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Middle Row: Client Name + Volumes on Left, WhatsApp Rappel Button on Right (directly above Google Maps direction icon) */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                                                    {showTeamName && (
                                                                        <h4 className="font-bold text-[15px] leading-tight opacity-90 truncate">
                                                                            {wo.client?.name || wo.client_name || 'Client Inconnu'}
                                                                        </h4>
                                                                    )}

                                                                    {/* Display Surface and Thickness from Volumes */}
                                                                    {wo.volumes && wo.volumes.some(v => parseFloat(v.quantity) > 0) && (
                                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                                            {wo.volumes.map((v, idx) => {
                                                                                const sq = parseFloat(v.quantity);
                                                                                const th = parseFloat(v.thickness);
                                                                                if (!sq && !th) return null;
                                                                                
                                                                                let shortLabel = (v.label || `Chape ${idx === 0 ? '' : idx + 1}`).trim();
                                                                                if (/izola/i.test(shortLabel)) {
                                                                                    shortLabel = t('work_order_detail.insulation', 'Isolation');
                                                                                } else {
                                                                                    shortLabel = shortLabel
                                                                                        .replace(/[sșş]ap[aăâ]/gi, 'Chape')
                                                                                        .replace(/surface/i, 'Chape')
                                                                                        .replace(/volum/i, 'Chape')
                                                                                        .trim();
                                                                                    if (shortLabel.toLowerCase() === 'chape 1') shortLabel = 'Chape';
                                                                                }

                                                                                const isPur = (v.label || '').toLowerCase().includes('pur');
                                                                                const isEps = (v.label || '').toLowerCase().includes('eps');
                                                                                const Icon = isPur ? Wind : (isEps ? Thermometer : Layers);
                                                                                const iconColor = isPur ? 'text-indigo-500' : (isEps ? 'text-emerald-500' : 'text-slate-500');

                                                                                return (
                                                                                    <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                                                        <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
                                                                                        <span className="truncate max-w-[80px] opacity-80">{shortLabel}:</span>
                                                                                        <span>
                                                                                            {sq > 0 ? `${sq} m²` : ''} 
                                                                                            {sq > 0 && th > 0 ? ' × ' : ''} 
                                                                                            {th > 0 ? `${th} cm` : ''}
                                                                                        </span>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {!isPartner && wo.status !== 'completed' && wo.status !== 'done' && getOrderReminderState && onOpenReminderModal && (() => {
                                                                    const { isConfirmed, isSent, issueType } = getOrderReminderState(wo);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => onOpenReminderModal(wo, e)}
                                                                            className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all shadow-2xs border shrink-0 cursor-pointer ${
                                                                                issueType
                                                                                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                                                                                    : isConfirmed
                                                                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                                                                        : isSent
                                                                                            ? 'bg-sky-500 text-white border-sky-600'
                                                                                            : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                                                                            }`}
                                                                            title="Rappel WhatsApp & Email"
                                                                        >
                                                                            {issueType ? (
                                                                                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                                                                            ) : isConfirmed ? (
                                                                                <CheckCheck className="w-4 h-4 stroke-[2.8]" />
                                                                            ) : isSent ? (
                                                                                <div className="relative flex items-center justify-center">
                                                                                    <Send className="w-3.5 h-3.5 stroke-[2.5] -ml-0.5" />
                                                                                    <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border border-white">
                                                                                        <Check className="w-2 h-2 stroke-[3.5]" />
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.126.556 4.122 1.532 5.854l-1.532 5.596 5.736-1.505c1.694.922 3.633 1.447 5.698 1.447 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })()}
                                                            </div>

                                                            <div className="flex items-center gap-1.5 mt-0.5 pt-1.5 border-t" style={{ borderColor: color + '26' }}>
                                                                <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                    <span className="text-[11.5px] font-medium leading-tight opacity-80 truncate">
                                                                        {address || 'Fără adresă'}
                                                                    </span>
                                                                </div>
                                                                <div className="ml-auto flex items-center shrink-0">
                                                                    {wo.status === 'completed' || wo.status === 'done' ? (
                                                                        <div 
                                                                            className="w-8.5 h-8.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"
                                                                            title={t('status.completed', 'Terminé')}
                                                                        >
                                                                            <CheckCircle2 className="w-4.5 h-4.5" />
                                                                        </div>
                                                                    ) : (
                                                                        <a 
                                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(wo.site_address || wo.site?.address || wo.address || '')}`}
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-8.5 h-8.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors shrink-0"
                                                                        >
                                                                            <Navigation className="w-4 h-4" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl p-4 flex items-center justify-center">
                                    <span className="text-xs font-medium text-slate-400">
                                        {t('general.no_orders_day', 'Aucun chantier pour ce jour.')}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            </>
            )}

            {/* ============ MODE: SEMAINE (Planning Board Orizontal) ============ */}
            {viewMode === 'semaine' && (
                <div 
                    ref={weekScrollRef}
                    className="flex overflow-x-auto snap-x snap-mandatory gap-0 pb-4 scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {weekDays.map((day, dayIdx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayOrders = ordersByDay[dateStr] || [];
                        const isToday = isSameDay(day, new Date());
                        const isSelected = isSameDay(day, currentDate);

                        return (
                            <div 
                                key={dateStr}
                                className={`snap-start flex-shrink-0 flex flex-col border-r border-slate-100 dark:border-slate-800 last:border-r-0`}
                                style={{ width: '38vw', minWidth: '145px' }}
                            >
                                {/* Column Header */}
                                <button
                                    onClick={() => { setCurrentDate(day); toggleView('jour'); }}
                                    className={`sticky top-0 z-10 px-2 py-2.5 text-center border-b transition-colors ${
                                        isToday 
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' 
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                    }`}
                                >
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${
                                        isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                        {format(day, 'EEE', { locale })}
                                    </div>
                                    <div className={`text-base font-black mt-0.5 ${
                                        isToday 
                                            ? 'text-blue-600 dark:text-blue-400' 
                                            : 'text-slate-800 dark:text-slate-200'
                                    }`}>
                                        {format(day, 'd')}
                                    </div>
                                    {dayOrders.length > 0 && (
                                        <div className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${
                                            isToday 
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {dayOrders.length}
                                        </div>
                                    )}
                                </button>

                                {/* Cards */}
                                <div className="flex-1 p-1.5 space-y-1.5 min-h-[120px]">
                                    {dayOrders.length > 0 ? dayOrders.map((wo) => {
                                        const color = wo.team?.color || wo.assigned_team_color || '#3b82f6';
                                        const clientName = wo.client?.name || wo.client_name || '—';
                                        const isDone = wo.status === 'completed' || wo.status === 'done';

                                        return (
                                            <button
                                                key={wo.id}
                                                onClick={() => onOrderClick(wo)}
                                                className="w-full text-left rounded-xl border shadow-sm active:scale-[0.97] transition-transform overflow-hidden"
                                                style={{ 
                                                    borderColor: color + '40',
                                                    backgroundColor: color + '0d'
                                                }}
                                            >
                                                <div className="flex">
                                                    {/* Team color bar */}
                                                    <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: color }} />
                                                    <div className="flex-1 p-2 min-w-0">
                                                        {/* Client */}
                                                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                                                            {clientName}
                                                        </div>
                                                        {/* Time */}
                                                        {wo.start_time && (
                                                            <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {wo.start_time?.substring(0, 5)}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                                                            <div className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                                                                {wo.volumes && wo.volumes.map((v, idx) => {
                                                                    const sq = parseFloat(v.quantity);
                                                                    const th = parseFloat(v.thickness);
                                                                    if (!sq && !th) return null;
                                                                    
                                                                    let shortLabel = (v.label || `Chape ${idx === 0 ? '' : idx + 1}`).trim();
                                                                    if (shortLabel.toLowerCase().includes('izola')) {
                                                                        shortLabel = 'Izolație';
                                                                    } else {
                                                                        shortLabel = shortLabel.replace(/surface/i, 'Chape').replace(/volum/i, 'Chape').trim();
                                                                        if (shortLabel.toLowerCase() === 'chape 1') shortLabel = 'Chape';
                                                                    }

                                                                    const isPur = (v.label || '').toLowerCase().includes('pur');
                                                                    const isEps = (v.label || '').toLowerCase().includes('eps');
                                                                    const Icon = isPur ? Wind : (isEps ? Thermometer : Layers);
                                                                    const iconColor = isPur ? 'text-indigo-500' : (isEps ? 'text-emerald-500' : 'text-slate-500');

                                                                    return (
                                                                        <div key={idx} className="flex items-center gap-1">
                                                                            <Icon className={`w-3 h-3 ${iconColor} shrink-0`} />
                                                                            <span className="opacity-70">{shortLabel}:</span>
                                                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                                                {sq > 0 ? `${sq} m²` : ''} 
                                                                                {sq > 0 && th > 0 ? ' × ' : ''} 
                                                                                {th > 0 ? `${th} cm` : ''}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                        {/* Status indicator */}
                                                        {isDone && (
                                                            <div className="flex items-center gap-0.5 mt-1">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                <span className="text-[8px] font-bold text-emerald-600 uppercase">OK</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    }) : (
                                        <div className="flex items-center justify-center h-16 text-slate-300 dark:text-slate-700 text-[10px] font-medium">
                                            —
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
