import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * AddressAutocomplete — uses backend proxy to call Google Places API.
 * This bypasses all browser-level API key referrer restrictions.
 */
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }) {
    const { t } = useTranslation();
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
                `/api/places/autocomplete?input=${encodeURIComponent(searchQuery)}`,
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
            const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(item.place_id)}`);
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

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                    placeholder={placeholder || t('common.search_address', 'Caută o adresă...')}
                    className={className}
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading
                        ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        : <Search className="w-4 h-4" />
                    }
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
