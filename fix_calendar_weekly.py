import re

with open('frontend/src/components/ShortWorksCalendar.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleUnCompleteDay back if missing, but it's not missing since git checkout restored the clean file
# 2. Add bases logic after weeklyOrders

logic_code = """
    const [bases, setBases] = useState([]);
    const [routeDistances, setRouteDistances] = useState({});
    const [mapsLoaded, setMapsLoaded] = useState(!!window.google?.maps?.DistanceMatrixService);

    useEffect(() => {
        if (mapsLoaded) return;
        const interval = setInterval(() => {
            if (window.google?.maps?.DistanceMatrixService) {
                setMapsLoaded(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [mapsLoaded]);

    useEffect(() => {
        api.get('/admin/logistics/bases')
            .then(res => setBases(res.data))
            .catch(e => console.error("Eroare incarcare baze:", e));
    }, []);

    // Calcula distantele pentru fiecare lucrare bazat pe Baza Echipei si ordinea lucrarilor
    useEffect(() => {
        if (!window.google?.maps?.DistanceMatrixService) return;
        if (bases.length === 0 || weeklyOrders.length === 0) return;

        const grouped = {};
        weeklyOrders.forEach(wo => {
            const dateStr = (wo.start_date || wo.deadline_date)?.split('T')[0];
            const teamId = wo.team?.id || wo.assigned_team_id;
            if (!dateStr || !teamId || !wo.site_address && !wo.site_name) return;
            if (!grouped[dateStr]) grouped[dateStr] = {};
            if (!grouped[dateStr][teamId]) grouped[dateStr][teamId] = [];
            grouped[dateStr][teamId].push(wo);
        });

        const pairsToCalc = []; 

        Object.keys(grouped).forEach(dateStr => {
            Object.keys(grouped[dateStr]).forEach(teamId => {
                const orders = grouped[dateStr][teamId];
                orders.sort((a, b) => (a.start_time || '07:00').localeCompare(b.start_time || '07:00'));

                const base = bases.find(b => b.team_ids && b.team_ids.map(String).includes(String(teamId)));
                if (!base) return;

                let prevLocation = base.address ? base.address : (base.latitude && base.longitude ? `${base.latitude},${base.longitude}` : null);
                if (!prevLocation) return;

                orders.forEach((wo, idx) => {
                    const currentLocation = wo.site_address || wo.site_name;
                    if (!currentLocation) return;
                    
                    const isLast = idx === orders.length - 1;
                    const legKey = `leg_${wo.id}_${prevLocation}_${currentLocation}`;
                    
                    if (!routeDistances[legKey]) {
                        pairsToCalc.push({ woId: wo.id, origin: prevLocation, destination: currentLocation, isReturn: false, legKey });
                    }
                    
                    if (isLast) {
                        const returnBase = base.address ? base.address : (base.latitude && base.longitude ? `${base.latitude},${base.longitude}` : null);
                        if (returnBase) {
                            const returnKey = `ret_${wo.id}_${currentLocation}_${returnBase}`;
                            if (!routeDistances[returnKey]) {
                                pairsToCalc.push({ woId: wo.id, origin: currentLocation, destination: returnBase, isReturn: true, legKey: returnKey });
                            }
                        }
                    }
                    
                    prevLocation = currentLocation;
                });
            });
        });

        if (pairsToCalc.length === 0) return;

        const service = new window.google.maps.DistanceMatrixService();
        const batchSize = 5;
        
        for (let i = 0; i < pairsToCalc.length; i += batchSize) {
            const batch = pairsToCalc.slice(i, i + batchSize);
            const origins = batch.map(p => p.origin);
            const destinations = batch.map(p => p.destination);
            
            setTimeout(() => {
                service.getDistanceMatrix({
                    origins,
                    destinations,
                    travelMode: 'DRIVING'
                }, (response, status) => {
                    if (status === 'OK' && response.rows) {
                        setRouteDistances(prev => {
                            const next = { ...prev };
                            batch.forEach((req, idx) => {
                                const cell = response.rows[idx]?.elements[idx];
                                if (cell && cell.status === 'OK') {
                                    next[req.legKey] = cell.distance.text;
                                } else {
                                    next[req.legKey] = 'N/A';
                                }
                            });
                            return next;
                        });
                    } else {
                        console.error("DistanceMatrix Error:", status, response);
                    }
                });
            }, i * 150);
        }
    }, [bases, weeklyOrders, routeDistances, mapsLoaded]);

    const getDistanceTextForOrder = (wo) => {
        const teamId = wo.team?.id || wo.assigned_team_id;
        if (!teamId) return null;
        const base = bases.find(b => b.team_ids && b.team_ids.map(String).includes(String(teamId)));
        if (!base) return null;

        const dateStr = (wo.start_date || wo.deadline_date)?.split('T')[0];
        const dayOrders = weeklyOrders.filter(o => {
            const d = (o.start_date || o.deadline_date)?.split('T')[0];
            const t = o.team?.id || o.assigned_team_id;
            return d === dateStr && String(t) === String(teamId);
        }).sort((a, b) => (a.start_time || '07:00').localeCompare(b.start_time || '07:00'));

        const idx = dayOrders.findIndex(o => String(o.id) === String(wo.id));
        if (idx === -1) return null;

        let prevLocation = base.address ? base.address : (base.latitude && base.longitude ? `${base.latitude},${base.longitude}` : null);
        if (!prevLocation) return null;
        for (let i = 0; i < idx; i++) {
            prevLocation = dayOrders[i].site_address || dayOrders[i].site_name || prevLocation;
        }

        const currentLocation = wo.site_address || wo.site_name;
        if (!currentLocation) return null;

        const legKey = `leg_${wo.id}_${prevLocation}_${currentLocation}`;
        const isLast = idx === dayOrders.length - 1;
        const returnBase = base.address ? base.address : (base.latitude && base.longitude ? `${base.latitude},${base.longitude}` : null);
        const returnKey = returnBase ? `ret_${wo.id}_${currentLocation}_${returnBase}` : null;

        const legDist = routeDistances[legKey];
        if (!legDist) return null;

        if (isLast && returnKey) {
            const retDist = routeDistances[returnKey];
            if (retDist && retDist !== 'N/A') {
                return `${legDist} (+ ${retDist} acasă)`;
            }
        }
        return legDist === 'N/A' ? null : legDist;
    };
"""

target_hook = """    const weeklyOrders = useMemo(() => {
        return workOrders.filter(wo => {
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return false;
            const ds = dateStr.split('T')[0];
            return weekDayStrings.includes(ds);
        });
    }, [workOrders, weekDayStrings]);"""

content = content.replace(target_hook, target_hook + "\n" + logic_code)

# desktop routing text
target_desktop_team = """<span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                    {(wo.assigned_team_name || t('common.unassigned', 'Neasignat')).replace(/^echipa\\s*/i, '')}
                                                </span>
                                            </div>"""
repl_desktop_team = """<span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                    {(wo.assigned_team_name || t('common.unassigned', 'Neasignat')).replace(/^echipa\\s*/i, '')}
                                                </span>
                                                {getDistanceTextForOrder(wo) && (
                                                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded ml-1 whitespace-nowrap">
                                                        {getDistanceTextForOrder(wo)}
                                                    </span>
                                                )}
                                            </div>"""

content = content.replace(target_desktop_team, repl_desktop_team)

# update maps click
target_map = """<div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                                            <span className="truncate">{(wo.client_name && wo.client_name !== 'None' ? wo.client_name : wo.site_name) || wo.site_address || t('common.no_location', 'Fără locație')}</span>
                                        </div>"""
repl_map = """<div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 const addr = wo.site_address || wo.site_name;
                                                 if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
                                             }}>
                                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                                            <span className="truncate">{wo.site_name || wo.site_address || t('common.no_location', 'Aucune adresse')}</span>
                                        </div>"""

content = content.replace(target_map, repl_map)

# update surface display
target_surf = """                                            {calculateOrderSand(wo) > 0 && (
                                                <span className="text-[9px] text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded shadow-sm">
                                                    {calculateOrderSand(wo).toFixed(1)}T
                                                </span>
                                            )}"""

repl_surf = """                                            {(() => {
                                                const finalVols = Array.isArray(wo.volumes) ? wo.volumes : [];
                                                const sumVol = finalVols.reduce((sum, v) => sum + (parseFloat(v.quantity) || 0), 0);
                                                const fallbackSurf = parseFloat(wo.surface_area) || parseFloat(wo.surface) || 0;
                                                const finalSurf = sumVol > 0 ? sumVol : fallbackSurf;
                                                const estSurf = parseFloat(wo.estimated_surface) || 0;
                                                const isCompleted = wo.status === 'completed' || wo.status === 'invoiced';
                                                
                                                const displaySurf = isCompleted && finalSurf > 0 ? finalSurf : (estSurf > 0 ? estSurf : finalSurf);
                                                const isReal = isCompleted && finalSurf > 0;

                                                if (displaySurf > 0) {
                                                    return (
                                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded shadow-sm ${isReal ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`} title={isReal ? "Surface Réelle" : "Surface Estimée"}>
                                                            {displaySurf}m²
                                                        </span>
                                                    )
                                                }
                                                return null;
                                            })()}
                                            {calculateOrderSand(wo) > 0 && (
                                                <span className="text-[9px] text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded shadow-sm">
                                                    {calculateOrderSand(wo).toFixed(1)}T
                                                </span>
                                            )}"""
content = content.replace(target_surf, repl_surf)


with open('frontend/src/components/ShortWorksCalendar.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
