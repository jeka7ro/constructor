import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';

export default function AddressAutocomplete({ value, onChange, placeholder, className }) {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const debounceTimeout = useRef(null);

    // Update local query if external value changes (e.g. from GPS detect)
    useEffect(() => {
        if (value !== undefined && value !== query) {
            setQuery(value);
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            // Using email param is REQUIRED by Nominatim Usage Policy to avoid 429/403 errors
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&email=contact@davidechape.com`,
                { 
                    headers: { 
                        'Accept-Language': 'ro,en,fr,de'
                    } 
                }
            );
            const data = await res.json();
            setSuggestions(data || []);
            setIsOpen(true);
        } catch (err) {
            console.error('Eroare la fetch adrese Nominatim:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        // Call the parent onChange with just the text so they can type freely
        if (onChange) onChange(val, null, null);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 800);
    };

    const handleSelect = (item) => {
        let addr = item.display_name;
        // Try to construct a cleaner address if address details are present
        if (item.address) {
            const a = item.address;
            const parts = [
                a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
                a.city || a.town || a.village || a.municipality,
                a.county,
            ].filter(Boolean);
            if (parts.length > 0) {
                addr = parts.join(', ');
            }
        }

        setQuery(addr);
        setIsOpen(false);
        
        // Pass the formatted address and the exact coordinates to the parent
        if (onChange) {
            onChange(addr, parseFloat(item.lat).toFixed(6), parseFloat(item.lon).toFixed(6));
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
                    placeholder={placeholder || 'Cauta o adresa...'}
                    className={className}
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Search className="w-4 h-4" />}
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
                                {item.display_name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
