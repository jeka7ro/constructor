import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

// Inline SVG flags — no emoji, no external deps
const FlagRO = () => (
    <svg viewBox="0 0 30 20" width="18" height="12" style={{borderRadius:2,display:'block'}}>
        <rect width="10" height="20" fill="#002B7F"/>
        <rect x="10" width="10" height="20" fill="#FCD116"/>
        <rect x="20" width="10" height="20" fill="#CE1126"/>
    </svg>
)
const FlagEN = () => (
    <svg viewBox="0 0 60 30" width="18" height="12" style={{borderRadius:2,display:'block'}}>
        <rect width="60" height="30" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="7"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4.5"/>
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
    </svg>
)
const FlagDE = () => (
    <svg viewBox="0 0 30 20" width="18" height="12" style={{borderRadius:2,display:'block'}}>
        <rect width="30" height="7" y="0" fill="#000"/>
        <rect width="30" height="6" y="7" fill="#DD0000"/>
        <rect width="30" height="7" y="13" fill="#FFCE00"/>
    </svg>
)
const FlagFR = () => (
    <svg viewBox="0 0 30 20" width="18" height="12" style={{borderRadius:2,display:'block'}}>
        <rect width="10" height="20" fill="#002395"/>
        <rect x="10" width="10" height="20" fill="#fff"/>
        <rect x="20" width="10" height="20" fill="#ED2939"/>
    </svg>
)
const FlagHU = () => (
    <svg viewBox="0 0 30 20" width="18" height="12" style={{borderRadius:2,display:'block'}}>
        <rect width="30" height="7" y="0" fill="#CE2939"/>
        <rect width="30" height="6" y="7" fill="#fff"/>
        <rect width="30" height="7" y="13" fill="#477050"/>
    </svg>
)

const LANGUAGES = [
    { code: 'ro', label: 'RO', Flag: FlagRO },
    { code: 'en', label: 'EN', Flag: FlagEN },
    { code: 'de', label: 'DE', Flag: FlagDE },
    { code: 'fr', label: 'FR', Flag: FlagFR },
    { code: 'hu', label: 'HU', Flag: FlagHU },
]

export default function LanguageSelector({ variant = 'dark' }) {
    const { i18n } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)
    
    const currentLangCode = i18n.language?.substring(0, 2) || 'ro'
    const activeLang = LANGUAGES.find(l => l.code === currentLangCode) || LANGUAGES[0]

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const change = (code) => {
        i18n.changeLanguage(code)
        localStorage.setItem('language', code)
        setIsOpen(false)
    }

    const isDark = variant === 'dark'

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${
                    isDark 
                        ? 'border-slate-700/50 hover:bg-slate-800 text-slate-300' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}
            >
                <activeLang.Flag />
                <span>{activeLang.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute right-0 mt-2 w-32 py-1 rounded-xl shadow-lg border backdrop-blur-xl z-50 ${
                    isDark 
                        ? 'bg-slate-900/90 border-slate-800' 
                        : 'bg-white/90 border-slate-200'
                }`}>
                    {LANGUAGES.map((lang) => {
                        const active = currentLangCode === lang.code
                        return (
                            <button
                                key={lang.code}
                                onClick={() => change(lang.code)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold transition-colors ${
                                    active 
                                        ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')
                                        : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')
                                }`}
                            >
                                <lang.Flag />
                                <span>{lang.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

