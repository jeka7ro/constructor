import React, { useState, useEffect } from 'react';
import { MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

export default function StreetViewPhotos({ lat, lng, address, className = "" }) {
    const { t } = useTranslation();
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const [selectedIndex, setSelectedIndex] = useState(null);

    // Handle escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            const max = headings.length;
            if (e.key === 'Escape') setSelectedIndex(null);
            if (e.key === 'ArrowRight' && selectedIndex !== null) setSelectedIndex(prev => (prev + 1) % max);
            if (e.key === 'ArrowLeft' && selectedIndex !== null) setSelectedIndex(prev => (prev - 1 + max) % max);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex]);

    if (!(lat && lng) && !address) return null;
    if (!apiKey) return null;

    // Poza 'auto' este dedusă de Google (arată fix spre clădire)
    const headings = ['auto', 0, 30, 60, 90, 180, 210, 240, 270];

    const getImageUrl = (heading, isLarge = false) => {
        const size = isLarge ? '1200x800' : '400x300';
        const headingParam = heading === 'auto' ? '' : `&heading=${heading}`;
        const locationStr = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address);
        return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${locationStr}${headingParam}&pitch=0&key=${apiKey}`;
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
                    {headings.map((heading, index) => (
                        <div 
                            key={heading} 
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
                            className={`relative aspect-video rounded-xl overflow-hidden border-2 bg-slate-100 shadow-sm group cursor-pointer transition-all ${heading === 'auto' ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/40' : 'border-slate-200'}`}
                        >
                            <img 
                                src={getImageUrl(heading)}
                                alt={heading === 'auto' ? t('street_view.exact_address', 'Adresse Exacte') : `Street View ${heading}°`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                            />
                        </div>
                    ))}
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
