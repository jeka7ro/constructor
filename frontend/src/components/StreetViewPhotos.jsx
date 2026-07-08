import React, { useState, useEffect } from 'react';
import { MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

export default function StreetViewPhotos({ lat, lng, className = "" }) {
    const { t } = useTranslation();
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const [selectedIndex, setSelectedIndex] = useState(null);

    // Handle escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedIndex(null);
            if (e.key === 'ArrowRight' && selectedIndex !== null) setSelectedIndex(prev => (prev + 1) % 3);
            if (e.key === 'ArrowLeft' && selectedIndex !== null) setSelectedIndex(prev => (prev - 1 + 3) % 3);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex]);

    if (!lat || !lng || !apiKey) return null;

    // We will get 3 photos: heading 0, 120, and 240 to cover different angles of the location
    const headings = [0, 120, 240];

    const getImageUrl = (heading, isLarge = false) => {
        const size = isLarge ? '1200x800' : '400x300';
        return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=0&key=${apiKey}`;
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
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {headings.map((heading, index) => (
                        <div 
                            key={heading} 
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
                            className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group cursor-pointer"
                        >
                            <img 
                                src={getImageUrl(heading)}
                                alt={`Street View ${heading}°`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-[10px] font-bold text-white uppercase bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {heading}° View
                                </span>
                            </div>
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
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev - 1 + 3) % 3); }}
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
                            Unghi {headings[selectedIndex]}° ({selectedIndex + 1} / 3)
                        </div>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev + 1) % 3); }}
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
