import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import { Maximize, Minimize, Layers } from 'lucide-react'

// Fix Leaflet default icon broken paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const getSandStationIcon = (index) => new L.DivIcon({
    html: `<div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">${index}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
})

/**
 * MapView — hartă read-only.
 * Dacă latitude/longitude sunt nule, geocodează automat `address` via Nominatim.
 * Props: latitude, longitude, address, height, zoom, geofenceRadius, label, routeSegments, navButtons, sandStations
 */
const MapView = ({ latitude, longitude, address, height = 300, zoom = 15, geofenceRadius, label, routeSegments, navButtons, sandStations = [], leftPanelContent }) => {
    const mapRef = useRef(null)
    const mapInstance = useRef(null)
    const markerRef = useRef(null)
    const circleRef = useRef(null)
    const routingControlRef = useRef(null)
    const detailMapRef = useRef(null)
    const detailMapInstance = useRef(null)
    const detailMarkerRef = useRef(null)
    const sandStationsLayerRef = useRef(null)
    
    const [geocoding, setGeocoding] = useState(false)
    const [geoError, setGeoError] = useState(false)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [showSandStations, setShowSandStations] = useState(false)

    const initMap = (lat, lon, z, popupLabel) => {
        if (!mapRef.current) return

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, {
                zoomControl: false, // Disabled default topleft zoom
                scrollWheelZoom: false,
                dragging: true,
                doubleClickZoom: true,
                attributionControl: true,
            }).setView([lat, lon], z)
            
            L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(mapInstance.current)
        } else {
            mapInstance.current.setView([lat, lon], z)
        }

        // Marker
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([lat, lon])
        if (popupLabel) {
            markerRef.current.bindPopup(`<strong style="font-size:13px">${popupLabel}</strong>`)
            markerRef.current.openPopup()
        }
        markerRef.current.addTo(mapInstance.current)

        // Cerc geofence
        if (circleRef.current) circleRef.current.remove()
        if (geofenceRadius && parseFloat(geofenceRadius) > 0) {
            circleRef.current = L.circle([lat, lon], {
                radius: parseFloat(geofenceRadius),
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '6 4',
            }).addTo(mapInstance.current)
        }

        // Initialize detail map
        if (detailMapRef.current) {
            if (!detailMapInstance.current) {
                detailMapInstance.current = L.map(detailMapRef.current, {
                    zoomControl: false,
                    scrollWheelZoom: false,
                    dragging: true,
                    doubleClickZoom: true,
                    attributionControl: false,
                }).setView([lat, lon], 17)

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                }).addTo(detailMapInstance.current)
            } else {
                detailMapInstance.current.setView([lat, lon], 17)
            }

            if (detailMarkerRef.current) detailMarkerRef.current.remove()
            
            const destinationIcon = L.divIcon({
                className: 'custom-destination-marker',
                html: `<div style="background-color: #ef4444; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.4); border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            detailMarkerRef.current = L.marker([lat, lon], { icon: destinationIcon })
            if (popupLabel) {
                detailMarkerRef.current.bindPopup(`<strong style="font-size:13px">Destinație: ${popupLabel}</strong>`)
            }
            detailMarkerRef.current.addTo(detailMapInstance.current)
        }

        // Force resize după mount

        if (routingControlRef.current) {
            mapInstance.current.removeControl(routingControlRef.current)
            routingControlRef.current = null
        }

        if (routeSegments && routeSegments.length > 0) {
            const firstSeg = routeSegments[0];
            const startName = firstSeg.from;
            const geocodeStart = async (query) => {
                if (firstSeg.from_lat && firstSeg.from_lng) {
                    return { lat: parseFloat(firstSeg.from_lat), lon: parseFloat(firstSeg.from_lng) };
                }
                if (query.toLowerCase().includes('baza') || query.toLowerCase().includes('base') || query.toLowerCase().includes('h&h')) {
                    return { lat: 50.88243, lon: 4.39343 }; // Baza H&H Resources Brussels
                }
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                        { headers: { 'Accept-Language': 'ro', 'User-Agent': 'PontajDigital/1.0' } }
                    );
                    const data = await res.json();
                    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
                } catch (e) {
                    console.error("Geocoding failed for start node", e);
                }
                return null;
            };

            geocodeStart(startName).then(startCoords => {
                if (startCoords && mapInstance.current) {
                    routingControlRef.current = L.Routing.control({
                        waypoints: [
                            L.latLng(startCoords.lat, startCoords.lon),
                            L.latLng(lat, lon)
                        ],
                        lineOptions: {
                            styles: [{ color: '#3b82f6', weight: 4, opacity: 0.8 }],
                            extendToWaypoints: false,
                            missingRouteTolerance: 0
                        },
                        show: false,
                        addWaypoints: false,
                        routeWhileDragging: false,
                        fitSelectedRoutes: true,
                        showAlternatives: false,
                        createMarker: () => null
                    }).addTo(mapInstance.current);
                    
                    // Hide routing container
                    const container = routingControlRef.current.getContainer();
                    if (container) container.style.display = 'none';

                    routingControlRef.current.on('routingerror', function() {
                        // Fallback la linie dreaptă dacă OSRM dă eroare de limită de distanță
                        if (mapInstance.current && routingControlRef.current) {
                            mapInstance.current.removeControl(routingControlRef.current);
                            routingControlRef.current = null;
                            const line = L.polyline([
                                [startCoords.lat, startCoords.lon],
                                [lat, lon]
                            ], {
                                color: '#3b82f6',
                                weight: 3,
                                dashArray: '8, 8',
                                opacity: 0.8
                            }).addTo(mapInstance.current);
                            mapInstance.current.fitBounds(line.getBounds(), { padding: [50, 50] });
                        }
                    });

                    const baseIcon = L.divIcon({
                        className: 'custom-base-marker',
                        html: '<div style="background-color: #000; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-family: sans-serif; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); font-size: 14px;">B</div>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14],
                        popupAnchor: [0, -14]
                    });

                    L.marker([startCoords.lat, startCoords.lon], { icon: baseIcon })
                        .bindPopup(`<strong style="font-size:13px">Baza: ${startName}</strong>`)
                        .addTo(mapInstance.current);
                }
            });
        }

        setTimeout(() => {
            mapInstance.current?.invalidateSize()
            detailMapInstance.current?.invalidateSize()
        }, 100)
    }

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFullScreen])

    useEffect(() => {
        if (!mapRef.current) return

        const hasCoords = latitude && longitude &&
            parseFloat(latitude) !== 0 && parseFloat(longitude) !== 0

        if (hasCoords) {
            // Coordonate GPS directe
            initMap(parseFloat(latitude), parseFloat(longitude), zoom, label || address)
        } else if (address && address.trim().length > 3) {
            // Geocodare automată după adresă via Nominatim (gratis, fără API key)
            setGeocoding(true)
            setGeoError(false)
            fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                { headers: { 'Accept-Language': 'ro', 'User-Agent': 'PontajDigital/1.0' } }
            )
                .then(r => r.json())
                .then(data => {
                    setGeocoding(false)
                    if (data && data.length > 0) {
                        const { lat, lon } = data[0]
                        initMap(parseFloat(lat), parseFloat(lon), 15, label || address)
                    } else {
                        setGeoError(true)
                        // Fallback: hartă Romania
                        if (!mapInstance.current && mapRef.current) {
                            mapInstance.current = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: false })
                                .setView([50.8503, 4.3517], 7)
                            L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap', maxZoom: 19
                            }).addTo(mapInstance.current)
                        }
                    }
                })
                .catch(() => {
                    setGeocoding(false)
                    setGeoError(true)
                })
        } else {
            // Nicio informație GPS/adresă — hartă Romania generală
            if (!mapInstance.current && mapRef.current) {
                mapInstance.current = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: false })
                    .setView([50.8503, 4.3517], 7)
                L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap', maxZoom: 19
                }).addTo(mapInstance.current)
            }
        }

        return () => {
            if (mapInstance.current) {
                if (routingControlRef.current) {
                    mapInstance.current.removeControl(routingControlRef.current)
                    routingControlRef.current = null
                }
                mapInstance.current.remove()
                mapInstance.current = null
                markerRef.current = null
                circleRef.current = null
            }
            if (detailMapInstance.current) {
                detailMapInstance.current.remove()
                detailMapInstance.current = null
                detailMarkerRef.current = null
            }
        }
    }, [latitude, longitude, address, zoom, geofenceRadius, routeSegments])

    // ─── Render Sand Stations ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapInstance.current) return
        
        // Curățăm layerul anterior
        if (sandStationsLayerRef.current) {
            mapInstance.current.removeLayer(sandStationsLayerRef.current)
            sandStationsLayerRef.current = null
        }

        if (showSandStations && sandStations && sandStations.length > 0) {
            sandStationsLayerRef.current = L.layerGroup()
            
            sandStations.forEach((s, idx) => {
                if (s.latitude && s.longitude) {
                    const marker = L.marker([s.latitude, s.longitude], {
                        icon: getSandStationIcon(idx + 1)
                    })
                    marker.bindPopup(`
                        <div style="text-align:center">
                            <strong style="font-size:13px; color:#ef4444">${s.name}</strong><br/>
                            <span style="font-size:11px; color:#64748b">${s.address || 'Fără adresă'}</span>
                        </div>
                    `)
                    marker.addTo(sandStationsLayerRef.current)
                }
            })
            
            sandStationsLayerRef.current.addTo(mapInstance.current)
        }
    }, [showSandStations, sandStations])

    // ─── Invalidate Size on FullScreen Toggle ────────────────────────────────────────────
    useEffect(() => {
        if (mapInstance.current) {
            // Need a slight timeout to allow CSS transitions/resizes to apply
            setTimeout(() => {
                mapInstance.current.invalidateSize()
                if (isFullScreen && latitude && longitude) {
                    mapInstance.current.setView([latitude, longitude], zoom)
                }
            }, 100)
        }
    }, [isFullScreen, latitude, longitude, zoom])


    return (
        <div
            className={`flex flex-col md:flex-row gap-3 w-full ${isFullScreen ? 'fixed inset-0 z-[9999] bg-slate-900/95 p-4 backdrop-blur-sm' : ''}`}
            style={{ height: isFullScreen ? '100vh' : height, zIndex: isFullScreen ? 9999 : 1 }}
        >
            <div className={`hidden md:flex flex-col gap-2 h-full relative ${isFullScreen ? 'w-[32%] max-w-[420px]' : 'w-1/3'}`}>
                <div className={`relative rounded-xl overflow-hidden shadow-inner w-full shrink-0 ${isFullScreen && leftPanelContent ? 'h-[120px] min-h-[120px] border-2 border-slate-700' : 'h-full border border-slate-200 dark:border-slate-700'}`}>
                    <div ref={detailMapRef} style={{ width: '100%', height: '100%' }} />
                    <div className="absolute top-2 left-2 bg-white/90 dark:bg-slate-800/90 px-2 py-1 rounded text-[10px] font-bold shadow-sm z-[400] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        DESTINAȚIE
                    </div>
                    {navButtons && !isFullScreen && (
                        <div className="absolute top-2 right-2 z-[400] flex gap-2">
                            {navButtons}
                        </div>
                    )}
                </div>

                {isFullScreen && leftPanelContent && (
                    <div className="flex-1 w-full flex flex-col gap-2 overflow-y-auto pr-1 pb-4" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                        {leftPanelContent}
                    </div>
                )}
            </div>
            
            <div className={`h-full relative rounded-xl overflow-hidden shadow-inner ${isFullScreen ? 'flex-1 border-2 border-slate-700' : 'w-full md:w-2/3 border border-slate-200 dark:border-slate-700'}`}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                
                {/* UI Controls */}
                <div className="absolute top-2 left-2 z-[400] flex flex-row items-center gap-2">
                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-xl text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center backdrop-blur-sm"
                        title={isFullScreen ? "Ieși din modul ecran complet" : "Mărește harta (Ecran complet)"}
                    >
                        {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                    {/* Sand Stations Toggle Button (only if sandStations are provided) */}
                    {sandStations && sandStations.length > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer bg-white/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors pointer-events-auto backdrop-blur-sm h-full">
                            <div className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <input 
                                    type="checkbox" 
                                    className="sr-only"
                                    checked={showSandStations}
                                    onChange={(e) => setShowSandStations(e.target.checked)}
                                />
                                <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nisip</span>
                        </label>
                    )}
                </div>

                {/* Mobile only Nav Buttons */}
                {navButtons && (
                    <div className="absolute top-2 right-2 z-[400] flex gap-2 md:hidden">
                        {navButtons}
                    </div>
                )}
                
                {/* Overlay geocoding */}
                {geocoding && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex flex-col items-center justify-center gap-2 z-[400] pointer-events-none">
                        <div className="w-7 h-7 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Se caută locația pe hartă...</span>
                    </div>
                )}

                {/* Mesaj eroare */}
                {geoError && !geocoding && (
                    <div className="absolute bottom-2 left-2 right-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 z-[400] pointer-events-none">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">⚠️ Adresa nu a putut fi localizată. Adaugă GPS manual în Șantiere.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MapView
