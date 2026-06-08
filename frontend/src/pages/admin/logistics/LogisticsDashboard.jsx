import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Truck, MapPin, Map, Navigation, Beaker, Calendar, Loader2, Filter, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../../lib/api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

function MapBoundsFitter({ data, activeTeams }) {
    const map = useMap();
    useEffect(() => {
        if (!data || !data.routes || data.routes.length === 0) return;
        
        let hasPoints = false;
        const bounds = L.latLngBounds();
        
        data.routes.forEach(route => {
            if (activeTeams.includes(route.team_id)) {
                route.waypoints.forEach(wp => {
                    if (wp.lat && wp.lng) {
                        bounds.extend([wp.lat, wp.lng]);
                        hasPoints = true;
                    }
                })
            }
        });
        
        if (hasPoints) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }, [map, data, activeTeams]);
    return null;
}

function RoutingMachine({ positions, color, weight, opacity }) {
    const map = useMap();

    useEffect(() => {
        if (!map || positions.length < 2) return;

        const waypoints = positions.map(pos => L.latLng(pos[0], pos[1]));

        const routingControl = L.Routing.control({
            waypoints,
            lineOptions: {
                styles: [{ color, weight, opacity }],
                extendToWaypoints: false,
                missingRouteTolerance: 0
            },
            show: false,          
            addWaypoints: false,  
            routeWhileDragging: false,
            fitSelectedRoutes: false,
            showAlternatives: false,
            createMarker: () => null // Hide default green/red routing markers, we use our own
        }).addTo(map);

        // Hide the routing container div entirely to avoid visual bugs
        const container = routingControl.getContainer();
        if (container) {
            container.style.display = 'none';
        }

        return () => {
            if (map && routingControl) {
                map.removeControl(routingControl);
            }
        };
    }, [map, positions, color, weight, opacity]);

    return null;
}

const createCustomIcon = (text, isBase) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-md border-2 border-white transform transition-transform hover:scale-110 ${isBase ? 'bg-slate-800' : 'bg-blue-600'}">${text}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

const SAND_STATIONS = [
    { name: 'BAZA GHENT', lat: 51.0538286, lng: 3.7250121 },
    { name: 'BAZZA NINOVE', lat: 50.8340156, lng: 4.0150992 },
    { name: 'NHM WIELSBEKE', lat: 50.9080277, lng: 3.3644265 },
    { name: 'NHM BAZA OSTENDE', lat: 51.2263435, lng: 2.9152345 },
    { name: 'BAZA DOUR (Rougraff)', lat: 50.3957242, lng: 3.7778393 },
    { name: 'BAZA LUMMEN (Minera)', lat: 51.0107703, lng: 5.2366141 },
    { name: 'BAZA ATH (Stock Ath)', lat: 50.630554, lng: 3.7788481 },
    { name: 'Baza dranaco Antwerpen', lat: 51.2372207, lng: 4.4569835 },
    { name: 'MINERA LUMEN', lat: 50.9255869, lng: 4.8354728 },
    { name: 'BAZZA HALLE (Denayer)', lat: 50.7358744, lng: 4.2365449 },
    { name: 'BAZA SODEMAF TOURNAI', lat: 50.6055532, lng: 3.3888362 },
    { name: 'BAZA JOASSIN NAMUR', lat: 50.4665283, lng: 4.8661886 },
    { name: 'BAZA ERPE-MERE', lat: 50.9238304, lng: 3.9664654 },
    { name: 'BAZA SABLE ET GRANULATS LIEGE', lat: 50.6451384, lng: 5.5734203 },
    { name: 'Baza Antoing TUORNAI', lat: 50.5623588, lng: 3.4379506 },
    { name: 'BAZA AALST', lat: 50.9383224, lng: 4.0392149 },
    { name: 'BAZA GENT', lat: 51.0538286, lng: 3.7250121 },
    { name: 'BAZA BOOM', lat: 51.0875913, lng: 4.3577297 },
    { name: 'BAZA TEMSE', lat: 51.1220674, lng: 4.2265680 },
    { name: 'BAZA ANTWERP', lat: 51.2373003, lng: 4.4571109 },
    { name: 'BAZA ECODREAM LIEGE', lat: 50.6451384, lng: 5.5734203 },
    { name: 'BAZA INTRE MONS SI ATH', lat: 50.4549557, lng: 3.951958 }
];

export default function LogisticsDashboard() {
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    })
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTeams, setActiveTeams] = useState([])
    const [showSandStations, setShowSandStations] = useState(true)

    const fetchRoutes = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/admin/logistics/daily-routes?target_date=${targetDate}`)
            setData(res.data)
            setActiveTeams(res.data.routes.map(r => r.team_id))
        } catch (error) {
            console.error("Error fetching daily routes:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRoutes()
    }, [targetDate])

    const toggleTeam = (teamId) => {
        setActiveTeams(prev => 
            prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 min-h-[calc(100vh-64px)] flex flex-col">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-7 h-7 text-blue-600" /> Logistică
                    </h1>
                    <p className="text-slate-500 text-sm">Organizare zilnică, trasee și necesar de materiale.</p>
                </div>
                
                <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600">
                                <MapPin className="w-4 h-4" /> Baze
                            </button>
                            <button 
                                onClick={() => setShowSandStations(!showSandStations)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showSandStations ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-transparent'}`}
                            >
                                <Beaker className="w-4 h-4" /> Stații Nisip
                            </button>
                        </div>
                    
                    <div className="flex items-center bg-white rounded-full border border-slate-200 shadow-sm overflow-hidden h-11 shrink-0">
                        <button 
                            onClick={() => {
                                const d = new Date(targetDate);
                                d.setDate(d.getDate() - 1);
                                setTargetDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-3 hover:bg-slate-50 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors border-r border-slate-100"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="relative flex-1 min-w-[130px]">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input 
                                type="date" 
                                value={targetDate}
                                onChange={e => setTargetDate(e.target.value)}
                                className="pl-9 pr-2 h-full text-sm font-bold bg-transparent outline-none w-full text-slate-800"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                const d = new Date(targetDate);
                                d.setDate(d.getDate() + 1);
                                setTargetDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-3 hover:bg-slate-50 h-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors border-l border-slate-100"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            ) : !data ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">Nu s-au putut încărca datele.</div>
            ) : (
                <div className="flex-1 flex flex-col gap-6">
                    {/* Top Area: Interactive Map */}
                    <div className="w-full h-[500px] lg:h-[700px] bg-slate-100 rounded-2xl shadow-inner border border-slate-200 overflow-hidden relative shrink-0 z-0">
                        <MapContainer 
                            center={[50.8503, 4.3517]} 
                            zoom={7} 
                            scrollWheelZoom={true}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapBoundsFitter data={data} activeTeams={activeTeams} />
                            
                            {data.routes.filter(r => activeTeams.includes(r.team_id)).map(route => {
                                const validWps = route.waypoints.filter(wp => wp.lat && wp.lng)
                                if (validWps.length === 0) return null
                                
                                const positions = validWps.map(wp => [wp.lat, wp.lng])
                                
                                return (
                                    <React.Fragment key={`map-route-${route.team_id}`}>
                                        {positions.length > 1 && (
                                            <RoutingMachine 
                                                positions={positions} 
                                                color={route.team_color} 
                                                weight={4} 
                                                opacity={0.8}
                                            />
                                        )}
                                        
                                        {validWps.map((wp, idx) => (
                                            <Marker 
                                                key={`wp-${idx}`} 
                                                position={[wp.lat, wp.lng]}
                                                icon={createCustomIcon(wp.type.includes('base') ? 'B' : idx, wp.type.includes('base'))}
                                            >
                                                <Popup>
                                                    <strong className="text-sm">{wp.name}</strong>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </React.Fragment>
                                )
                            })}

                            {/* Sand Stations Rendering */}
                            {showSandStations && SAND_STATIONS.map((station, idx) => (
                                <Marker 
                                    key={`sand-${idx}`} 
                                    position={[station.lat, station.lng]}
                                    icon={L.divIcon({
                                        className: 'custom-div-icon',
                                        html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-md border-2 border-white transform transition-transform hover:scale-110 bg-red-500">S</div>`,
                                        iconSize: [24, 24],
                                        iconAnchor: [12, 12]
                                    })}
                                >
                                    <Popup>
                                        <strong className="text-sm">{station.name}</strong><br/>
                                        <span className="text-xs text-slate-500">Stație Nisip</span>
                                    </Popup>
                                </Marker>
                            ))}
                            {/* Sand Stations Map Control */}
                            <div className="absolute top-4 left-14 z-[400] pointer-events-auto">
                                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="sr-only"
                                            checked={showSandStations}
                                            onChange={(e) => setShowSandStations(e.target.checked)}
                                        />
                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Stații Nisip</span>
                                </label>
                            </div>
                        </MapContainer>
                        
                        {/* Map Overlay Stats */}
                        <div className="absolute top-4 right-4 z-[400] pointer-events-none">
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Legenda Hartă</div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <div className="w-3 h-3 rounded-full bg-slate-800 dark:bg-slate-600 border-2 border-white dark:border-slate-700 shadow-sm"></div> Bază / Start
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-700 shadow-sm"></div> Șantier / Lucrare
                                    </div>
                                    {showSandStations && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center text-[8px] text-white font-bold">S</div> Stații Nisip
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <div className="w-5 h-1 border-b-2 border-dashed border-slate-400 dark:border-slate-500"></div> Traseu auto
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Area: Stats & Teams */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Nisip</span>
                                <div className="text-2xl font-black text-amber-600 dark:text-amber-500">{(data.grand_total_sand_kg / 1000).toFixed(1)} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">tone</span></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Distanță Est.</span>
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-500">{Math.round(data.grand_total_distance_km)} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">km</span></div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-blue-600 dark:bg-blue-700">
                                <h3 className="font-extrabold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <Filter className="w-4 h-4 text-white" /> Trasee Echipe
                                </h3>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{data.routes.length} echipe</span>
                            </div>
                            <div className="p-3 space-y-3">
                                {data.routes.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-sm">Nu există lucrări planificate.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {data.routes.map(route => {
                                        const isActive = activeTeams.includes(route.team_id)
                                        return (
                                            <div 
                                                key={route.team_id} 
                                                onClick={() => toggleTeam(route.team_id)}
                                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col h-full bg-white dark:bg-slate-800 ${isActive ? 'border-transparent shadow-md' : 'border-slate-100 dark:border-slate-700 opacity-50 hover:opacity-80'}`}
                                                style={{ backgroundColor: isActive ? `${route.team_color}15` : undefined }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full shadow-sm shrink-0" style={{ backgroundColor: route.team_color }}></div>
                                                        <span className="font-bold text-slate-900 dark:text-white leading-tight">{route.team_name}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-3">
                                                    <div className="bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg">
                                                        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Necesar Nisip</div>
                                                        <div className="font-bold text-amber-600 dark:text-amber-500">{(route.total_sand_kg / 1000).toFixed(1)} t</div>
                                                    </div>
                                                    <div className="bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg">
                                                        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Distanță</div>
                                                        <div className="font-bold text-blue-600 dark:text-blue-400">{Math.round(route.total_distance_km)} km</div>
                                                    </div>
                                                </div>
                                                
                                                {isActive && route.waypoints.length > 0 && (
                                                    <div className="mt-4 space-y-2 relative before:absolute before:inset-y-2 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                                        {route.waypoints.map((wp, idx) => (
                                                            <div key={idx} className="flex gap-3 relative z-10 text-xs">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[9px] shadow-sm ${wp.type.includes('base') ? 'bg-slate-800 dark:bg-slate-600' : 'bg-blue-600 dark:bg-blue-500'}`}>
                                                                    {wp.type.includes('base') ? 'B' : idx}
                                                                </div>
                                                                <div className="flex-1 pt-0.5">
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                                                        {wp.name}
                                                                        {wp.distance_from_prev_km > 0 && (
                                                                            <span className="text-blue-500 dark:text-blue-400 ml-1.5 font-bold whitespace-nowrap">
                                                                                (+{Math.round(wp.distance_from_prev_km)} km)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {wp.sand_kg > 0 && <div className="text-amber-600 dark:text-amber-500 font-semibold mt-0.5">Nisip: {(wp.sand_kg/1000).toFixed(1)} t</div>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
