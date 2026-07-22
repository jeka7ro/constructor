import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function CookieBanner() {
    const { t } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const isIframe = window !== window.top || new URLSearchParams(window.location.search).get('iframe') === 'true';
        if (isIframe) return; // Do not show in iframe

        const consent = localStorage.getItem('pontaj_cookie_consent')
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('pontaj_cookie_consent', 'true')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none slide-up">
            <div className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-auto">
                <div className="flex-1">
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        🍪 <strong className="text-white">Cookies & Confidentialité :</strong> Nous utilisons uniquement des cookies strictement nécessaires pour assurer le fonctionnement technique de la plateforme et votre authentification. 
                        En continuant, vous acceptez notre <Link to="/politique-de-confidentialite" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">Politique de Confidentialité</Link>.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <button
                        onClick={handleAccept}
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        Compris
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95"
                        aria-label="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
