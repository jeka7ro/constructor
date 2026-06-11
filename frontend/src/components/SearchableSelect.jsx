import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SearchableSelect({ value, onChange, options, placeholder = "Selectează...", searchPlaceholder, className = "", buttonClassName = "", menuPosition = "bottom" }) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState("")
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("touchstart", handleClickOutside, { passive: true })
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("touchstart", handleClickOutside)
        }
    }, [])

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    )

    const selectedOption = options.find(opt => opt.value === value)

    // Only autofocus on non-mobile to prevent keyboard pop-and-jump on iOS
    const shouldAutoFocus = typeof window !== 'undefined' && window.innerWidth > 768;

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer flex items-center justify-between min-h-[36px] ${buttonClassName || 'rounded-lg'}`}
            >
                <span className={`truncate ${!selectedOption ? 'text-slate-400' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {isOpen && (
                <div className={`absolute z-[100] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden left-0 ${menuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                            <input
                                type="text"
                                autoFocus={shouldAutoFocus}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder || t('common.search', 'Caută...')}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:border-blue-500 dark:text-slate-200"
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(""); setIsOpen(false); setSearch("") }}
                            className={`w-full text-left px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${value === "" ? "font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-600 dark:text-slate-300"}`}
                        >
                            <span className="flex-1">{placeholder}</span>
                            {value === "" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">{t('common.no_results', 'Niciun rezultat')}</div>
                        ) : (
                            filteredOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt.value); setIsOpen(false); setSearch("") }}
                                    className={`w-full text-left px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${value === opt.value ? "font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-700 dark:text-slate-300"}`}
                                >
                                    <span className="flex-1 truncate">
                                        {opt.label}
                                        {opt.subLabel && <span className="text-slate-400 font-normal ml-1">({opt.subLabel})</span>}
                                    </span>
                                    {value === opt.value && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
