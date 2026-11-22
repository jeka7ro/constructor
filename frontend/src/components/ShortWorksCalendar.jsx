import MobileAgenda from "./MobileAgenda";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Hand, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Loader2, AlertTriangle, Edit2, Trash2, Plus, CheckCircle2, Maximize2, Minimize2, Scan, Shrink, Truck, Building2, Star, Search, X, Move, Layers } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isSameWeek } from 'date-fns';
import { ro, enUS, nl, fr, de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useTenantStore } from '../store/tenantStore';
import api from '../lib/api';
import WeatherWidget from './WeatherWidget';

const PUBLIC_HOLIDAYS_BE = [
    { date: '2025-01-01', name: 'Nieuwjaar' },
    { date: '2025-04-21', name: 'Paasmaandag' },
    { date: '2025-05-01', name: 'Fête du Travail' },
    { date: '2025-05-29', name: 'Ascension' },
    { date: '2025-06-09', name: 'Lundi de Pentecôte' },
    { date: '2025-07-21', name: 'Fête Nationale' },
    { date: '2025-08-15', name: 'L\'Assomption' },
    { date: '2025-11-01', name: 'Toussaint' },
    { date: '2025-11-11', name: 'Armistice' },
    { date: '2025-12-25', name: 'Noël' },
    { date: '2026-01-01', name: 'Nieuwjaar' },
    { date: '2026-04-06', name: 'Paasmaandag' },
    { date: '2026-05-01', name: 'Fête du Travail' },
    { date: '2026-05-14', name: 'Ascension' },
    { date: '2026-05-25', name: 'Lundi de Pentecôte' },
    { date: '2026-07-21', name: 'Fête Nationale' },
    { date: '2026-08-15', name: 'L\'Assomption' },
    { date: '2026-11-01', name: 'Toussaint' },
    { date: '2026-11-11', name: 'Armistice' },
    { date: '2026-12-25', name: 'Noël' },
    { date: '2027-01-01', name: 'Nieuwjaar' },
    { date: '2027-03-29', name: 'Paasmaandag' },
    { date: '2027-05-01', name: 'Fête du Travail' },
    { date: '2027-05-06', name: 'Ascension' },
    { date: '2027-05-17', name: 'Lundi de Pentecôte' },
    { date: '2027-07-21', name: 'Fête Nationale' },
    { date: '2027-08-15', name: 'L\'Assomption' },
    { date: '2027-11-01', name: 'Toussaint' },
    { date: '2027-11-11', name: 'Armistice' },
    { date: '2027-12-25', name: 'Noël' }
];

const getUpcomingHolidays = (count = 4) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [];
    for (const holiday of PUBLIC_HOLIDAYS_BE) {
        const hDate = new Date(holiday.date);
        hDate.setHours(0, 0, 0, 0);
        if (hDate > today) {
            upcoming.push(holiday);
            if (upcoming.length === count) break;
        }
    }
    return upcoming;
};

const calculateOrderSand = (wo) => {
    let autoSandKg = parseFloat(wo.route_sand_kg) || 0;
    
    if (autoSandKg === 0) {
        if (wo.volumes && wo.volumes.length > 0) {
            wo.volumes.forEach(vol => {
                const surface = parseFloat(vol.quantity) || 0;
                const thickness = parseFloat(vol.thickness) || 0;
                autoSandKg += (surface * thickness * 16);
            });
        } else {
            const fallbackSurface = parseFloat(wo.surface_area) || parseFloat(wo.surface) || parseFloat(wo.surface_m2) || 0;
            const fallbackThick = parseFloat(wo.thickness) || parseFloat(wo.thickness_cm) || 0;
            autoSandKg = fallbackSurface * fallbackThick * 16;
        }
    }
    
    return autoSandKg / 1000;
};

export const formatAddressCityFirst = (address) => {
    if (!address) return '';
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    const nonCountry = parts.filter(p => !/^(belgique|belgie|belgië|belgium|belgia|france|nederland|luxembourg|romania|românia)$/i.test(p));
    const list = nonCountry.length > 0 ? nonCountry : parts;

    const streetPrefixRe = /^(rue|av\.?|avenue|chauss[eé]e|clos|boulevard|bd\.?|place|dr[eè]ve|chemin|route|all[eé]e|impasse|square|sentier|steenweg|straat|laan|weg|plein|dreef)\b/i;

    // 1. Prefer a part with a 4-digit postal code that is not a street name
    const zipCityPart = list.find(p => /\b\d{4}\b/.test(p) && !streetPrefixRe.test(p));
    if (zipCityPart) {
        const cleaned = zipCityPart.replace(/\b\d{4,6}\b/g, '').replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
        if (cleaned) {
            return cleaned === cleaned.toUpperCase() && cleaned.length > 3
                ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
                : cleaned;
        }
    }

    // 2. If second part exists and isn't a street, clean digits from it
    if (list.length >= 2 && !streetPrefixRe.test(list[1])) {
        const cleaned = list[1].replace(/\d+/g, '').replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
        if (cleaned) {
            return cleaned === cleaned.toUpperCase() && cleaned.length > 3
                ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
                : cleaned;
        }
    }

    // 3. Fallback to first part without postal code
    const firstClean = list[0].replace(/\b\d{4,6}\b/g, '').replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
    if (firstClean) {
        return firstClean === firstClean.toUpperCase() && firstClean.length > 3
            ? firstClean.charAt(0).toUpperCase() + firstClean.slice(1).toLowerCase()
            : firstClean;
    }
    return address;
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
    onOrderComplete,
    isPartner = false,
    apiClient = api,
    apiBasePath = '/admin/work-orders'
}) {
    const [currentDate, setCurrentDate] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get('date');
        if (dateParam) {
            const parsed = new Date(dateParam + 'T00:00:00');
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    });
    const [syncing, setSyncing] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const hasAutoScrolled = useRef(false); // prevent re-jumping on data refresh
    const lastSwipeTime = useRef(0); // prevent accidental click after scroll
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOrder, setDraggedOrder] = useState(null);
    const [hoveredOrder, setHoveredOrder] = useState(null);
    const [hoveredDay, setHoveredDay] = useState(null);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [animatingOrder, setAnimatingOrder] = useState(null);
    const [deletedIds, setDeletedIds] = useState(new Set()); // Optimistic UI for instant deletion
    const [pendingReschedule, setPendingReschedule] = useState(null);
    const [heldOrder, setHeldOrder] = useState(null); // the work order stored in the holding area
    const [planningTime, setPlanningTime] = useState('08:00');
    const [planningNotify, setPlanningNotify] = useState(false);
    const [isSelectingForHolding, setIsSelectingForHolding] = useState(false);
    const [resizingOrder, setResizingOrder] = useState(null); // { id, duration }
    
    const handleResizeStart = (e, wo) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.pointerId) {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {}
        }
        
        const startX = e.clientX;
        const startDuration = wo.duration_days || 1;
        // Estimate the width of one day based on the card's current width and duration
        const cellWidth = e.currentTarget.parentElement.offsetWidth / startDuration;
        
        setResizingOrder({ id: wo.id, duration: startDuration });
        
        const handleMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const durationDelta = Math.round(dx / cellWidth);
            const newDuration = Math.max(1, startDuration + durationDelta);
            setResizingOrder({ id: wo.id, duration: newDuration });
        };
        
        const handleMouseUp = async (upEvent) => {
            document.removeEventListener('pointermove', handleMouseMove);
            document.removeEventListener('pointerup', handleMouseUp);
            document.removeEventListener('pointercancel', handleMouseUp);
            
            const dx = upEvent.clientX - startX;
            const durationDelta = Math.round(dx / cellWidth);
            const finalDuration = Math.max(1, startDuration + durationDelta);
            
            if (finalDuration !== startDuration) {
                try {
                    const res = await apiClient.put(`${apiBasePath}/${wo.id}`, { duration_days: finalDuration });
                    showToast(t('planning.duration_updated', 'La durée a été mise à jour avec succès'), 'success');
                    if (onOrderRescheduled) {
                        onOrderRescheduled(wo.id, wo.start_date || wo.deadline_date, wo.start_time || '08:00', false, finalDuration, res.data);
                    } else {
                        window.location.reload();
                    }
                } catch (err) {
                    console.error('Error updating duration:', err);
                }
            }
            setResizingOrder(null);
            if (upEvent.pointerId) {
                try {
                    upEvent.currentTarget.releasePointerCapture(upEvent.pointerId);
                } catch (err) {}
            }
        };
        
        document.addEventListener('pointermove', handleMouseMove, { passive: false });
        document.addEventListener('pointerup', handleMouseUp);
        document.addEventListener('pointercancel', handleMouseUp);
    };
    const containerRef = useRef(null);
    const { openDialog, showToast } = useUIStore();
    const { tenant } = useTenantStore();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [completing, setCompleting] = useState(null);

    const handleComplete = async (wo, e) => {
        e.stopPropagation();
        if (completing) return;

        const woDate = new Date(wo.start_date || wo.deadline_date);
        woDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (woDate > today) {
            toast.error(t('planning.cannot_complete_future', 'Vous ne pouvez pas terminer un travail dans le futur.'));
            return;
        }

        setCompleting(wo.id);
        try {
            await apiClient.put(`${apiBasePath}/${wo.id}`, { status: 'completed' });
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
        
        const dayObj = new Date(day);
        dayObj.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dayObj > today) {
            toast.error(t('planning.cannot_complete_future_day', 'Vous ne pouvez pas terminer des travaux dans le futur.'));
            return;
        }

        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOrders = weeklyOrders.filter(wo => {
            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
            return ds === dayStr && wo.status !== 'completed';
        });
        if (!dayOrders.length) return;
        setSyncing(true);
        try {
            await Promise.all(dayOrders.map(wo =>
                apiClient.put(`${apiBasePath}/${wo.id}`, { status: 'completed' })
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
            await apiClient.put(`${apiBasePath}/${wo.id}`, { status: 'confirmed' });
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
                apiClient.put(`${apiBasePath}/${wo.id}`, { status: 'confirmed' })
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

    const handleDropHeldOrder = async (date, timeStr) => {
        if (!heldOrder) return;
        
        // --- PREVENT DROPPING IN THE PAST ---
        const dropDateObj = new Date(date);
        dropDateObj.setHours(0, 0, 0, 0);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        if (dropDateObj < todayObj) {
            toast.error(t('planning.cannot_move_past', 'Vous ne pouvez pas déplacer un travail dans le passé.'));
            return;
        }

        const dateStr = format(date, 'yyyy-MM-dd');
        setSyncing(true);
        try {
            const payload = {
                start_date: dateStr,
                deadline_date: dateStr,
                start_time: timeStr || '08:00',
                status: 'confirmed'
            };
            await apiClient.put(`${apiBasePath}/${heldOrder.id}`, payload);
            const droppedId = heldOrder.id;
            setHeldOrder(null);
            setIsSelectingForHolding(false);
            if (onOrderRescheduled) onOrderRescheduled(droppedId, dateStr, timeStr || '08:00');
            else window.location.reload();
        } catch (error) {
            console.error('Error dropping held order:', error);
        } finally {
            setSyncing(false);
        }
    };


    const getLocale = () => {
        if (i18n.language?.startsWith('ro')) return ro;
        if (i18n.language?.startsWith('nl')) return nl;
        if (i18n.language?.startsWith('fr')) return fr;
        if (i18n.language?.startsWith('de')) return de;
        return enUS;
    };
    const dateLocale = getLocale();

    // Generate week days (Monday to Sunday, 7 or 14 days in Ultra-Wide / Full Screen) - MEMOIZED
    const ULTRA_WIDE_QUERY = '(min-width: 2480px), (min-width: 2350px) and (min-aspect-ratio: 25/10)';
    const [isUltraWideViewport, setIsUltraWideViewport] = useState(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia(ULTRA_WIDE_QUERY).matches;
    });
    const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(() => {
        if (typeof document === 'undefined') return false;
        return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    });
    const [calendarWeeksPref, setCalendarWeeksPref] = useState(null); // null = auto (2 on full/5K, 1 on normal), or manual 1 | 2

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia(ULTRA_WIDE_QUERY);
        const updateMatch = () => setIsUltraWideViewport(mq.matches);
        updateMatch();
        mq.addEventListener('change', updateMatch);
        const handleJumpDate = (e) => {
            if (e?.detail?.date) {
                setCurrentDate(new Date(e.detail.date));
            }
        };
        window.addEventListener('jump-to-calendar-date', handleJumpDate);
        return () => {
            mq.removeEventListener('change', updateMatch);
            window.removeEventListener('jump-to-calendar-date', handleJumpDate);
        };
    }, []);

    useEffect(() => {
        const syncFs = () => {
            const fsActive = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
            setIsBrowserFullscreen(fsActive);
        };
        document.addEventListener('fullscreenchange', syncFs);
        document.addEventListener('webkitfullscreenchange', syncFs);
        return () => {
            document.removeEventListener('fullscreenchange', syncFs);
            document.removeEventListener('webkitfullscreenchange', syncFs);
        };
    }, []);

    const showTwoWeeks = calendarWeeksPref !== null
        ? calendarWeeksPref === 2
        : Boolean(isUltraWideViewport || isCalendarFull || isBrowserFullscreen);
    const numDays = showTwoWeeks ? 14 : 7;
    const gridColsTemplate = showTwoWeeks
        ? '1fr 1fr 1fr 1fr 1fr 1fr 0.6fr 1fr 1fr 1fr 1fr 1fr 1fr 0.6fr'
        : '1fr 1fr 1fr 1fr 1fr 1fr 0.6fr';

    const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const weekDays = useMemo(() => Array.from({ length: numDays }).map((_, i) => addDays(weekStart, i)), [weekStart, numDays]);

    const isCurrentWeek = isSameWeek(currentDate, new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, numDays - 1);
    const weekLabel = (isCurrentWeek && !showTwoWeeks)
        ? t('admin_overview.current_week_short', 'Săpt. curentă') 
        : `${format(weekStart, 'dd MMM', { locale: dateLocale })} - ${format(weekEnd, 'dd MMM', { locale: dateLocale })}`;

    // Filter work orders that fall in this week
    const weekDayStrings = useMemo(() => weekDays.map(d => format(d, 'yyyy-MM-dd')), [weekDays]);

    // Filter work orders that fall in this week - highly optimized string matching + dedup
    const weeklyOrders = useMemo(() => {
        const seen = new Set();
        const result = workOrders.map(wo => {
            if (pendingReschedule && String(wo.id) === String(pendingReschedule.id)) {
                console.log(`[weeklyOrders] Overriding date for ${wo.id} to ${pendingReschedule.start_date}`);
                return {
                    ...wo,
                    start_date: pendingReschedule.start_date,
                    start_time: planningTime || pendingReschedule.start_time
                };
            }
            return wo;
        }).filter(wo => {
            if (seen.has(wo.id)) return false;
            seen.add(wo.id);
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return false;
            const ds = dateStr.split('T')[0];
            return weekDayStrings.includes(ds);
        });
        return result;
    }, [workOrders, weekDayStrings, pendingReschedule, planningTime]);

    // O(N) grouping by date to prevent O(N * 7) filtering during render
    const ordersByDateStr = useMemo(() => {
        const dict = {};
        weeklyOrders.forEach(wo => {
            const ds = (wo.start_date || wo.deadline_date || '').split('T')[0];
            if (!ds) return;
            if (!dict[ds]) dict[ds] = [];
            dict[ds].push(wo);
        });
        return dict;
    }, [weeklyOrders]);

    // Pre-sort orders to prevent re-sorting on every render frame
    const sortedWeeklyOrders = useMemo(() => {
        return [...weeklyOrders].sort((a, b) => {
            const tA = a.start_time ? String(a.start_time) : '07:00';
            const tB = b.start_time ? String(b.start_time) : '07:00';
            return tA.localeCompare(tB);
        });
    }, [weeklyOrders]);

    // Calculate sequential index of orders for a team on a specific day
    const teamDailyOrderIndices = useMemo(() => {
        const counters = {}; // key: `${team_id}_${dateStr}`, value: counter
        const indices = {};  // key: `wo.id`, value: index (0 = first)
        
        // We need a fully sorted array by Date THEN Time to process sequentially
        const fullySorted = [...weeklyOrders].sort((a, b) => {
            const dA = (a.start_date || a.deadline_date || '').split('T')[0];
            const dB = (b.start_date || b.deadline_date || '').split('T')[0];
            if (dA !== dB) return dA.localeCompare(dB);
            
            const tA = a.start_time ? String(a.start_time) : '07:00';
            const tB = b.start_time ? String(b.start_time) : '07:00';
            return tA.localeCompare(tB);
        });
        
        fullySorted.forEach(wo => {
            const dateStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
            const teamId = wo.assigned_team_id || 'unassigned';
            const key = `${teamId}_${dateStr}`;
            
            if (counters[key] === undefined) counters[key] = 0;
            indices[wo.id] = counters[key];
            counters[key]++;
        });
        
        return indices;
    }, [weeklyOrders]);

    const [bases, setBases] = useState([]);
    const getDistanceTextForOrder = (wo) => {
        // REGULĂ STRICTĂ: Totul se citește din baza de date
        const rawDist = wo.route_distance_km || (wo.prices?.distance_km ? parseFloat(wo.prices.distance_km) * 2 : 0);
        if (!rawDist || rawDist === 0) return null;
        
        const dist = Math.round(rawDist);
        const orderIndex = teamDailyOrderIndices[wo.id] || 0;
        
        // Dacă e a doua (sau următoarea) lucrare pe ziua respectivă pentru această echipă, se adaugă '+'
        const isLeg = orderIndex > 0; 
        return isLeg ? `+ ${dist} km` : `${dist} km`;
    };


    const navigateWeek = (dir) => {
        setCurrentDate(prev => addDays(prev, dir * 7));
    };

    const totalsPerDay = useMemo(() => {
        const map = {};
        weeklyOrders.forEach(wo => {
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return;
            try {
                const datePart = dateStr.split('T')[0];
                if (!map[datePart]) map[datePart] = { sand: 0, surface: 0 };
                
                map[datePart].sand += calculateOrderSand(wo);
                
                const finalVols = Array.isArray(wo.volumes) ? wo.volumes : [];
                const sumVol = finalVols.reduce((sum, v) => sum + (parseFloat(v.quantity) || 0), 0);
                const fallbackSurf = parseFloat(wo.surface_area) || parseFloat(wo.surface) || parseFloat(wo.surface_m2) || 0;
                map[datePart].surface += sumVol > 0 ? sumVol : fallbackSurf;
            } catch (e) {}
        });
        return map;
    }, [weeklyOrders]);

    const { dynamicStartHour, dynamicEndHour } = useMemo(() => {
        if (!weeklyOrders || weeklyOrders.length === 0) {
            return { dynamicStartHour: 7, dynamicEndHour: 15 };
        }
        let minH = 23;
        let maxH = 0;
        weeklyOrders.forEach(wo => {
            if (deletedIds.has(wo.id)) return;
            const tStr = wo.start_time ? String(wo.start_time) : '08:00';
            const [h] = tStr.split(':').map(Number);
            if (!isNaN(h)) {
                if (h < minH) minH = h;
                if (h > maxH) maxH = h;
            }
        });
        if (minH > maxH) {
            return { dynamicStartHour: 7, dynamicEndHour: 15 };
        }
        // Doar 1 singură oră liberă în sus față de prima lucrare existentă (ex: 08:00 -> începe la 07:00)
        const startH = Math.max(6, minH - 1);
        // Doar 1 singură oră liberă în jos față de ultima lucrare existentă (ex: 15:00 -> ultimul rând este 16:00; dacă se adaugă la 16:00 -> apare automat 17:00)
        const endH = Math.min(22, maxH + 2);
        return { dynamicStartHour: startH, dynamicEndHour: endH };
    }, [weeklyOrders, deletedIds]);

    const END_HOUR = dynamicEndHour;

    const getGridRowFromTime = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 2;
        const [hours] = timeStr.split(':').map(Number);
        if (isNaN(hours)) return 2;
        const row = hours - dynamicStartHour + 1;
        const numRows = END_HOUR - dynamicStartHour;
        const finalRow = Math.max(1, Math.min(numRows, row));
        return isNaN(finalRow) ? 2 : finalRow;
    };

    const hasAutoScrolledToData = useRef(false);

    useEffect(() => {
        if (containerRef.current) {
            // Position view directly at the first occupied hour (e.g. 08:00), keeping the 1 free buffer hour (07:00) accessible 1 row above
            const hasOrders = weeklyOrders && weeklyOrders.some(wo => !deletedIds.has(wo.id));
            containerRef.current.scrollTop = hasOrders ? 120 : 0;
            setShowScrollHint(false);
        }
    }, [weeklyOrders, dynamicStartHour, dynamicEndHour, deletedIds]);

    const [swipeDir, setSwipeDir] = useState(0);
    const [swipePhase, setSwipePhase] = useState('idle');
    const [showPreloader, setShowPreloader] = useState(false);
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
    const [dragOffset, setDragOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const preloaderTimerRef = useRef(null);

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
        
        if (Math.abs(distanceX) > 10 || Math.abs(distanceY) > 10) {
            lastSwipeTime.current = Date.now();
        }

        const minSwipeDistance = 60;
        
        if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
            const direction = distanceX > 0 ? 1 : -1;
            setIsSwiping(false);
            setDragOffset(0);
            // Show preloader for 3 seconds
            if (preloaderTimerRef.current) clearTimeout(preloaderTimerRef.current);
            setShowPreloader(true);
            preloaderTimerRef.current = setTimeout(() => setShowPreloader(false), 1500);
            // Phase 1: calendar slides out
            setSwipeDir(direction);
            setSwipePhase('exit');
            setTimeout(() => {
                navigateWeek(direction);
                setSwipePhase('enter');
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
        <>
            {/* MOBILE VIEW - COMPLETELY UNRESTRICTED */}
            <div className="block md:hidden w-full min-h-[calc(100vh-200px)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <MobileAgenda 
                    orders={weeklyOrders}
                    onOrderClick={(wo) => {
                        if (isSelectingForHolding) {
                            const dateStr = wo.start_date || wo.deadline_date;
                            const parsedDate = dateStr ? new Date(dateStr.split('T')[0]) : null;
                            let isPast = false;
                            if (parsedDate) {
                                const dropDateObj = new Date(parsedDate);
                                dropDateObj.setHours(0, 0, 0, 0);
                                const todayObj = new Date();
                                todayObj.setHours(0, 0, 0, 0);
                                isPast = dropDateObj < todayObj;
                            }
                            if (isPast) {
                                toast.error(t('planning.cannot_move_past', 'Vous ne pouvez pas déplacer un travail depuis le passé.'));
                                return;
                            }
                            setHeldOrder(wo);
                            setIsSelectingForHolding(false);
                            return;
                        }
                        if (onOrderClick) onOrderClick(wo);
                        else navigate(`/admin/work-orders/${wo.id}`, { state: { from: '/admin/planning' } });
                    }}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                />
            </div>
            
            <div 
                ref={calendarSwipeRef}
                className={`hidden md:flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden flex-col relative ${isCalendarFull ? 'h-full' : 'h-[820px]'}`}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEndEvent}
            >
                {/* Header — Fixed 56px height matching DEVIS EN ATTENTE header with Apple Specular Glass finish */}
            <div
                className="apple-header-glass px-4 h-[56px] shrink-0 flex flex-col justify-center border-b border-white/20"
                style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}
            >
                {/* Top Row: Date, Teams, and Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-white" />
                            <h2 className="text-lg font-black text-white capitalize tracking-tight">
                                {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                            </h2>
                        </div>
                        
                        {/* Echipe mutată aici, lângă lună */}
                        {isCalendarFull && teams && teams.length > 0 && (
                            <div className="flex items-center gap-2 shrink-0 ml-4 hidden md:flex">
                                <span className="text-[10px] font-black text-white/70 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1" title={t('admin_overview.trucks_teams', 'Équipes')}>
                                    <Truck className="w-4 h-4"/>
                                </span>
                                <div className="flex gap-2 items-center">
                                    {teams.map(team => (
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
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                        {/* Holding Area (Moved to the right as requested) */}
                        <div 
                            className={`flex items-center justify-center ${heldOrder ? 'w-auto px-3.5' : 'w-9'} h-9 rounded-full border border-dashed ${isSelectingForHolding ? 'border-yellow-300 bg-yellow-400/25 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse' : heldOrder ? 'border-white bg-white/25 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/40 hover:border-white/80 bg-white/15 hover:bg-white/25'} transition-all cursor-pointer relative shrink-0`}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const draggedWoId = e.dataTransfer.getData("text/plain");
                                if (draggedWoId) {
                                    const draggedWo = workOrders.find(o => String(o.id) === draggedWoId);
                                    if (draggedWo) setHeldOrder(draggedWo);
                                }
                            }}
                            draggable={!!heldOrder}
                            onDragStart={(e) => {
                                if (heldOrder) {
                                    e.dataTransfer.setData("text/plain", String(heldOrder.id));
                                    e.dataTransfer.setData("type", "workOrder");
                                }
                            }}
                            onDragEnd={(e) => {
                                if (e.dataTransfer.dropEffect !== "none") {
                                    setTimeout(() => setHeldOrder(null), 500);
                                }
                            }}
                            onClick={() => {
                                if (heldOrder) {
                                    // Do nothing on container click if already holding. Let the X button clear it.
                                } else {
                                    setIsSelectingForHolding(!isSelectingForHolding);
                                }
                            }}
                            title={heldOrder ? t('planning.holding_area_active', 'Choisissez une date/heure dans le calendrier pour déplacer la commande') : t('planning.holding_area', 'Cliquez pour sélectionner une commande à déplacer vers une autre semaine, ou glissez-la ici')}
                        >
                            {isSelectingForHolding && !heldOrder && (
                                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"></div>
                            )}
                            {heldOrder ? (
                                <div className="flex items-center gap-2 text-white text-xs font-bold">
                                    <Clock className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                                    <div className="flex flex-col text-left leading-none">
                                        <span className="truncate max-w-[110px] text-[11px]">{heldOrder.client_name || heldOrder.id.slice(0, 8)}</span>
                                        <span className="text-[8.5px] font-medium text-white/75">
                                            {heldOrder.start_date?.split('T')[0]} {heldOrder.start_time}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHeldOrder(null);
                                            setIsSelectingForHolding(false);
                                        }}
                                        className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors"
                                        title={t('planning.holding_area_clear', 'Anulează')}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <Move className="w-4 h-4 text-white/90" />
                            )}
                        </div>

                        {/* 1 Week / 2 Weeks Toggle Pill */}
                        <div className="hidden md:flex items-center h-9 bg-white/15 rounded-full p-1 border border-white/25 shadow-xs">
                            <button
                                type="button"
                                onClick={() => setCalendarWeeksPref(1)}
                                className={`h-7 px-3 rounded-full text-xs font-extrabold transition-all flex items-center justify-center ${
                                    !showTwoWeeks
                                        ? 'bg-white shadow-xs'
                                        : 'text-white/85 hover:text-white'
                                }`}
                                style={!showTwoWeeks ? { color: tenant?.primary_color || '#2563eb' } : undefined}
                                title="Afficher 1 semaine (7 jours)"
                            >
                                1 Sem.
                            </button>
                            <button
                                type="button"
                                onClick={() => setCalendarWeeksPref(2)}
                                className={`h-7 px-3 rounded-full text-xs font-extrabold transition-all flex items-center justify-center ${
                                    showTwoWeeks
                                        ? 'bg-white shadow-xs'
                                        : 'text-white/85 hover:text-white'
                                }`}
                                style={showTwoWeeks ? { color: tenant?.primary_color || '#2563eb' } : undefined}
                                title="Afficher 2 semaines (14 jours - Mode 5K / Plein écran)"
                            >
                                2 Sem.
                            </button>
                        </div>

                        {toggleCalendarFullscreen && (
                            <button 
                                onClick={toggleCalendarFullscreen} 
                                className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center shadow-xs shrink-0 ${
                                    isCalendarFull
                                        ? 'bg-white border-white'
                                        : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                                }`}
                                style={isCalendarFull ? { color: tenant?.primary_color || '#2563eb' } : undefined}
                                title={isCalendarFull ? 'Ieși din Focus Calendar (ESC)' : 'Focus doar pe Calendarul de Planificare'}
                            >
                                {isCalendarFull
                                    ? <Shrink className="w-4 h-4 shrink-0" />
                                    : <Scan className="w-4 h-4 shrink-0" />
                                }
                            </button>
                        )}

                        <div className="flex items-center gap-1 h-9 bg-white/15 rounded-full px-1 border border-white/25 shadow-xs backdrop-blur-sm">
                            <button onClick={() => navigateWeek(-1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-white min-w-[105px] text-center whitespace-nowrap">{weekLabel}</span>
                            <button onClick={() => navigateWeek(1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Calendar Swipe Animation Wrapper */}
            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">

                {/* Swipe Preloader — card glassmorphism fără fundal întunecat */}
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                    style={{
                        opacity: showPreloader ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {/* Card glassmorphism simplu */}
                    <div style={{
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        background: 'rgba(255,255,255,0.22)',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '32px',
                        padding: '24px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                        transform: showPreloader ? 'scale(1)' : 'scale(0.6)',
                        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                        {tenant?.favicon_url ? (
                            <img
                                src={tenant.favicon_url.startsWith('http') ? tenant.favicon_url : `${typeof window !== 'undefined' ? window.location.origin : ''}${tenant.favicon_url}`}
                                alt="favicon"
                                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 14, display: 'block' }}
                            />
                        ) : tenant?.logo_url ? (
                            <img
                                src={tenant.logo_url.startsWith('http') ? tenant.logo_url : `${typeof window !== 'undefined' ? window.location.origin : ''}${tenant.logo_url}`}
                                alt="logo"
                                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 14, display: 'block' }}
                            />
                        ) : (
                            <CalendarIcon style={{ width: 44, height: 44, color: tenant?.primary_color || '#3b82f6' }} />
                        )}
                    </div>
                </div>

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
                className="flex-1 hidden md:flex relative overflow-auto custom-scrollbar"
            >
                {/* Time Gutter */}
                <div className="w-10 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 sticky left-0 z-20">
                    <div className="h-14 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-900/80 z-20" />
                    {Array.from({ length: END_HOUR - dynamicStartHour }).map((_, i) => (
                        <div key={i} className="h-[120px] border-b border-slate-200 dark:border-slate-800 flex items-start justify-center text-[11px] text-slate-500 font-bold pt-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                            {`${(i + dynamicStartHour).toString().padStart(2, '0')}:00`}
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className={`flex-1 ${showTwoWeeks ? 'min-w-[1280px]' : 'min-w-[700px]'}`}>

                    {/* Header: Days */}
                    <div className="grid border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-30" style={{ gridTemplateColumns: gridColsTemplate }}>
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dailyTotals = totalsPerDay[dayStr] || { sand: 0, surface: 0 };
                            const sandDisplay = dailyTotals.sand > 0 ? `${dailyTotals.sand.toFixed(1)}T` : '';
                            const surfDisplay = dailyTotals.surface > 0 ? `${dailyTotals.surface.toFixed(0)}m²` : '';
                            const holidayInfo = PUBLIC_HOLIDAYS_BE.find(h => h.date === dayStr);

                            return (
                                <div
                                    key={i}
                                    className={`h-14 flex flex-col items-center justify-center ${i === 6 && showTwoWeeks ? 'border-r-2 border-r-blue-400/70 dark:border-r-blue-500/70' : 'border-r border-slate-200 dark:border-slate-800'} relative ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : (holidayInfo ? 'bg-red-50/50 dark:bg-red-900/10' : '')}`}
                                    onMouseEnter={() => setHoveredDay(i)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    onDoubleClick={(e) => handleUnCompleteDay(day, e)}
                                    title={holidayInfo ? holidayInfo.name : ''}
                                >
                                    <span className={`text-[11px] uppercase font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : (holidayInfo ? 'text-red-500' : 'text-slate-500')}`}>
                                        {format(day, 'EEE', { locale: dateLocale })}
                                    </span>
                                    <span className={`text-sm font-black leading-none mt-0.5 ${isToday ? 'text-blue-600 dark:text-blue-400' : (holidayInfo ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200')}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {(dailyTotals.sand > 0 || dailyTotals.surface > 0) && !holidayInfo && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {dailyTotals.sand > 0 && (
                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500" title={t('admin_overview.total_sand_day', 'Total nisip estimat pentru această zi')}>
                                                    {sandDisplay}
                                                </span>
                                            )}
                                            {dailyTotals.sand > 0 && dailyTotals.surface > 0 && (
                                                <span className="text-[9px] text-slate-300">|</span>
                                            )}
                                            {dailyTotals.surface > 0 && (
                                                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400" title={t('admin_overview.total_surf_day', 'Total suprafață (m²) pentru această zi')}>
                                                    {surfDisplay}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {holidayInfo && (
                                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight mt-0.5 max-w-[90%] truncate">
                                            {t(`holidays.${holidayInfo.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}`, holidayInfo.name)}
                                        </span>
                                    )}
                                    {hoveredDay === i && (() => {
                                        const dayOrders = ordersByDateStr[dayStr] || [];
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
                    <div className="relative grid bg-slate-50/30 dark:bg-slate-900/30" style={{ gridTemplateColumns: gridColsTemplate, gridTemplateRows: `repeat(${END_HOUR - dynamicStartHour}, minmax(120px, 120px))` }}>
                        {weeklyOrders.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <span className="text-slate-400 text-sm">{t('admin_overview.no_orders_week', 'Nicio comandă în această săptămână')}</span>
                            </div>
                        )}
                        
                        {/* Grid Lines acting as Drop Zones */}
                        {Array.from({ length: (END_HOUR - dynamicStartHour) * numDays }).map((_, i) => {
                            const dayIndex = i % numDays;
                            const hourIndex = Math.floor(i / numDays);
                            const cellDayStr = format(weekDays[dayIndex], 'yyyy-MM-dd');
                            const isHoliday = PUBLIC_HOLIDAYS_BE.some(h => h.date === cellDayStr);
                            
                            return (
                                <div 
                                    key={i} 
                                    className={`group relative flex items-center justify-center ${dayIndex === 6 && showTwoWeeks ? 'border-r-2 border-r-blue-400/50 dark:border-r-blue-500/50' : 'border-r border-slate-200 dark:border-slate-800/60'} border-b border-slate-200 dark:border-slate-800/60 transition-colors cursor-pointer ${isHoliday ? 'bg-red-50 dark:bg-red-900/20' : ''} hover:bg-slate-100/50 dark:hover:bg-slate-800/50 ${isDragging ? 'hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''}`}
                                    onClick={() => {
                                        if (Date.now() - lastSwipeTime.current < 400) return; // Prevent accidental click after scroll
                                        if (heldOrder) {
                                            handleDropHeldOrder(weekDays[dayIndex], `${(hourIndex + dynamicStartHour).toString().padStart(2, '0')}:00`);
                                            return;
                                        }
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
                                        
                                        // --- PREVENT DROPPING IN THE PAST FOR WORK ORDERS ---
                                        if (type === "workOrder" || type === "quote") {
                                            const dropDateObj = new Date(weekDays[dayIndex]);
                                            dropDateObj.setHours(0, 0, 0, 0);
                                            const todayObj = new Date();
                                            todayObj.setHours(0, 0, 0, 0);
                                            
                                            if (dropDateObj < todayObj) {
                                                toast.error(t('planning.cannot_move_past', 'Vous ne pouvez pas déplacer un travail dans le passé.'));
                                                return;
                                            }
                                        }

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

                                        if (type === "quote") {
                                            const quoteId = e.dataTransfer.getData("id");
                                            if (!quoteId) return;
                                            setPlanningTime(targetTime);
                                            setPlanningNotify(false);
                                            setPendingReschedule({
                                                id: quoteId,
                                                start_date: targetDate,
                                                start_time: targetTime,
                                                status: 'planning'
                                            });
                                            return;
                                        }

                                        const woId = e.dataTransfer.getData("text/plain");
                                        if (!woId) return;

                                        const wo = workOrders.find(o => String(o.id) === woId);
                                        if (!wo) return;
                                        if (wo.start_date?.startsWith(targetDate) && wo.start_time === targetTime) return;

                                        console.log(`[onDrop Empty] setting pendingReschedule for ${woId} to ${targetDate}`);
                                        setPendingReschedule({
                                            id: woId,
                                            start_date: targetDate,
                                            start_time: targetTime,
                                            status: wo?.status === 'draft' ? 'planning' : undefined,
                                            instantSave: true
                                        });

                                        try {
                                            const res = await apiClient.put(`${apiBasePath}/${woId}`, {
                                                start_date: targetDate,
                                                start_time: targetTime,
                                                ...(wo?.status === 'draft' ? { status: 'planning' } : {})
                                            });
                                            if (onOrderRescheduled) {
                                                onOrderRescheduled(woId, targetDate, targetTime, false, undefined, res.data);
                                            }
                                        } catch (err) {
                                            console.error("Failed to instant save rescheduled order", err);
                                        } finally {
                                            setPendingReschedule(null);
                                        }
                                    }}
                                >
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full flex items-center justify-center shadow-md pointer-events-none" style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}>
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Events overlay */}
                        {(() => {
                            const renderableOrders = [];
                            const dayOccupancy = {};
                            
                            const sortedOrders = sortedWeeklyOrders;
                            
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
                                    
                                    if (!dayOccupancy[dayIndex]) dayOccupancy[dayIndex] = {};
                                    if (!dayOccupancy[dayIndex][rowStart]) dayOccupancy[dayIndex][rowStart] = [];
                                    
                                    dayOccupancy[dayIndex][rowStart].push(wo.id);
                                    
                                    if (!deletedIds.has(wo.id)) {
                                        renderableOrders.push({ ...wo, dayIndex, rowStart });
                                    }
                                } catch (e) {}
                            });
                            
                            return renderableOrders.map(wo => {
                                const colorHex = wo.team?.color || wo.assigned_team_color || '#93c5fd';
                                
                                // Calculate offset to avoid overlap for custom 7-day or 14-day grid
                                const totalFr = showTwoWeeks ? 13.2 : 6.6;
                                const getColFr = (dIdx) => (dIdx % 7 === 6 ? 0.6 : 1);
                                let startFr = 0;
                                for (let i = 0; i < wo.dayIndex; i++) {
                                    startFr += getColFr(i);
                                }
                                const currentDuration = resizingOrder?.id === wo.id ? resizingOrder.duration : (wo.duration_days || 1);
                                const maxDurationVis = Math.min(currentDuration, numDays - wo.dayIndex);
                                
                                let spanFr = 0;
                                for (let i = 0; i < maxDurationVis; i++) {
                                    const dIdx = wo.dayIndex + i;
                                    spanFr += getColFr(dIdx);
                                }
                                
                                const baseLeftPercent = (startFr / totalFr) * 100;
                                let leftValue = `calc(${baseLeftPercent}% + 5px)`;
                                let widthValue = `calc(${(spanFr / totalFr) * 100}% - 10px)`;
                                
                                const overlappingWos = (dayOccupancy[wo.dayIndex] && dayOccupancy[wo.dayIndex][wo.rowStart]) || [wo.id];
                                const overlapCount = overlappingWos.length;
                                const overlapIndex = overlappingWos.indexOf(wo.id);
                                
                                if (overlapCount > 1 && maxDurationVis <= 1) {
                                    const baseWidthPercent = (getColFr(wo.dayIndex) / totalFr) * 100;
                                    const adjustedLeftPercent = baseLeftPercent + (baseWidthPercent * (overlapIndex / overlapCount));
                                    leftValue = `calc(${adjustedLeftPercent}% + 3px)`;
                                    const adjustedWidthPercent = baseWidthPercent / overlapCount;
                                    widthValue = `calc(${adjustedWidthPercent}% - 6px)`;
                                }
                                
                                const isThisDragged = draggedOrder === wo.id;
                                const isCompleted = wo.status === 'completed';
                                
                                // --- PREVENT DRAGGING PAST ORDERS ---
                                const woDateObj = new Date(wo.start_date || wo.deadline_date);
                                woDateObj.setHours(0, 0, 0, 0);
                                const todayObj = new Date();
                                todayObj.setHours(0, 0, 0, 0);
                                const isPast = woDateObj < todayObj;

                                const clientColorHex = (wo.client_color && wo.client_color.startsWith('#')) ? wo.client_color : colorHex;
                                const borderLeftColorVal = colorHex;
                                const borderColorVal = isCompleted ? 'rgba(148, 163, 184, 0.42)' : `${borderLeftColorVal}45`;
                                const isExternalSource = ['public_calculator', 'partner_portal', 'devis_online'].includes(wo.source_system) || wo.is_quote;

                                const lat = wo.site_latitude || wo.site_lat;
                                const lng = wo.site_longitude || wo.site_lng;
                                const staticMapLoc = (lat && lng) ? `${lat},${lng}` : null;

                                return (
                                    <div 
                                        key={wo.id}
                                        draggable={!resizingOrder}
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
                                        className={`group absolute flex flex-col p-1.5 rounded-xl shadow-sm dark:shadow-[0_4px_14px_rgba(0,0,0,0.45)] border transition-all duration-200 overflow-hidden select-none ${isPast ? '' : 'cursor-move'}
                                            ${!wo.assigned_team_id ? 'border-red-400 dark:border-red-500/80 border-2 border-dashed bg-red-50/90 dark:bg-red-950/45 z-20' : 'border-l-[4px] bg-white dark:bg-[#111c2d] z-10 hover:z-30 hover:scale-[1.02]'}
                                            ${isThisDragged ? 'opacity-50 scale-95 ring-2 ring-blue-500 shadow-xl z-50 !transition-none' : ''}
                                            ${syncing ? 'opacity-70 pointer-events-none' : ''} 
                                            ${isDragging && !isThisDragged ? 'pointer-events-none' : ''}
                                            ${wo.status === 'planning' && wo.client_notified === false ? 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}
                                            ${animatingOrder === wo.id ? 'animate-pulse ring-2 ring-green-500 scale-105 z-40' : ''}
                                            ${isSelectingForHolding && !isPast ? 'ring-2 ring-yellow-400 animate-pulse cursor-pointer' : ''}
                                            ${heldOrder?.id === wo.id ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/50' : ''}
                                            ${(pendingReschedule && String(pendingReschedule.id) === String(wo.id)) ? '!transition-none z-[60]' : ''}`}
                                        style={{
                                            top: `${(wo.rowStart - 1) * 120 + 4}px`,
                                            height: 'auto',
                                            minHeight: '111px',
                                            left: leftValue,
                                            width: widthValue,
                                            borderLeftColor: borderLeftColorVal,
                                            borderColor: borderColorVal,
                                            borderWidth: isCompleted ? '1.5px' : undefined,
                                            borderStyle: isCompleted ? 'dashed' : undefined,
                                            opacity: 1,
                                            zIndex: isThisDragged ? 50 : (10 + (wo._layoutIndex || 0)),
                                            pointerEvents: isDragging ? 'auto' : 'auto' // ensure it can receive drops!
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isSelectingForHolding) {
                                                if (isPast) {
                                                    toast.error(t('planning.cannot_move_past', 'Vous ne pouvez pas déplacer un travail depuis le passé.'));
                                                    return;
                                                }
                                                setHeldOrder(wo);
                                                setIsSelectingForHolding(false);
                                                return;
                                            }
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
                                            
                                            // Handle Work Order Drop → reschedule dragged order to this card's time
                                            const draggedWoId = e.dataTransfer.getData("text/plain");
                                            if (!draggedWoId || draggedWoId === String(wo.id)) return;
                                            
                                            const draggedWo = workOrders.find(o => String(o.id) === draggedWoId);
                                            if (!draggedWo) return;

                                            const targetDate = wo.start_date || wo.deadline_date;
                                            const targetTime = wo.start_time || '07:00';

                                            // If same date and same time, nothing to do
                                            if (draggedWo.start_date?.startsWith(targetDate) && draggedWo.start_time === targetTime) return;

                                            setPendingReschedule({
                                                id: draggedWoId,
                                                start_date: targetDate,
                                                start_time: targetTime,
                                                status: draggedWo.status === 'draft' ? 'planning' : undefined,
                                                instantSave: true
                                            });

                                            try {
                                                const res = await apiClient.put(`${apiBasePath}/${draggedWoId}`, {
                                                    start_date: targetDate,
                                                    start_time: targetTime,
                                                    ...(draggedWo.status === 'draft' ? { status: 'planning' } : {})
                                                });
                                                if (onOrderRescheduled) {
                                                    onOrderRescheduled(draggedWoId, targetDate, targetTime, false, undefined, res.data);
                                                }
                                            } catch (err) {
                                                console.error("Failed to instant save rescheduled order", err);
                                            } finally {
                                                setPendingReschedule(null);
                                            }
                                        }}
                                        title={`${(wo.client_name && wo.client_name !== 'None' ? wo.client_name : wo.title)} — trageți pentru a muta`}
                                    >
                                        {staticMapLoc && (
                                            <div 
                                                className="absolute right-0 bottom-0 w-[62%] pointer-events-none overflow-hidden rounded-br-xl opacity-60 dark:opacity-18 mix-blend-multiply dark:mix-blend-normal dark:invert dark:hue-rotate-180 dark:contrast-125 z-0" 
                                                style={{ top: '27px', WebkitMaskImage: 'linear-gradient(to right, transparent, black 52%)', maskImage: 'linear-gradient(to right, transparent, black 52%)' }}
                                            >
                                                <img 
                                                    src={`https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&size=400,300&z=14&l=map`} 
                                                    alt="Map" 
                                                    draggable="false"
                                                    className="w-full h-full object-cover pointer-events-none select-none" 
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                        <div className="flex flex-col flex-1 w-full relative z-10 justify-between">
                                            {/* TOP ROW: Name and Total Surface */}
                                            <div className="flex items-center justify-between gap-1 -mx-1.5 -mt-1.5 px-1.5 py-1 border-b rounded-t-xl" style={{ backgroundColor: borderLeftColorVal + '38', borderColor: borderLeftColorVal + '80' }}>
                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                    ) : isExternalSource ? (
                                                        <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: clientColorHex }} title="Sursă externă / Partener" />
                                                    ) : null}
                                                    <span className="text-[10.5px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.12] line-clamp-2 break-words">
                                                        {(wo.client_name && wo.client_name !== 'None' ? wo.client_name : wo.title)}
                                                    </span>
                                                </div>
                                                {(() => {
                                                    const finalVols = Array.isArray(wo.volumes) ? wo.volumes : [];
                                                    const sumVol = finalVols.reduce((sum, v) => sum + (parseFloat(v.quantity) || 0), 0);
                                                    const fallbackSurf = parseFloat(wo.surface_area) || parseFloat(wo.surface) || parseFloat(wo.surface_m2) || 0;
                                                    const displaySurf = sumVol > 0 ? parseFloat(sumVol.toFixed(2)) : parseFloat(fallbackSurf.toFixed(2));
                                                    if (displaySurf > 0) {
                                                        return <span className="text-[10px] font-black text-slate-800 dark:text-white shrink-0 bg-white/95 dark:bg-slate-950/85 border border-black/5 dark:border-white/15 px-1 py-0.5 rounded shadow-2xs tabular-nums leading-none whitespace-nowrap">{displaySurf}m²</span>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* ROW 2: Work Type & Thickness (avoids duplicating m² for single-volume orders so 'Chape' is never cut to 'C...') */}
                                            <div className="flex flex-col gap-0.5 mt-1 w-full">
                                                {(() => {
                                                    const finalVols = Array.isArray(wo.volumes) ? wo.volumes : [];
                                                    
                                                    if (finalVols.length > 0) {
                                                        const isSingleVol = finalVols.length === 1;
                                                        return finalVols.slice(0, 2).map((vol, idx) => {
                                                            let displayName = vol.name || vol.label;
                                                            if (!displayName || displayName.toLowerCase() === 'chape') {
                                                                displayName = isSingleVol ? 'Chape' : `Chape ${idx + 1}`;
                                                            }
                                                            const qtyPart = (!isSingleVol && vol.quantity) ? `${vol.quantity}m²` : '';
                                                            const thickPart = vol.thickness ? (isSingleVol ? `• ${vol.thickness}cm` : `×${vol.thickness}cm`) : '';
                                                            return (
                                                                <div key={idx} className="flex items-center text-[10px] text-slate-800 dark:text-slate-100 font-extrabold w-full leading-tight min-w-0">
                                                                    <Layers className="w-3 h-3 text-slate-500 dark:text-sky-400 mr-1 shrink-0" />
                                                                    <span className="truncate">{displayName}</span>
                                                                    {(qtyPart || thickPart) && (
                                                                        <span className="ml-1 shrink-0 tabular-nums font-black text-slate-900 dark:text-white">
                                                                            {qtyPart}{thickPart}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    } else {
                                                        const fallbackSurf = parseFloat(wo.surface_area) || parseFloat(wo.surface) || parseFloat(wo.surface_m2) || 0;
                                                        const fallbackThick = parseFloat(wo.thickness) || parseFloat(wo.thickness_cm) || 0;
                                                        if (fallbackSurf > 0) {
                                                            return (
                                                                <div className="flex items-center text-[10px] text-slate-800 dark:text-slate-100 font-extrabold w-full leading-tight min-w-0">
                                                                    <Layers className="w-3 h-3 text-slate-500 dark:text-sky-400 mr-1 shrink-0" />
                                                                    <span className="truncate">Chape</span>
                                                                    {fallbackThick > 0 && (
                                                                        <span className="ml-1 shrink-0 tabular-nums font-black text-slate-900 dark:text-white">
                                                                            • {fallbackThick}cm
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* ROW 3: Clean City / Locality Name across full card width */}
                                            <div
                                                className="flex items-center gap-1 mt-0.5 text-[10.5px] text-slate-800 dark:text-slate-100 font-bold truncate leading-tight"
                                                title={(wo.site_address || wo.site?.address || wo.address) || ''}
                                            >
                                                <MapPin className="w-3 h-3 shrink-0 text-rose-500 dark:text-rose-400" />
                                                <span className="truncate">
                                                    {formatAddressCityFirst(wo.site_address || wo.site?.address || wo.address) || t('common.no_location', 'Aucune adresse')}
                                                </span>
                                            </div>

                                            {/* ROW 4 (BOTTOM): Sand (T), Distance (KM) and Weather nicely styled over the map */}
                                            <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t" style={{ borderColor: borderLeftColorVal + '40' }}>
                                                <div className="flex items-center gap-1 min-w-0">
                                                    {(() => {
                                                        const sandVal = calculateOrderSand(wo);
                                                        return sandVal > 0 ? (
                                                            <span className="text-[9.5px] text-amber-800 dark:text-amber-300 font-black bg-amber-50/95 dark:bg-amber-500/20 border border-amber-200/90 dark:border-amber-400/35 px-1 py-0.5 rounded shadow-2xs shrink-0 tabular-nums leading-none">
                                                                {sandVal.toFixed(1)}T
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                    {(() => {
                                                        const distText = getDistanceTextForOrder(wo);
                                                        return distText ? (
                                                            <span className="text-[9.5px] text-fuchsia-600 dark:text-fuchsia-300 font-extrabold bg-white/85 dark:bg-slate-900/80 px-1 py-0.5 rounded border border-fuchsia-200/60 dark:border-fuchsia-800/40 shadow-2xs tabular-nums leading-none whitespace-nowrap">
                                                                {distText}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </div>
                                                
                                                <div className="flex items-center shrink-0">
                                                    {!isCompleted && (
                                                        <span className="text-[9.5px] text-slate-800 dark:text-slate-200 font-extrabold bg-white/85 dark:bg-slate-900/80 px-1 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/60 shadow-2xs leading-none">
                                                            <WeatherWidget lat={wo.site_latitude || 50.8503} lon={wo.site_longitude || 4.3517} dateStr={(wo.start_date || wo.deadline_date) + (wo.start_time ? `T${wo.start_time}` : '')} compact={true} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* RESIZE HANDLE */}
                                            {!isCompleted && isPartner && (
                                                <div 
                                                    className="absolute right-0 bottom-0 w-12 h-12 cursor-ew-resize z-20 flex items-end justify-end touch-none"
                                                    onPointerDown={(e) => handleResizeStart(e, wo)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                    title="Trage pentru a extinde durata"
                                                >
                                                    <div className="w-0 h-0 border-l-[18px] border-l-transparent border-b-[18px] border-b-slate-700 dark:border-b-slate-500 rounded-br-[10px] opacity-90"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
            {/* Planning Modal — Apple HIG Sheet / Alert */}
            {pendingReschedule && !pendingReschedule.instantSave && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setPendingReschedule(null)}>
                    <div className="w-full max-w-[390px] rounded-[24px] bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="rounded-[16px] bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5">
                            <div className="w-12 h-12 rounded-full bg-sky-500/12 dark:bg-sky-500/20 border border-sky-500/25 flex items-center justify-center mx-auto mb-3.5">
                                <CalendarIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                            </div>
                            <h3 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white text-center mb-4">{t('planning.modal_title', 'Détails de Planification')}</h3>
                            
                            <div className="space-y-3.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('planning.arrival_date', 'Date d\'arrivée')}</label>
                                        <input 
                                            type="date" 
                                            value={pendingReschedule.start_date || ''}
                                            onChange={e => setPendingReschedule({...pendingReschedule, start_date: e.target.value})}
                                            className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300/90 dark:border-slate-700 rounded-[12px] text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('planning.arrival_time', 'Heure (estimée)')}</label>
                                        <input 
                                            type="time" 
                                            value={planningTime}
                                            onChange={e => setPlanningTime(e.target.value)}
                                            className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300/90 dark:border-slate-700 rounded-[12px] text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                                        />
                                    </div>
                                </div>
                                {(() => {
                                    const holiday = PUBLIC_HOLIDAYS_BE.find(h => h.date === pendingReschedule.start_date);
                                    if (holiday) {
                                        return (
                                            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/25 rounded-[12px]">
                                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-semibold text-rose-900 dark:text-rose-200">
                                                        {t('planning.holiday_warning', 'Attention : Jour férié')}
                                                    </span>
                                                    <span className="text-xs text-rose-700 dark:text-rose-300">
                                                        {t(`holidays.${holiday.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}`, holiday.name)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                <div 
                                    onClick={() => setPlanningNotify(!planningNotify)}
                                    className={`flex items-start gap-3 p-3 rounded-[12px] cursor-pointer transition-colors border ${
                                        planningNotify 
                                            ? 'bg-sky-500/10 border-sky-500/25 dark:bg-sky-500/15 dark:border-sky-500/30' 
                                            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="flex h-5 items-center">
                                        <input
                                            type="checkbox"
                                            checked={planningNotify}
                                            readOnly
                                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 pointer-events-none"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[13px] font-semibold leading-5 ${planningNotify ? 'text-sky-900 dark:text-sky-100' : 'text-slate-900 dark:text-white'}`}>
                                            {isPartner ? 'Envoyer une notification à Davide Chape' : t('planning.send_notification', 'Envoyer une notification au client')}
                                        </span>
                                        <span className={`text-[11.5px] ${planningNotify ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {isPartner ? 'Un email sera envoyé avec les détails de la modification' : t('planning.notification_desc', 'Email et WhatsApp avec les détails du rendez-vous')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 mt-3">
                            <button 
                                type="button"
                                onClick={() => setPendingReschedule(null)}
                                className="flex-1 h-10 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-600/80 rounded-[14px] text-[13.5px] font-semibold transition-all cursor-pointer"
                            >
                                {t('planning.cancel_btn', 'Annuler')}
                            </button>
                            <button 
                                type="button"
                                onClick={async () => {
                                    if (!pendingReschedule) return;
                                    if (syncing) return;
                                    
                                    const { id, start_date, status } = pendingReschedule;
                                    setSyncing(true);
                                    
                                    try {
                                        const updatePayload = {
                                            start_date,
                                            start_time: planningTime,
                                            send_notification: planningNotify,
                                            ...(status ? { status } : {})
                                        };
                                        const res = await apiClient.put(`${apiBasePath}/${id}`, updatePayload);
                                        if (onOrderRescheduled) {
                                            onOrderRescheduled(id, start_date, planningTime, false, undefined, res.data);
                                        } else {
                                            window.location.reload();
                                        }
                                        setPendingReschedule(null);
                                    } catch (error) {
                                        console.error("Eroare la mutare/planificare comanda:", error);
                                    } finally {
                                        setSyncing(false);
                                    }
                                }}
                                disabled={syncing}
                                className={`flex-1 h-10 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-[14px] text-[13.5px] font-semibold shadow-sm shadow-sky-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer ${syncing ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {syncing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    t('planning.save_btn', 'Enregistrer')
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Popup — Apple HIG Alert */}
            {orderToDelete && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setOrderToDelete(null)}>
                    <div className="w-full max-w-[360px] rounded-[24px] bg-[#F2F4F8] dark:bg-slate-900 text-slate-900 dark:text-white backdrop-blur-3xl saturate-150 border-[1.5px] border-slate-300/95 dark:border-slate-600/85 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-[0_28px_64px_-12px_rgba(15,23,42,0.38),0_8px_24px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] p-3.5 overflow-hidden animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
                        <div className="rounded-[16px] bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5">
                            <div className="w-12 h-12 rounded-full bg-rose-500/12 dark:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center mx-auto mb-3.5">
                                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h3 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-snug">{t('admin_overview.delete_order', 'Supprimer la commande')}</h3>
                            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {t('admin_overview.delete_order_confirm', 'Êtes-vous sûr de vouloir supprimer la commande')} <span className="font-semibold text-slate-800 dark:text-slate-200">"{orderToDelete.title}"</span> ?
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 mt-3">
                            <button 
                                type="button"
                                onClick={() => setOrderToDelete(null)}
                                className="flex-1 h-10 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-600/80 rounded-[14px] text-[13.5px] font-semibold transition-all cursor-pointer"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button 
                                type="button"
                                onClick={async () => {
                                    const idToDelete = orderToDelete.id;
                                    setDeletedIds(prev => new Set(prev).add(idToDelete));
                                    setOrderToDelete(null);
                                    try {
                                        await apiClient.delete(`${apiBasePath}/${idToDelete}`);
                                        if (onOrderRescheduled) onOrderRescheduled();
                                        else window.location.reload();
                                    } catch (e) {
                                        console.error("Eroare la stergere:", e);
                                        setDeletedIds(prev => {
                                            const next = new Set(prev);
                                            next.delete(idToDelete);
                                            return next;
                                        });
                                    }
                                }}
                                className="flex-1 h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-[14px] text-[13.5px] font-semibold shadow-sm shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {t('common.yes_delete', 'Supprimer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
        </div>
        </div>
        </>
    );
}
