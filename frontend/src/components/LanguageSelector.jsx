import { useTranslation } from 'react-i18next'

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
    const currentLang = i18n.language?.substring(0, 2) || 'ro'

    const change = (code) => {
        i18n.changeLanguage(code)
        localStorage.setItem('language', code)
    }

    const isDark = variant === 'dark'

    return (
        <div className="flex items-center gap-1">
            {LANGUAGES.map((lang) => {
                const active = currentLang === lang.code
                return (
                    <button
                        key={lang.code}
                        onClick={() => change(lang.code)}
                        title={lang.label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 7px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            border: active
                                ? '2px solid #3b82f6'
                                : `2px solid transparent`,
                            background: active
                                ? (isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff')
                                : 'transparent',
                            color: active
                                ? '#3b82f6'
                                : (isDark ? 'rgba(255,255,255,0.45)' : '#94a3b8'),
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            if (!active) {
                                e.currentTarget.style.color = isDark ? '#fff' : '#1e293b'
                                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'
                            }
                        }}
                        onMouseLeave={e => {
                            if (!active) {
                                e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.45)' : '#94a3b8'
                                e.currentTarget.style.background = 'transparent'
                            }
                        }}
                    >
                        <lang.Flag />
                        <span>{lang.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
