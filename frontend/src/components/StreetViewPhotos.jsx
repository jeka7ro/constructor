import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

// Cache global pe sesiune pentru URL-urile care au dat eroare (previne re-încercarea în buclă la re-render)
const _failedStreetViewKeys = new Set();

function StreetViewPhotos({ lat, lng, address, className = "" }) {
    const { t } = useTranslation();
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC0K3Je-Wg4PQ68BltbA5xtz_zbbp3qPG4';
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [failedHeadings, setFailedHeadings] = useState({});

    // Poza 'auto' este dedusă de Google (arată fix spre clădire), iar 90 e profilul lateral
    const headings = ['auto', 90];

    // Stabilizăm cheia locației (coordonate rotunjite la 5 zecimale ~1m) ca să nu se regenereze URL-ul inutil
    const locationStr = useMemo(() => {
        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
            return `${numLat.toFixed(5)},${numLng.toFixed(5)}`;
        }
        const cleanAddr = (address || '').trim();
        return cleanAddr ? encodeURIComponent(cleanAddr) : '';
    }, [lat, lng, address]);

    // Handle escape key to close modal
    useEffect(() => {
        if (selectedIndex === null) return;
        const handleKeyDown = (e) => {
            const max = headings.length;
            if (e.key === 'Escape') setSelectedIndex(null);
            if (e.key === 'ArrowRight') setSelectedIndex(prev => (prev + 1) % max);
            if (e.key === 'ArrowLeft') setSelectedIndex(prev => (prev - 1 + max) % max);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex]);

    if (!locationStr || !apiKey) return null;

    const getImageUrl = (heading, isLarge = false) => {
        const size = isLarge ? '1200x800' : '400x300';
        const headingParam = heading === 'auto' ? '' : `&heading=${heading}`;
        return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${locationStr}${headingParam}&pitch=0&return_error_code=true&key=${apiKey}`;
    };

    return (
        <>
            <div className={`flex flex-col gap-3 ${className}`}>
                <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        {t('street_view.title', 'Street View (Destinație)')}
                    </h4>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                    {headings.map((heading, index) => {
                        const errKey = `${locationStr}_${heading}`;
                        const isFailed = Boolean(failedHeadings[errKey] || _failedStreetViewKeys.has(errKey));
                        return (
                            <div 
                                key={heading} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isFailed) setSelectedIndex(index);
                                }}
                                className={`relative aspect-video rounded-xl overflow-hidden border-2 bg-slate-100 dark:bg-slate-800 shadow-sm group transition-all ${isFailed ? 'border-slate-200 dark:border-slate-700 cursor-default' : 'cursor-pointer'} ${heading === 'auto' && !isFailed ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/40' : 'border-slate-200'}`}
                            >
                                {isFailed ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                                        <ImageOff className="w-5 h-5 mb-1 opacity-60" />
                                        <span className="text-[10px] font-semibold leading-tight">Street View indisponibil</span>
                                    </div>
                                ) : (
                                    <img 
                                        src={getImageUrl(heading)}
                                        alt={heading === 'auto' ? t('street_view.exact_address', 'Adresse Exacte') : `Street View ${heading}°`}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                                        draggable="false"
                                        style={{ WebkitUserDrag: 'none', userSelect: 'none' }}
                                        loading="lazy"
                                        onError={() => {
                                            _failedStreetViewKeys.add(errKey);
                                            setFailedHeadings(prev => ({ ...prev, [errKey]: true }));
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Lightbox Modal via Portal */}
            {selectedIndex !== null && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-white z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev - 1 + headings.length) % headings.length); }}
                        className="absolute left-2 sm:left-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-white backdrop-blur-md z-10"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <div className="w-full max-w-5xl max-h-[85vh] p-4 flex flex-col items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={getImageUrl(headings[selectedIndex], true)} 
                            alt="Street View Enlarge"
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                        <div className="text-white mt-4 font-semibold tracking-wider text-sm bg-black/50 px-4 py-1.5 rounded-full">
                            {headings[selectedIndex] === 'auto' ? t('street_view.facade_large', 'Adresse Exacte (Façade)') : `${t('street_view.angle', 'Angle')} ${headings[selectedIndex]}°`} ({selectedIndex + 1} / {headings.length})
                        </div>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev + 1) % headings.length); }}
                        className="absolute right-2 sm:right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-white backdrop-blur-md z-10"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                </div>,
                document.body
            )}
        </>
    );
}

// React.memo previne re-randarea și re-descărcarea imaginilor Street View când pagina părinte face polling la chat (la fiecare 2s)
export default React.memo(StreetViewPhotos, (prev, next) => {
    const pLat = prev.lat ? parseFloat(prev.lat).toFixed(5) : '';
    const nLat = next.lat ? parseFloat(next.lat).toFixed(5) : '';
    const pLng = prev.lng ? parseFloat(prev.lng).toFixed(5) : '';
    const nLng = next.lng ? parseFloat(next.lng).toFixed(5) : '';
    return pLat === nLat && pLng === nLng && (prev.address || '').trim() === (next.address || '').trim() && prev.className === next.className;
});
