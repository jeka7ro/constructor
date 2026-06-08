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

export default function LogisticsDashboard() {
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    })
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTeams, setActiveTeams] = useState([])

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
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                        <Link to="/admin/logistica/bases" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white text-sm font-bold text-slate-700 transition-colors">
                            <MapPin className="w-4 h-4" /> Baze
                        </Link>
                        <Link to="/admin/logistica/sand-stations" className="px-4 h-9 flex items-center gap-2 rounded-full hover:bg-white text-sm font-bold text-slate-700 transition-colors">
                            <Beaker className="w-4 h-4" /> Stații Nisip
                        </Link>
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
                        </MapContainer>
                        
                        {/* Map Overlay Stats */}
                        <div className="absolute top-4 right-4 z-[400] pointer-events-none">
                            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 pointer-events-auto">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Legenda Hartă</div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <div className="w-3 h-3 rounded-full bg-slate-800 border-2 border-white shadow-sm"></div> Bază / Start
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div> Șantier / Lucrare
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <div className="w-5 h-1 border-b-2 border-dashed border-slate-400"></div> Traseu auto
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Area: Stats & Teams */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Nisip</span>
                                <div className="text-2xl font-black text-amber-600">{(data.grand_total_sand_kg / 1000).toFixed(1)} <span className="text-sm font-bold text-slate-500">tone</span></div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Distanță Est.</span>
                                <div className="text-2xl font-black text-blue-600">{Math.round(data.grand_total_distance_km)} <span className="text-sm font-bold text-slate-500">km</span></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-600">
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
                                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col h-full ${isActive ? 'border-transparent shadow-md' : 'border-slate-100 opacity-50 hover:opacity-80'}`}
                                                style={{ backgroundColor: isActive ? `${route.team_color}10` : 'white' }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full shadow-sm shrink-0" style={{ backgroundColor: route.team_color }}></div>
                                                        <span className="font-bold text-slate-900 leading-tight">{route.team_name}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-3">
                                                    <div className="bg-white/60 p-2 rounded-lg">
                                                        <div className="text-[10px] uppercase font-bold text-slate-500">Necesar Nisip</div>
                                                        <div className="font-bold text-amber-600">{(route.total_sand_kg / 1000).toFixed(1)} t</div>
                                                    </div>
                                                    <div className="bg-white/60 p-2 rounded-lg">
                                                        <div className="text-[10px] uppercase font-bold text-slate-500">Distanță</div>
                                                        <div className="font-bold text-blue-600">{Math.round(route.total_distance_km)} km</div>
                                                    </div>
                                                </div>
                                                
                                                {isActive && route.waypoints.length > 0 && (
                                                    <div className="mt-4 space-y-2 relative before:absolute before:inset-y-2 before:left-2.5 before:w-0.5 before:bg-slate-200">
                                                        {route.waypoints.map((wp, idx) => (
                                                            <div key={idx} className="flex gap-3 relative z-10 text-xs">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[9px] shadow-sm ${wp.type.includes('base') ? 'bg-slate-800' : 'bg-blue-600'}`}>
                                                                    {wp.type.includes('base') ? 'B' : idx}
                                                                </div>
                                                                <div className="flex-1 pt-0.5">
                                                                    <div className="font-bold text-slate-800 leading-tight">
                                                                        {wp.name}
                                                                        {wp.distance_from_prev_km > 0 && (
                                                                            <span className="text-blue-500 ml-1.5 font-bold whitespace-nowrap">
                                                                                (+{Math.round(wp.distance_from_prev_km)} km)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {wp.sand_kg > 0 && <div className="text-amber-600 font-semibold mt-0.5">Nisip: {(wp.sand_kg/1000).toFixed(1)} t</div>}
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
