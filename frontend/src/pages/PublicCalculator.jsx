import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, User, Loader2, CheckCircle2, Calendar, HardHat, FileText, ChevronRight, Calculator, Home, Layers, Grid3x3, ShieldCheck, ChevronLeft, Search } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete';

// Use relative path so it routes through Vite's proxy in dev, and matches origin in production
const publicApi = axios.create({
    baseURL: '/api/public/calculator'
});

export default function PublicCalculator() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [availableDates, setAvailableDates] = useState({});
    
    // Form State
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        client_type: 'fizica', // fizica | juridica
        client_first_name: '',
        client_last_name: '',
        client_company_name: '',
        client_company_vat: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        client_language: i18n.language || 'fr',
        work_type: 'new', // new | repair
        site_address: '',
        surface: '',
        thickness: '',
        has_foil: false,
        has_mesh: false,
        has_duramint: true, // Always true
        approximate_date: '',
        honeypot: '', // Spam protection
        agreed_photos: false
    });

    const [isSearchingVies, setIsSearchingVies] = useState(false);
    const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const isIframe = new URLSearchParams(window.location.search).get('iframe') === 'true';

    useEffect(() => {
        if (isIframe) {
            // Adauga fontul Space Grotesk
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            
            // Adauga stilurile stricte pentru iframe
            const style = document.createElement('style');
            style.innerHTML = `
                body, html, #root, .min-h-screen { background: transparent !important; }
                * { font-family: 'Space Grotesk', sans-serif !important; }
                h1, h2, h3, h4, h5, h6 { font-weight: 700 !important; color: #202020 !important; }
                
                /* Ascunde header-ul original */
                header { display: none !important; }
                
                /* Scoate padding/margin de la main */
                main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                
                /* Suprascrie galbenul si albastrul cu F7CA31 */
                .bg-blue-600, .bg-yellow-500, .bg-slate-800 { background-color: #F7CA31 !important; color: #202020 !important; }
                .hover\\:bg-blue-700:hover, .hover\\:bg-slate-700:hover { background-color: #e5b927 !important; color: #202020 !important; }
                .text-blue-600, .text-yellow-500 { color: #F7CA31 !important; }
                .border-blue-600, .border-yellow-400 { border-color: #F7CA31 !important; }
                .ring-blue-600, .ring-yellow-400 { --tw-ring-color: #F7CA31 !important; }
                
                /* Butoane mai putin rotunde */
                button { border-radius: 6px !important; }
                input, select { border-radius: 6px !important; }
            `;
            document.head.appendChild(style);
        }
    }, [isIframe]);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const domain = window.location.hostname;
            const res = await publicApi.get('/config', { params: { domain } });
            setConfig(res.data);
            
            const datesRes = await publicApi.get('/available-dates', { params: { domain } });
            setAvailableDates(datesRes.data.date_counts || {});
        } catch (err) {
            console.error("Config fetch error", err);
            setError(t('calculator.service_unavailable', 'Le service est temporairement indisponible.'));
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang);
        setFormData(p => ({ ...p, client_language: lang }));
    };

    const handleViesSearch = async () => {
        const vatNum = formData.client_company_vat?.replace(/[^0-9A-Za-z]/g, '');
        if (!vatNum) return;
        setIsSearchingVies(true);
        try {
            // Assume BE if starts with 0, else parse from VAT. Simplest is to pass BE if no prefix
            const country = vatNum.substring(0, 2).match(/[A-Za-z]{2}/) ? vatNum.substring(0, 2) : 'BE';
            const cleanVat = vatNum.substring(0, 2).match(/[A-Za-z]{2}/) ? vatNum.substring(2) : vatNum;
            const res = await publicApi.get(`/vies/${country}/${cleanVat}`);
            if (res.data && res.data.valid) {
                setFormData(p => ({
                    ...p,
                    client_company_name: res.data.name || p.client_company_name,
                    client_address: res.data.address || p.client_address
                }));
            } else {
                setError(t('clients.vies_error', 'Firma nu a fost găsită. Verificați codul TVA.'));
            }
        } catch (error) {
            console.error('VIES Error:', error);
            setError(t('clients.vies_error', 'Eroare la căutarea firmei.'));
        } finally {
            setIsSearchingVies(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (formData.honeypot) return; // Silent reject for bots
        if (!formData.surface || parseFloat(formData.surface) <= 0) {
            setError(t('workorders.surface_required', 'Suprafața este obligatorie.'));
            return;
        }

        setSubmitting(true);
        try {
            const domain = window.location.hostname;
            
            // Trimite către Webhook-ul agenției dacă e iframe (sau întotdeauna dacă dorim)
            if (isIframe) {
                try {
                    await axios.post('https://n8n-uk6n.onrender.com/webhook/davide-chape-form', formData);
                } catch (webhookErr) {
                    console.error("Webhook n8n failed:", webhookErr);
                    // Continuam chiar daca webhook-ul pica
                }
            }

            const res = await publicApi.post('/submit', { ...formData, domain, is_iframe: isIframe });
            if (res.data.token) {
                if (isIframe) {
                    // Dacă e iframe, putem afișa un mesaj de succes direct sau redirecționare
                    navigate(`/public/proforma/${res.data.token}?iframe=true`);
                } else {
                    navigate(`/public/proforma/${res.data.token}`);
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "A apărut o eroare. Vă rugăm să încercați din nou.");
            setSubmitting(false);
        }
    };

    const calculateEstimatedPrice = () => {
        if (!config?.pricing || !formData.surface || parseFloat(formData.surface) <= 0) return 0;
        const p = config.pricing;
        const s = parseFloat(formData.surface);
        const t = parseFloat(formData.thickness || 5);
        
        const base = p.base_price_sqm * s;
        const extraThick = Math.max(0, t - p.standard_thickness_cm);
        const extraCost = extraThick * p.extra_thickness_price_per_cm * s;
        const foil = formData.has_foil ? p.plastic_foil_price_sqm * s : 0;
        const mesh = formData.has_mesh ? p.metal_mesh_price_sqm * s : 0;
        
        let hiddenExtra = 0;
        if (p.surface_thresholds) {
            p.surface_thresholds.forEach(thresh => {
                const minS = parseFloat(thresh.min_sqm || 0);
                const maxS = parseFloat(thresh.max_sqm || 999999);
                if (s >= minS && s < maxS) {
                    hiddenExtra += parseFloat(thresh.extra_charge || 0);
                }
            });
        }
        
        const total = base + extraCost + foil + mesh + hiddenExtra;
        
        let vatRate = 21;
        if (formData.client_type === 'juridica') vatRate = p.vat_legal_entity;
        else vatRate = formData.work_type === 'repair' ? p.vat_physical_repair : p.vat_physical_new;
        
        return total * (1 + vatRate / 100);
    };

    // Helper for calendar rendering
    const renderCalendar = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // The first 3 days from today should be unavailable
        const minAvailableDate = new Date(today);
        minAvailableDate.setDate(today.getDate() + 3);

        const targetDate = new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0, Sun=6
        
        const days = [];
        
        // Weekday headers
        const weekdays = [
            t('calendar.mon', 'Lu'), t('calendar.tue', 'Ma'), t('calendar.wed', 'Mi'), 
            t('calendar.thu', 'Jo'), t('calendar.fri', 'Vi'), t('calendar.sat', 'Sâ'), t('calendar.sun', 'Du')
        ];
        const header = weekdays.map(wd => (
            <div key={wd} className="text-center text-xs font-bold text-slate-400 py-1">{wd}</div>
        ));
        
        // Blank offsets
        for (let i = 0; i < offset; i++) {
            days.push(<div key={`blank-${i}`} className="p-1" />);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const yearStr = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            const dStr = `${yearStr}-${monthStr}-${dayStr}`;
            
            const isPast = d < minAvailableDate;
            const isSunday = d.getDay() === 0;
            const load = availableDates[dStr] || 0;
            const isGreen = load < 3 && (d.getDate() % 5 !== 0); // Fake busy days
            
            const isUnavailable = isPast || isSunday || !isGreen;
            
            days.push(
                <button
                    key={dStr}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => setFormData({ ...formData, approximate_date: dStr })}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative border ${
                        formData.approximate_date === dStr 
                            ? 'bg-blue-600 text-white shadow-md font-bold border-blue-600 ring-2 ring-blue-200' 
                            : isPast || isSunday
                                ? 'bg-slate-100 text-slate-800 border-slate-200 cursor-not-allowed'
                                : isGreen
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-medium'
                                    : 'bg-red-50 hover:bg-red-100 text-red-500 border-red-200 cursor-not-allowed opacity-80'
                    }`}
                >
                    <span className="text-sm">{i}</span>
                    {!isPast && !isSunday && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isGreen ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                    )}
                </button>
            );
        }
        
        const monthName = new Date(year, month, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
        
        return (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-slate-100 shadow-sm max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-3">
                    <button 
                        type="button" 
                        onClick={() => setCalendarMonthOffset(p => Math.max(0, p - 1))}
                        disabled={calendarMonthOffset === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 capitalize text-center">{monthName}</h3>
                    <button 
                        type="button" 
                        onClick={() => setCalendarMonthOffset(p => Math.min(12, p + 1))}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {header}
                    {days}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
    }

    const tenant = config?.tenant || {};
    const estTotal = calculateEstimatedPrice();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
            {/* Header */}
            <header className="p-3 sm:p-5 relative z-10 flex flex-col sm:flex-row justify-between items-center max-w-5xl w-full mx-auto bg-white/90 backdrop-blur-md rounded-b-2xl shadow-sm border-b border-slate-100 gap-3 sm:gap-0">
                <div className="flex items-center gap-2">
                    <img 
                        src="https://cdn.prod.website-files.com/67efee5e09c6da428d8d176a/67f784844af92f795caaeedb_Davide%20Chape%20-Logo.svg" 
                        alt="Davide Chape" 
                        className="h-7 sm:h-8"
                    />
                </div>
                
                <div className="flex items-center gap-3 sm:gap-5">
                    {/* Language Switcher */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg shadow-inner">
                        <button onClick={() => handleLanguageChange('fr')} className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded transition-all ${i18n.language === 'fr' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <span className="text-xs sm:text-sm">🇫🇷</span> FR
                        </button>
                        <button onClick={() => handleLanguageChange('nl')} className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded transition-all ${i18n.language === 'nl' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <span className="text-xs sm:text-sm">🇳🇱</span> NL
                        </button>
                        <button onClick={() => handleLanguageChange('en')} className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded transition-all ${i18n.language === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <span className="text-xs sm:text-sm">🇬🇧</span> EN
                        </button>
                    </div>

                    <button 
                        onClick={() => navigate('/')} 
                        className="text-[11px] sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        {t('calculator.backToSite', 'Retour')}
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center mt-8">
                
                {/* Progress Bar (QuoteCalculator style) */}
                <div className="mb-8 px-2">
                    <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        <span>Étape {step} sur 3</span>
                        <span>{Math.round((step / 3) * 100)}%</span>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-yellow-400 transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="w-full bg-white border border-slate-100 p-5 sm:p-8 rounded-2xl shadow-lg relative mx-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Honeypot */}
                            <input type="text" name="b_name" value={formData.b_name || ''} onChange={e => setFormData({ ...formData, b_name: e.target.value })} style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

                            {/* STEP 1: WORK SPECS */}
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-slate-900 tracking-tight leading-tight">
                                        {t('calculator.projectDetails', 'Détails du Projet')}
                                    </h1>
                                    <p className="text-slate-500 mb-5 text-sm sm:text-base">
                                        {t('calculator.projectDetailsSub', 'Dites-nous quelques éléments pour calculer les matériaux.')}
                                    </p>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-wider">
                                                {t('calculator.workType', 'Type de Travail')}
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, work_type: 'new' })}
                                                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 sm:gap-2 ${
                                                        formData.work_type === 'new' 
                                                        ? 'border-yellow-400 bg-yellow-50 text-slate-900 shadow-sm' 
                                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                                                    }`}
                                                >
                                                    <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.work_type === 'new' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                                    <span className="font-bold text-[13px] sm:text-sm text-center leading-tight">{t('calculator.newBuild', 'Nouvelle Construction')}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, work_type: 'repair' })}
                                                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 sm:gap-2 ${
                                                        formData.work_type === 'repair' 
                                                        ? 'border-yellow-400 bg-yellow-50 text-slate-900 shadow-sm' 
                                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                                                    }`}
                                                >
                                                    <HardHat className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.work_type === 'repair' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                                    <span className="font-bold text-[13px] sm:text-sm text-center leading-tight">{t('calculator.renovation', 'Rénovation')}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.surface', 'Surface (m²)')}</label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    value={formData.surface}
                                                    onChange={e => setFormData({ ...formData, surface: e.target.value })}
                                                    placeholder="Ex: 120"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:py-3 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    step="0.5"
                                                    value={formData.thickness}
                                                    onChange={e => setFormData({ ...formData, thickness: e.target.value })}
                                                    placeholder="Ex: 6"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:py-3 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!formData.surface || parseFloat(formData.surface) <= 0) {
                                                    setError(t('errors.missing_details', "La surface est obligatoire."));
                                                    return;
                                                }
                                                setError('');
                                                setStep(2);
                                            }}
                                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 sm:py-4 mt-6 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {t('calculator.continue', 'Continuer')} 
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: ADDRESS AND DATES */}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-slate-900 tracking-tight leading-tight">
                                        {t('calculator.site_address', 'Adresse du chantier')}
                                    </h1>
                                    <p className="text-slate-500 mb-5 text-sm sm:text-base">
                                        {t('calculator.addressSub', 'Veuillez introduire l\'adresse et la date souhaitée.')}
                                    </p>
                                    
                                    <div className="space-y-6">
                                        <AddressAutocomplete
                                            value={formData.site_address}
                                            onChange={(val) => setFormData({ ...formData, site_address: val })}
                                            onSelect={(addrObj) => setFormData({ ...formData, site_address: addrObj.address })}
                                            placeholder={t('workorders.site_address', 'Adresse complète du chantier')}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:py-3 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 focus:ring-0 transition-all shadow-inner"
                                            required
                                        />

                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-wider">{t('calculator.desired_date', 'Date souhaitée')}</label>
                                            {renderCalendar()}
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 sm:py-4 rounded-xl font-bold transition-colors"
                                            >
                                                {t('calculator.back', 'Retour')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!formData.site_address) {
                                                        setError(t('errors.missing_details', "L'adresse du chantier est obligatoire."));
                                                        return;
                                                    }
                                                    setError('');
                                                    setStep(3);
                                                }}
                                                className="w-2/3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 sm:py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {t('calculator.continue', 'Continuer')} 
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: EXTRAS & CLIENT INFO */}
                            {step === 3 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-slate-900 tracking-tight leading-tight">
                                        {t('calculator.extrasTitle', 'Options Supplémentaires')}
                                    </h1>
                                    <p className="text-slate-500 mb-5 text-sm sm:text-base">
                                        {t('calculator.extrasSub', 'Ajoutez les options pour renforcer la chape et vos coordonnées.')}
                                    </p>

                                    <div className="space-y-4 mb-8">
                                        <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_foil ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 hover:border-yellow-200 bg-slate-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <Layers className={`w-5 h-5 ${formData.has_foil ? 'text-yellow-600' : 'text-slate-400'}`} />
                                                <span className="font-bold text-sm text-slate-900">{t('calculator.foil', 'Film plastique')}</span>
                                            </div>
                                            <input type="checkbox" checked={formData.has_foil} onChange={e => setFormData({ ...formData, has_foil: e.target.checked })} />
                                        </label>
                                        <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_mesh ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 hover:border-yellow-200 bg-slate-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <Grid3x3 className={`w-5 h-5 ${formData.has_mesh ? 'text-yellow-600' : 'text-slate-400'}`} />
                                                <span className="font-bold text-sm text-slate-900">{t('calculator.mesh', 'Treillis')}</span>
                                            </div>
                                            <input type="checkbox" checked={formData.has_mesh} onChange={e => setFormData({ ...formData, has_mesh: e.target.checked })} />
                                        </label>
                                    </div>

                                    {/* Mesaj informativ obligatoriu pentru poze (Mutat inainte de datele clientului) */}
                                    <label className={`flex items-start gap-3 p-4 mb-8 rounded-xl border-2 cursor-pointer transition-all ${formData.agreed_photos ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-200 hover:border-yellow-200 bg-white'}`}>
                                        <div className="pt-0.5">
                                            <input 
                                                type="checkbox" 
                                                required
                                                checked={formData.agreed_photos} 
                                                onChange={e => setFormData({ ...formData, agreed_photos: e.target.checked })} 
                                                className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-400 border-slate-300"
                                            />
                                        </div>
                                        <span className="text-sm text-slate-700 font-medium leading-snug">
                                            {t('calculator.agree_photos', "Je comprends qu'il me sera demandé de fournir des photos du chantier à l'étape suivante pour valider le devis.")}
                                        </span>
                                    </label>

                                    <div className="border-t-2 border-slate-100 pt-6 mb-8">
                                        <h2 className="text-xl font-extrabold mb-4 text-slate-900">{t('clients.client_details', 'Vos coordonnées')}</h2>
                                        
                                        <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl">
                                            <button type="button" onClick={() => setFormData({...formData, client_type: 'fizica'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.client_type === 'fizica' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                                {t('clients.type_physical', 'Particulier')}
                                            </button>
                                            <button type="button" onClick={() => setFormData({...formData, client_type: 'juridica'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.client_type === 'juridica' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                                {t('clients.type_legal', 'Entreprise')}
                                            </button>
                                        </div>

                                        {formData.client_type === 'juridica' && (
                                            <div className="space-y-4 mb-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.cui', 'Numéro de TVA')}</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            required 
                                                            value={formData.client_company_vat} 
                                                            onChange={e => setFormData({...formData, client_company_vat: e.target.value})} 
                                                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                        />
                                                        <button type="button" onClick={handleViesSearch} disabled={isSearchingVies} className="bg-slate-800 text-white w-14 rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center">
                                                            {isSearchingVies ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.company_name', 'Nom de l\'entreprise')}</label>
                                                    <input 
                                                        type="text" 
                                                        required 
                                                        value={formData.client_company_name} 
                                                        onChange={e => setFormData({...formData, client_company_name: e.target.value})} 
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {formData.client_type === 'fizica' && (
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.first_name', 'Prénom')}</label>
                                                    <input 
                                                        type="text" 
                                                        required 
                                                        value={formData.client_first_name} 
                                                        onChange={e => setFormData({...formData, client_first_name: e.target.value})} 
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.last_name', 'Nom')}</label>
                                                    <input 
                                                        type="text" 
                                                        required 
                                                        value={formData.client_last_name} 
                                                        onChange={e => setFormData({...formData, client_last_name: e.target.value})} 
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4 mb-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.email', 'Email')}</label>
                                                <input 
                                                    type="email" 
                                                    required 
                                                    value={formData.client_email} 
                                                    onChange={e => setFormData({...formData, client_email: e.target.value})} 
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.phone', 'Téléphone')}</label>
                                                <input 
                                                    type="tel" 
                                                    required 
                                                    value={formData.client_phone} 
                                                    onChange={e => setFormData({...formData, client_phone: e.target.value})} 
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.billing_address', 'Adresse de facturation (optionnel)')}</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.client_address} 
                                                    onChange={e => setFormData({...formData, client_address: e.target.value})} 
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900 placeholder-slate-300 focus:bg-white focus:border-yellow-400 outline-none transition-all" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 sm:py-4 rounded-xl font-bold transition-colors"
                                        >
                                            {t('calculator.back', 'Retour')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-2/3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-slate-900 py-3 sm:py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/30"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('calculator.get_quote', 'Obtenir le devis')}
                                        </button>
                                    </div>
                                    
                                    <div className="mt-8 flex justify-center text-slate-400">
                                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            {t('calculator.secureData', 'Données sécurisées.')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                </div>
            </main>
        </div>
    );
}
