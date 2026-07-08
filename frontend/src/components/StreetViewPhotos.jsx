import React from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function StreetViewPhotos({ lat, lng, address, className = "" }) {
    const { t } = useTranslation();

    if (!(lat && lng) && !address) return null;

    // We use a high-zoom satellite iframe as a fallback for "poze" (pictures) 
    // since the Google Cloud account has the Street View Static API restricted.
    const locationStr = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address);
    const iframeUrl = `https://maps.google.com/maps?q=${locationStr}&t=k&z=19&ie=UTF8&iwloc=&output=embed`;

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-700 text-sm">
                    {t('general.location_photo', 'Foto Locație (Satelit)')}
                </h3>
            </div>

            <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 h-[200px] relative">
                <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={iframeUrl}
                    allowFullScreen
                    title="Location Satellite View"
                />
            </div>
            <p className="text-[10px] text-slate-400 text-center">
                Vedere din satelit (Street View blocat de Google Cloud)
            </p>
        </div>
    );
}
