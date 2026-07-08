import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Navigation, Clock, CheckCircle2, Package, Check, Calendar } from 'lucide-react';
import WeatherWidget from './WeatherWidget';
import { format, addDays, startOfWeek, isSameDay, isSameWeek, subWeeks, addWeeks, parseISO } from 'date-fns';
import { ro, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default function MobileAgenda({ orders, onOrderClick, currentWeek, setCurrentWeek, isHistory = false }) {
    const { t, i18n } = useTranslation();
    const isFrench = i18n.language === 'fr';
    const locale = isFrench ? fr : ro;

    const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

    const ordersByDay = useMemo(() => {
        const grouped = {};
        days.forEach(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            grouped[dateStr] = [];
        });

        orders.forEach(wo => {
            const woDateStr = (wo.start_date || wo.deadline_date || '').split('T')[0];
            if (grouped[woDateStr]) {
                grouped[woDateStr].push(wo);
            }
        });

        // Sort orders inside each day by time
        Object.values(grouped).forEach(dayOrders => {
            dayOrders.sort((a, b) => {
                const tA = a.start_time || '00:00';
                const tB = b.start_time || '00:00';
                return tA.localeCompare(tB);
            });
        });

        return grouped;
    }, [orders, days]);

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

    return (
        <div className="flex flex-col gap-4 pb-10">
            {/* Navigare Saptamana */}
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <button 
                    onClick={() => setCurrentWeek(w => subWeeks(w, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {format(currentWeek, 'MMM yyyy', { locale })}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                        {format(currentWeek, 'd', { locale })} - {format(addDays(currentWeek, 6), 'd MMM', { locale })}
                    </span>
                </div>

                <button 
                    onClick={() => setCurrentWeek(w => addWeeks(w, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Zilele Saptamanii */}
            <div className="space-y-4">
                {days.filter(day => isHistory || new Date(format(day, "yyyy-MM-dd") + "T00:00:00") >= new Date(format(new Date(), "yyyy-MM-dd") + "T00:00:00")).map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayOrders = ordersByDay[dateStr] || [];
                    const isTodayFlag = isSameDay(day, new Date());

                    return (
                        <div key={dateStr} className="flex flex-col gap-2">
                            {/* Header Zi */}
                            <div className="flex items-center gap-2 px-1">
                                <div className={`w-2 h-2 rounded-full ${isTodayFlag ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                <h3 className={`text-sm font-bold capitalize ${isTodayFlag ? 'text-blue-600' : 'text-slate-700'}`}>
                                    {isTodayFlag ? t('general.today', 'Azi') + ' • ' + formatDayName(day) : formatDayName(day)}
                                </h3>
                                <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                    {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'comandă') : t('general.orders', 'comenzi')}
                                </span>
                            </div>

                            {/* Lista Comenzi pt Zi */}
                            {dayOrders.length > 0 ? (
                                <div className="space-y-3">
                                                                        {dayOrders.map(wo => {
                                        const time = wo.start_time || '--:--';
                                        
                                        let sandTons = 0;
                                        if (wo.actual_sand_quantity) {
                                            sandTons = parseFloat(wo.actual_sand_quantity) / 1000;
                                        } else {
                                            let totalKg = 0;
                                            (wo.volumes || []).forEach(vol => {
                                                const surface = parseFloat(vol.quantity) || 0;
                                                const thickness = parseFloat(vol.thickness) || 0;
                                                if (surface > 0 && thickness > 0) totalKg += surface * thickness * 16;
                                            });
                                            sandTons = totalKg / 1000;
                                        }

                                        const color = wo.assigned_team_color || '#3b82f6';
                                        const bgStyle = {
                                            backgroundColor: color + '1a',
                                            borderColor: color + '33',
                                            backdropFilter: 'blur(8px)',
                                            color: '#1e293b'
                                        };

                                        return (
                                            <button
                                                key={wo.id}
                                                onClick={() => onOrderClick(wo)}
                                                className="w-full text-left rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99]"
                                                style={bgStyle}
                                            >
                                                <div className="p-3.5 flex flex-col gap-2.5">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg shrink-0" style={{ backgroundColor: color + '26' }}>
                                                            <Clock className="w-3.5 h-3.5 opacity-80" />
                                                            <span className="text-sm font-bold opacity-90">{time}</span>
                                                        </div>
                                                        <div className="flex-1"></div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-[16px] leading-tight opacity-90">
                                                            {wo.client?.name || wo.client_name || 'Client Necunoscut'}
                                                        </h4>
                                                        <p className="text-sm font-medium leading-snug line-clamp-2 opacity-75">
                                                            {wo.title}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-start gap-1.5 mt-1 pt-2 border-t" style={{ borderColor: color + '26' }}>
                                                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                                                        <span className="text-xs font-medium leading-tight opacity-80">
                                                            {wo.site_address || wo.site?.address || wo.address || 'Fără adresă'}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-end pt-1 mt-1">
                                                        <div className="flex flex-col gap-1">
                                                            {sandTons > 0 ? (
                                                                <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: color + '1a' }}>
                                                                    {sandTons.toFixed(1)} T Nisip
                                                                </span>
                                                            ) : <span />}
                                                        </div>
                                                        
                                                        <div className="text-right flex-shrink-0 -mr-2 -mb-2">
                                                            {(wo.site_lat && wo.site_lng) ? (
                                                                <div className="scale-75 origin-bottom-right">
                                                                    <WeatherWidget lat={wo.site_lat} lon={wo.site_lng} dateStr={wo.start_date || dateStr} />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl p-4 flex items-center justify-center">
                                    <span className="text-xs font-medium text-slate-400">
                                        {t('general.no_orders_day', 'Nu ai comenzi pentru această zi.')}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
