import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';

/**
 * AddressAutocomplete — uses backend proxy to call Google Places API.
 * This bypasses all browser-level API key referrer restrictions.
 */
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }) {
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const debounceTimeout = useRef(null);
    const abortCtrl = useRef(null);

    // Sync external value changes (e.g. GPS detect)
    useEffect(() => {
        if (value !== undefined && value !== query) {
            setQuery(value);
        }
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        // Cancel previous request
        if (abortCtrl.current) abortCtrl.current.abort();
        abortCtrl.current = new AbortController();

        setLoading(true);
        try {
            const res = await fetch(
                `/api/places/autocomplete?input=${encodeURIComponent(searchQuery)}&lang=${i18n.language || 'ro'}`,
                { signal: abortCtrl.current.signal }
            );
            const data = await res.json();
            if (data.status === 'OK' && data.predictions?.length > 0) {
                setSuggestions(data.predictions);
                setIsOpen(true);
            } else {
                setSuggestions([]);
                setIsOpen(false);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[AddressAutocomplete]', err);
                setSuggestions([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (onChange) onChange(val, null, null);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => fetchSuggestions(val), 400);
    };

    const handleSelect = async (item) => {
        const addr = item.description;
        setQuery(addr);
        setIsOpen(false);
        setSuggestions([]);

        // Fetch coordinates via backend proxy
        try {
            const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(item.place_id)}&lang=${i18n.language || 'ro'}`);
            const data = await res.json();
            if (data.status === 'OK' && data.result?.geometry?.location) {
                const lat = data.result.geometry.location.lat.toFixed(6);
                const lon = data.result.geometry.location.lng.toFixed(6);
                const formattedAddr = data.result.formatted_address || addr;
                if (onChange) onChange(formattedAddr, lat, lon);
                if (onSelect) onSelect({ address: formattedAddr, lat, lon });
            } else {
                if (onChange) onChange(addr, null, null);
                if (onSelect) onSelect({ address: addr });
            }
        } catch (err) {
            console.error('[AddressAutocomplete] place details error:', err);
            if (onChange) onChange(addr, null, null);
            if (onSelect) onSelect({ address: addr });
        }
    };

    const [isLocating, setIsLocating] = useState(false);

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert(t('quotes.geo_unsupported', 'Geolocația nu este suportată de browser.'));
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                try {
                    const res = await fetch(`/api/places/reverse?lat=${lat}&lng=${lon}&lang=${i18n.language || 'ro'}`);
                    const data = await res.json();
                    if (data.status === 'OK' && data.results?.length > 0) {
                        const addr = data.results[0].formatted_address;
                        setQuery(addr);
                        if (onChange) onChange(addr, lat.toFixed(6), lon.toFixed(6));
                        if (onSelect) onSelect({ address: addr, lat: lat.toFixed(6), lon: lon.toFixed(6) });
                    } else {
                        const fallback = `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
                        setQuery(fallback);
                        if (onChange) onChange(fallback, lat.toFixed(6), lon.toFixed(6));
                        if (onSelect) onSelect({ address: fallback, lat: lat.toFixed(6), lon: lon.toFixed(6) });
                    }
                } catch (err) {
                    console.error('[AddressAutocomplete] reverse geocode error:', err);
                } finally {
                    setIsLocating(false);
                }
            },
            (err) => {
                console.error(err);
                useUIStore.getState().showToast(t('quotes.geo_error', 'Impossible de récupérer la position. Vérifiez vos autorisations.'), 'error');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                    placeholder={placeholder || t('common.search_address', 'Caută o adresă...')}
                    className={`w-full border border-slate-200 px-3 pr-20 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${className || ''}`}
                    autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={handleLocateMe}
                        title="Identifică Locația Curentă"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        disabled={isLocating}
                    >
                        {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                    <div className="p-1.5 text-slate-400">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Search className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="w-full text-left px-4 py-2.5 text-sm border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors last:border-0 flex items-start gap-2"
                        >
                            <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300 leading-snug">
                                {item.description}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
