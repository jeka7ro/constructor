import React, { useMemo } from 'react';
import { Clock, MapPin, Truck, ChevronRight, Navigation, Map, CheckCircle2, Calculator, ChevronLeft, Package, Check, Calendar } from 'lucide-react';
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


const distanceCache = {};

function GoogleMapsDistance({ lat1, lon1, lat2, lon2, label }) {
    const [distance, setDistance] = React.useState(null);
    
    React.useEffect(() => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return;
        if (!window.google || !window.google.maps) return;
        
        const key = `${lat1},${lon1}|${lat2},${lon2}`;
        if (distanceCache[key]) {
            setDistance(distanceCache[key]);
            return;
        }

        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
            {
                origins: [{ lat: parseFloat(lat1), lng: parseFloat(lon1) }],
                destinations: [{ lat: parseFloat(lat2), lng: parseFloat(lon2) }],
                travelMode: 'DRIVING',
            },
            (response, status) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    const distStr = response.rows[0].elements[0].distance.text;
                    distanceCache[key] = distStr;
                    setDistance(distStr);
                }
            }
        );
    }, [lat1, lon1, lat2, lon2]);

    if (!distance) return null;
    return <span>• {distance} {label}</span>;
}

export default function MobileAgenda({ orders, onOrderClick, currentDate, setCurrentDate, isHistory = false }) {
    const { t, i18n } = useTranslation();
    const isFrench = i18n.language === 'fr';
    const locale = isFrench ? fr : ro;

    const days = [currentDate];

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
                    onClick={() => setCurrentDate(d => addDays(d, -1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center flex-1 text-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {format(currentDate, 'MMM yyyy', { locale })}
                        </span>
                        {(() => {
                            const currentDateStr = format(currentDate, 'yyyy-MM-dd');
                            const currentDayOrders = ordersByDay[currentDateStr] || [];
                            const firstOrder = currentDayOrders.find(o => (o.site_latitude || o.site_lat) && (o.site_longitude || o.site_lng));
                            const weatherLat = firstOrder?.site_latitude || firstOrder?.site_lat;
                            const weatherLng = firstOrder?.site_longitude || firstOrder?.site_lng;
                            
                            if (weatherLat && weatherLng) {
                                return (
                                    <div className="scale-90 origin-left">
                                        <WeatherWidget lat={weatherLat} lon={weatherLng} dateStr={currentDateStr} isLarge={true} />
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <span className="text-sm font-bold text-slate-900 capitalize">
                        {format(currentDate, 'EEEE, d MMM', { locale })}
                    </span>
                </div>

                <button 
                    onClick={() => setCurrentDate(d => addDays(d, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Zilele Saptamanii */}
            <div className="space-y-4">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayOrders = ordersByDay[dateStr] || [];
                    const isTodayFlag = isSameDay(day, new Date());

                    return (
                        <div key={dateStr} className="flex flex-col gap-2">
                            {/* Header Zi - Ascuns pentru ca e deja in top header in view zilnic */}
                            {isTodayFlag && (
                                <div className="flex items-center gap-2 px-1 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                                        {t("general.today", "Aujourd'hui")}
                                    </h3>
                                    <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                        {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                    </span>
                                </div>
                            )}
                            {!isTodayFlag && (
                                <div className="flex justify-end px-1 mb-1">
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                        {dayOrders.length} {dayOrders.length === 1 ? t('general.order', 'chantier') : t('general.orders', 'chantiers')}
                                    </span>
                                </div>
                            )}

                            {/* Lista Comenzi pt Zi */}
                            {dayOrders.length > 0 ? (
                                <div className="space-y-3">
                                                                        {dayOrders.map((wo, index) => {
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

                                        let prevWo = null;
                                        let prevLat = null;
                                        let prevLng = null;
                                        if (index > 0) {
                                            prevWo = dayOrders[index - 1];
                                            prevLat = prevWo.site_latitude || prevWo.site_lat;
                                            prevLng = prevWo.site_longitude || prevWo.site_lng;
                                        }

                                        const color = wo.assigned_team_color || '#3b82f6';
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
                                            <button
                                                key={wo.id}
                                                onClick={() => onOrderClick(wo)}
                                                className="w-full text-left rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99] relative text-slate-800 dark:text-slate-100"
                                                style={bgStyle}
                                            >
                                                <div className="p-3.5 flex flex-col gap-2.5 relative z-10">
                                                    <div className="flex items-start justify-between w-full">
                                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg shrink-0" style={{ backgroundColor: color + '26' }}>
                                                            <Clock className="w-3.5 h-3.5 opacity-80" />
                                                            <span className="text-sm font-bold opacity-90">{time}</span>
                                                        </div>
                                                        <div className="flex-1 flex justify-center scale-[1.15] origin-top mt-[-4px]">
                                                            {(lat && lng) ? (
                                                                <WeatherWidget lat={lat} lon={lng} dateStr={wo.start_date || dateStr} />
                                                            ) : null}
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            {sandTons > 0 && (
                                                                <span className="text-xs font-bold px-2 py-1 rounded-md inline-block" style={{ backgroundColor: color + '1a', color: color }}>
                                                                    {sandTons.toFixed(1)} T {t('general.sand', 'Sable')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-[16px] leading-tight opacity-90">
                                                            {wo.client?.name || wo.client_name || 'Client Necunoscut'}
                                                        </h4>
                                                    </div>

                                                    {staticMapLoc && (
                                                        <div className="mt-1 mb-1 rounded-xl overflow-hidden h-[120px] relative border border-slate-200 shadow-inner">
                                                            <img 
                                                                src={`https://maps.googleapis.com/maps/api/staticmap?center=${staticMapLoc}&zoom=14&size=600x300&maptype=roadmap&markers=color:blue%7C${staticMapLoc}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`} 
                                                                alt="Map" 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {((lat && lng) || address) && (
                                                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                                            <StreetViewPhotos lat={lat} lng={lng} address={address} />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: color + '26' }}>
                                                        <MapPin className="w-4 h-4 shrink-0 opacity-70" />
                                                        <div className="flex flex-col flex-1">
                                                            <span className="text-xs font-medium leading-tight opacity-80">
                                                                {address || 'Fără adresă'}
                                                            </span>
                                                            {prevWo ? (
                                                                <span className="text-[10px] font-bold mt-0.5" style={{ color: color }}>
                                                                    <GoogleMapsDistance 
                                                                        lat1={prevLat} lon1={prevLng} 
                                                                        lat2={lat} lon2={lng} 
                                                                        label={t("general.from_prev", "du chantier précédent")} 
                                                                    />
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold mt-0.5" style={{ color: color }}>
                                                                    <GoogleMapsDistance 
                                                                        lat1={50.88243} lon1={4.39343} 
                                                                        lat2={lat} lon2={lng} 
                                                                        label={t('general.from_base', 'de la base')}
                                                                    />
                                                                </span>
                                                            )}
                                                        </div>
                                                        {wo.status === 'completed' || wo.status === 'done' ? (
                                                            <div 
                                                                className="ml-auto w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"
                                                                title={t('status.completed', 'Terminé')}
                                                            >
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </div>
                                                        ) : (
                                                            <a 
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(wo.site_address || wo.site?.address || wo.address || '')}`}
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="ml-auto w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors shrink-0"
                                                            >
                                                                <Navigation className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>

                                
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
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
        </div>
    );
}
