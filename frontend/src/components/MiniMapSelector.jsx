import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon broken paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const MiniMapSelector = ({ latitude, longitude, onLocationChange }) => {
    const mapRef = useRef(null)
    const mapInstance = useRef(null)
    const markerInstance = useRef(null)

    useEffect(() => {
        if (!mapRef.current) return
        
        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([45.9432, 24.9668], 6)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19
            }).addTo(mapInstance.current)

            if (!latitude && !longitude && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude: userLat, longitude: userLon } = position.coords;
                        mapInstance.current.setView([userLat, userLon], 15);
                    },
                    (error) => console.log("Geolocation error:", error)
                );
            } else if (latitude && longitude) {
                mapInstance.current.setView([parseFloat(latitude), parseFloat(longitude)], 15);
            }

            mapInstance.current.on('click', (e) => {
                const { lat, lng } = e.latlng
                onLocationChange(lat, lng)
            })
        }
        
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [])

    useEffect(() => {
        if (!mapInstance.current) return
        if (latitude && longitude) {
            const lat = parseFloat(latitude)
            const lon = parseFloat(longitude)
            mapInstance.current.setView([lat, lon], 15)
            
            if (markerInstance.current) {
                markerInstance.current.setLatLng([lat, lon])
            } else {
                markerInstance.current = L.marker([lat, lon]).addTo(mapInstance.current)
            }
        } else {
            if (markerInstance.current) {
                markerInstance.current.remove()
                markerInstance.current = null
            }
        }
    }, [latitude, longitude])

    return (
        <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative" style={{ height: 200, zIndex: 10 }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded shadow text-slate-600 font-semibold z-[400] pointer-events-none">
                {latitude && longitude ? 'Locație selectată' : 'Click pe hartă pentru a selecta locația'}
            </div>
        </div>
    )
}

export default MiniMapSelector
