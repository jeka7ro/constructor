import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenantStore } from '../store/tenantStore';

const getTruckSvg = (teamColor) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="${teamColor || '#2563eb'}" stroke="white" stroke-width="2"/>
    <g transform="translate(6, 6)">
        <rect x="1" y="3" width="15" height="13" rx="1" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 8h4l3 5v4h-7V8z" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="5.5" cy="18.5" r="2.5" fill="none" stroke="white" stroke-width="2"/>
        <circle cx="18.5" cy="18.5" r="2.5" fill="none" stroke="white" stroke-width="2"/>
    </g>
</svg>
`)}`;

const getBaseSvg = () => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#000" stroke="white" stroke-width="2"/>
    <text x="14" y="19" font-family="sans-serif" font-size="14" font-weight="900" fill="white" text-anchor="middle">B</text>
</svg>
`)}`;

const getPrevSvg = () => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#64748b" stroke="white" stroke-width="2"/>
    <text x="14" y="19" font-family="sans-serif" font-size="14" font-weight="900" fill="white" text-anchor="middle">1</text>
</svg>
`)}`;

const getSandStationSvg = (letter) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
    <text x="13" y="17.5" font-family="Arial,sans-serif" font-size="12" font-weight="900" fill="white" text-anchor="middle">${letter}</text>
</svg>
`)}`;

const getPinSvg = () => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 10 15 25 15 25s15-15 15-25c0-8.284-6.716-15-15-15zm0 21.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5 6.5 2.91 6.5 6.5-2.91 6.5-6.5 6.5z" fill="#ef4444" stroke="white" stroke-width="1"/>
</svg>
`)}`;

/**
 * MapView — hartă read-only folosind Google Maps.
 * Dacă latitude/longitude sunt nule, geocodează automat `address` via Google Geocoder.
 */
const MapView = ({ latitude, longitude, address, height = 300, zoom = 15, geofenceRadius, label, routeSegments, baseName, navButtons, sandStations = [], leftPanelContent, onRouteCalculated, teamColor = '#2563eb', markerType = 'truck' }) => {
    const { t } = useTranslation();
    const mapRef = useRef(null);
    const detailMapRef = useRef(null);
    const mapInstance = useRef(null);
    const detailMapInstance = useRef(null);
    
    const elementsRef = useRef({
        marker: null,
        circle: null,
        baseMarker: null,
        detailMarker: null,
        directionsRenderer: null,
        sandStationMarkers: [],
        infoWindow: null
    });

    const [geocoding, setGeocoding] = useState(false);
    const [geoError, setGeoError] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showSandStations, setShowSandStations] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nisip_toggle') || 'false') } catch { return false }
    });

    const toggleSandStations = (val) => {
        setShowSandStations(val);
        localStorage.setItem('nisip_toggle', JSON.stringify(val));
    };

    const clearMapElements = () => {
        const { marker, circle, baseMarker, detailMarker, directionsRenderer, sandStationMarkers, infoWindow } = elementsRef.current;
        if (marker) marker.setMap(null);
        if (circle) circle.setMap(null);
        if (baseMarker) baseMarker.setMap(null);
        if (detailMarker) detailMarker.setMap(null);
        if (directionsRenderer) directionsRenderer.setMap(null);
        if (infoWindow) infoWindow.close();
        sandStationMarkers.forEach(m => m.setMap(null));
        
        elementsRef.current = {
            marker: null,
            circle: null,
            baseMarker: null,
            detailMarker: null,
            directionsRenderer: null,
            sandStationMarkers: [],
            infoWindow: new window.google.maps.InfoWindow()
        };
    };

    const initMap = (lat, lon, z, popupLabel) => {
        if (!window.google || !window.google.maps) return;
        
        const center = { lat, lng: lon };

        // Main Map
        if (!mapInstance.current) {
            mapInstance.current = new window.google.maps.Map(mapRef.current, {
                center,
                zoom: z,
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'cooperative'
            });
        } else {
            mapInstance.current.setCenter(center);
            mapInstance.current.setZoom(z);
        }

        // Detail Map
        if (detailMapRef.current) {
            if (!detailMapInstance.current) {
                detailMapInstance.current = new window.google.maps.Map(detailMapRef.current, {
                    center,
                    zoom: 17,
                    disableDefaultUI: true,
                    zoomControl: false,
                    gestureHandling: 'cooperative'
                });
            } else {
                detailMapInstance.current.setCenter(center);
                detailMapInstance.current.setZoom(17);
            }
        }

        clearMapElements();

        // Marker Main Map
        elementsRef.current.marker = new window.google.maps.Marker({
            position: center,
            map: mapInstance.current,
            icon: markerType === 'pin' 
                ? {
                    url: getPinSvg(),
                    scaledSize: new window.google.maps.Size(30, 40),
                    anchor: new window.google.maps.Point(15, 40)
                  }
                : {
                    url: getTruckSvg(teamColor),
                    scaledSize: new window.google.maps.Size(36, 36),
                    anchor: new window.google.maps.Point(18, 18)
                  },
            title: popupLabel || 'Destinație'
        });

        if (popupLabel) {
            elementsRef.current.marker.addListener('click', () => {
                elementsRef.current.infoWindow.setContent(`<strong style="font-size:13px">${popupLabel}</strong>`);
                elementsRef.current.infoWindow.open(mapInstance.current, elementsRef.current.marker);
            });
        }

        // Marker Detail Map
        if (detailMapInstance.current) {
            elementsRef.current.detailMarker = new window.google.maps.Marker({
                position: center,
                map: detailMapInstance.current,
                icon: markerType === 'pin'
                    ? {
                        url: getPinSvg(),
                        scaledSize: new window.google.maps.Size(30, 40),
                        anchor: new window.google.maps.Point(15, 40)
                      }
                    : {
                        url: getTruckSvg(teamColor),
                        scaledSize: new window.google.maps.Size(36, 36),
                        anchor: new window.google.maps.Point(18, 18)
                      }
            });
        }

        // Geofence Circle
        if (geofenceRadius && parseFloat(geofenceRadius) > 0) {
            elementsRef.current.circle = new window.google.maps.Circle({
                strokeColor: "#3b82f6",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                map: mapInstance.current,
                center,
                radius: parseFloat(geofenceRadius)
            });
        }

        // Routing
        let startName = null;
        let startLat = null;
        let startLng = null;

        if (routeSegments && routeSegments.length > 0) {
            const firstSeg = routeSegments[0];
            startName = firstSeg.from;
            startLat = firstSeg.from_lat;
            startLng = firstSeg.from_lng;
        } else if (baseName) {
            startName = baseName;
        }

        if (startName) {
            const geocodeStart = async (query) => {
                if (startLat && startLng) {
                    return { lat: parseFloat(startLat), lng: parseFloat(startLng) };
                }
                if (query.toLowerCase().includes('baza') || query.toLowerCase().includes('base') || query.toLowerCase().includes('h&h')) {
                    return { lat: 50.88243, lng: 4.39343 }; // Baza H&H Resources Brussels
                }
                return new Promise((resolve) => {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ address: query }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            resolve({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() });
                        } else {
                            resolve(null);
                        }
                    });
                });
            };

            geocodeStart(startName).then(startCoords => {
                if (startCoords && mapInstance.current) {
                    const isRealBase = startName.toLowerCase().includes('baza') || startName.toLowerCase().includes('base') || startName.toLowerCase().includes('h&h');
                    
                    // Draw start marker
                    elementsRef.current.baseMarker = new window.google.maps.Marker({
                        position: startCoords,
                        map: mapInstance.current,
                        icon: {
                            url: isRealBase ? getBaseSvg() : getPrevSvg(),
                            scaledSize: new window.google.maps.Size(28, 28),
                            anchor: new window.google.maps.Point(14, 14)
                        },
                        title: isRealBase ? `Baza: ${startName}` : `Precedent: ${startName}`
                    });

                    // Google Maps Directions (reliable, already loaded)
                    const directionsService = new window.google.maps.DirectionsService();
                    const directionsRenderer = new window.google.maps.DirectionsRenderer({
                        map: mapInstance.current,
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: '#3b82f6',
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                        }
                    });
                    elementsRef.current.directionsRenderer = directionsRenderer;

                    directionsService.route({
                        origin: startCoords,
                        destination: center,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    }, (result, status) => {
                        if (status === 'OK') {
                            directionsRenderer.setDirections(result);
                            const route = result.routes[0];
                            const distanceKm = route.legs.reduce((acc, leg) => acc + leg.distance.value, 0) / 1000;
                            if (onRouteCalculated) onRouteCalculated(distanceKm);
                        } else {
                            console.error('Google Directions error:', status);
                            // Fallback direct line only if Directions also fails
                            const line = new window.google.maps.Polyline({
                                path: [startCoords, center],
                                strokeColor: '#3b82f6',
                                strokeOpacity: 0.5,
                                strokeWeight: 3,
                                strokeDashArray: [10, 5],
                                map: mapInstance.current
                            });
                            elementsRef.current.directionsRenderer = line;
                            const bounds = new window.google.maps.LatLngBounds();
                            bounds.extend(startCoords);
                            bounds.extend(center);
                            mapInstance.current.fitBounds(bounds, { padding: 50 });
                        }
                    });

                }
            });
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    useEffect(() => {
        if (!mapRef.current || !window.google) return;

        const hasCoords = latitude && longitude && parseFloat(latitude) !== 0 && parseFloat(longitude) !== 0;

        if (hasCoords) {
            initMap(parseFloat(latitude), parseFloat(longitude), zoom, label || address);
        } else if (address && address.trim().length > 3) {
            setGeocoding(true);
            setGeoError(false);
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address }, (results, status) => {
                setGeocoding(false);
                if (status === 'OK' && results[0]) {
                    const lat = results[0].geometry.location.lat();
                    const lon = results[0].geometry.location.lng();
                    initMap(lat, lon, 15, label || address);
                } else {
                    setGeoError(true);
                    // Fallback to tenant country center
                    let defaultCenter = { lat: 50.8503, lng: 4.3517 }; // BE fallback
                    const tenant = useTenantStore.getState().tenant;
                    if (tenant?.country === 'RO') defaultCenter = { lat: 45.9432, lng: 24.9668 };
                    else if (tenant?.country === 'NL') defaultCenter = { lat: 52.3676, lng: 4.9041 };
                    else if (tenant?.country === 'FR') defaultCenter = { lat: 46.2276, lng: 2.2137 };
                    else if (tenant?.country === 'DE') defaultCenter = { lat: 51.1657, lng: 10.4515 };

                    if (!mapInstance.current) {
                        mapInstance.current = new window.google.maps.Map(mapRef.current, {
                            center: defaultCenter,
                            zoom: 7,
                            disableDefaultUI: true,
                            zoomControl: true
                        });
                    }
                }
            });
        } else {
            // Nicio informație GPS/adresă — hartă generală conform tenant-ului
            let defaultCenter = { lat: 50.8503, lng: 4.3517 }; // BE fallback
            const tenant = useTenantStore.getState().tenant;
            if (tenant?.country === 'RO') defaultCenter = { lat: 45.9432, lng: 24.9668 };
            else if (tenant?.country === 'NL') defaultCenter = { lat: 52.3676, lng: 4.9041 };
            else if (tenant?.country === 'FR') defaultCenter = { lat: 46.2276, lng: 2.2137 };
            else if (tenant?.country === 'DE') defaultCenter = { lat: 51.1657, lng: 10.4515 };

            if (!mapInstance.current) {
                mapInstance.current = new window.google.maps.Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 7,
                    disableDefaultUI: true,
                    zoomControl: true
                });
            }
        }
    }, [latitude, longitude, address, zoom, geofenceRadius, routeSegments]);

    // Render Sand Stations
    useEffect(() => {
        if (!mapInstance.current || !window.google) return;
        
        elementsRef.current.sandStationMarkers.forEach(m => m.setMap(null));
        elementsRef.current.sandStationMarkers = [];

        if (showSandStations && sandStations && sandStations.length > 0) {
            const newMarkers = [];
            sandStations.forEach((s) => {
                if (s.latitude && s.longitude) {
                    const _letter = s.type === 'theirs' ? 'I' : 'D';
                    const marker = new window.google.maps.Marker({
                        position: { lat: s.latitude, lng: s.longitude },
                        map: mapInstance.current,
                        icon: {
                            url: getSandStationSvg(_letter),
                            scaledSize: new window.google.maps.Size(26, 26),
                            anchor: new window.google.maps.Point(13, 13)
                        },
                        title: s.name
                    });
                    
                    marker.addListener('click', () => {
                        elementsRef.current.infoWindow.setContent(`
                            <div style="text-align:center; padding: 4px;">
                                <strong style="font-size:13px; color:#ef4444">${s.name}</strong>
                                ${s.address ? `<br/><span style="font-size:11px; color:#64748b">${s.address}</span>` : ''}
                            </div>
                        `);
                        elementsRef.current.infoWindow.open(mapInstance.current, marker);
                    });
                    
                    newMarkers.push(marker);
                }
            });
            elementsRef.current.sandStationMarkers = newMarkers;
        }
    }, [showSandStations, sandStations]);

    // Trigger map resize on fullscreen toggle
    useEffect(() => {
        if (window.google && mapInstance.current) {
            setTimeout(() => {
                window.google.maps.event.trigger(mapInstance.current, 'resize');
                if (detailMapInstance.current) {
                    window.google.maps.event.trigger(detailMapInstance.current, 'resize');
                }
                if (isFullScreen && latitude && longitude) {
                    mapInstance.current.setCenter({ lat: parseFloat(latitude), lng: parseFloat(longitude) });
                }
            }, 100);
        }
    }, [isFullScreen, latitude, longitude]);

    return (
        <div
            className={`w-full ${isFullScreen ? 'fixed inset-0 z-[9999] bg-slate-900' : 'flex flex-col md:flex-row gap-3'}`}
            style={{ height: isFullScreen ? '100vh' : height, zIndex: isFullScreen ? 9999 : 1 }}
        >
            {isFullScreen && (
                <button
                    onClick={() => setIsFullScreen(false)}
                    className="absolute top-4 right-4 z-[99999] bg-slate-800 text-white px-4 py-2 rounded-full font-bold shadow-2xl border-2 border-slate-600 flex items-center gap-2"
                >
                    <Minimize2 className="w-5 h-5" /> Închide
                </button>
            )}

            {!isFullScreen && leftPanelContent && markerType !== 'pin' && (
                <div className="hidden md:flex flex-col gap-2 h-full relative w-[32%] max-w-[420px]">
                    <div className="flex-1 w-full flex flex-col gap-2 overflow-y-auto pr-1 pb-4" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                        {leftPanelContent}
                    </div>
                </div>
            )}
            
            <div className={`h-full relative overflow-hidden ${isFullScreen ? 'w-full flex-1' : 'w-full rounded-xl shadow-inner border border-slate-200 dark:border-slate-700'}`}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                
                {/* UI Controls */}
                {!isFullScreen && (
                    <div className="absolute top-2 left-2 z-[400] flex flex-row items-center gap-2">
                        <button 
                            onClick={() => setIsFullScreen(true)}
                            className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-xl text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center backdrop-blur-sm"
                            title="Mărește harta (Ecran complet)"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    {sandStations && sandStations.length > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer bg-white/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors pointer-events-auto backdrop-blur-sm h-full">
                            <div className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showSandStations ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <input 
                                    type="checkbox" 
                                    className="sr-only"
                                    checked={showSandStations}
                                    onChange={(e) => toggleSandStations(e.target.checked)}
                                />
                                <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showSandStations ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nisip</span>
                        </label>
                    )}
                </div>
                )}

                {navButtons && (
                    <div className="absolute top-2 right-2 z-[400] flex gap-2">
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
    );
};

export default MapView;
