import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, User, Loader2, CheckCircle2, HardHat, FileText, ChevronRight, Home, Layers, Grid3x3, ShieldCheck, ChevronLeft, Search, Camera, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete';

const publicApi = axios.create({ baseURL: '/api/public/calculator' });

const TOTAL_STEPS = 5;
const STEP_LABELS_FR = ['Détails', 'Adresse', 'Date', 'Contact', 'Photos'];

export default function PublicCalculator() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [availableDates, setAvailableDates] = useState({});
    const [step, setStep] = useState(1);
    const [photos, setPhotos] = useState([]);
    const [formData, setFormData] = useState({
        client_type: 'fizica',
        client_first_name: '',
        client_last_name: '',
        client_company_name: '',
        client_company_vat: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        client_language: i18n.language || 'fr',
        work_type: 'new',
        site_address: '',
        surface: '',
        thickness: '',
        has_foil: false,
        has_mesh: false,
        has_duramint: true,
        approximate_date: '',
        honeypot: ''
    });

    const [isSearchingVies, setIsSearchingVies] = useState(false);
    const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isIframe = window !== window.top || new URLSearchParams(window.location.search).get('iframe') === 'true';

    useEffect(() => {
        if (isIframe) {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            const style = document.createElement('style');
            style.innerHTML = `
                /* ── Layout ── */
                body, html, #root { background: transparent !important; margin: 0 !important; padding: 0 !important; }
                .min-h-screen { background: transparent !important; min-height: auto !important; }
                header, nav { display: none !important; }
                main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }

                /* ── Typography ── */
                * { font-family: 'Space Grotesk', sans-serif !important; }
                body, p, span, label, input, select, textarea, div { font-weight: 400 !important; color: #202020 !important; }
                h1, h2, h3, h4, h5, h6, .font-bold, .font-semibold { font-weight: 700 !important; color: #202020 !important; }

                /* ── Primary color: all yellow variants → #F7CA31 ── */
                .bg-yellow-400, .bg-yellow-500, .bg-yellow-600,
                .bg-blue-600, .bg-blue-700, .bg-slate-800, .bg-slate-900 {
                    background-color: #F7CA31 !important;
                    color: #202020 !important;
                }
                .hover\\:bg-yellow-400:hover, .hover\\:bg-yellow-500:hover, .hover\\:bg-yellow-600:hover,
                .hover\\:bg-blue-700:hover, .hover\\:bg-slate-700:hover, .hover\\:bg-slate-800:hover {
                    background-color: #e0b82a !important;
                    color: #202020 !important;
                }
                .text-yellow-400, .text-yellow-500, .text-yellow-600,
                .text-blue-600, .text-blue-700 { color: #F7CA31 !important; }
                .border-yellow-400, .border-yellow-500, .border-blue-600 { border-color: #F7CA31 !important; }

                /* ── Buttons & Inputs ── */
                button { border-radius: 6px !important; }
                input, select, textarea { border-radius: 6px !important; }

                /* ── White backgrounds stay white ── */
                .bg-white { background-color: #FFFFFF !important; }
            `;
            document.head.appendChild(style);
        }
    }, [isIframe]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && ['fr', 'nl', 'en'].includes(langParam)) {
            i18n.changeLanguage(langParam);
            setFormData(p => ({ ...p, client_language: langParam }));
        }
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
            console.error('Config fetch error', err);
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
                setError(t('clients.vies_not_found', 'Entreprise non trouvée. Vérifiez le numéro de TVA.'));
            }
        } catch (err) {
            console.error('VIES Error:', err);
            setError(t('clients.vies_error', 'Erreur lors de la recherche de l\'entreprise.'));
        } finally {
            setIsSearchingVies(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.honeypot) return;
        if (!formData.surface || parseFloat(formData.surface) <= 0) {
            setError(t('workorders.surface_required', 'La surface est obligatoire.'));
            return;
        }
        setSubmitting(true);
        try {
            const domain = window.location.hostname;
            try {
                    await axios.post('https://n8n-uk6n.onrender.com/webhook/davide-chape-form', {
                        // Clean field names as requested by Jordi
                        first_name: formData.client_first_name,
                        last_name: formData.client_last_name,
                        email: formData.client_email,
                        phone: formData.client_phone,
                        client_language: formData.client_language || 'fr',
                        // Full context
                        company_name: formData.client_company_name,
                        client_type: formData.client_type,
                        surface: formData.surface,
                        thickness: formData.thickness,
                        work_type: formData.work_type,
                        site_address: formData.site_address,
                        approximate_date: formData.approximate_date,
                        has_foil: formData.has_foil,
                        has_mesh: formData.has_mesh,
                        source_domain: window.location.hostname,
                        is_iframe: isIframe,
                        submitted_at: new Date().toISOString(),
                        pricing_details: {
                            base_price_sqm: config?.pricing?.base_price_sqm || 0,
                            extra_thickness_price_per_cm: config?.pricing?.extra_thickness_price_per_cm || 0,
                            plastic_foil_price_sqm: config?.pricing?.plastic_foil_price_sqm || 0,
                            metal_mesh_price_sqm: config?.pricing?.metal_mesh_price_sqm || 0,
                            estimated_total_incl_vat: calculateEstimatedPrice(),
                            vat_rate: formData.client_type === 'juridica' ? config?.pricing?.vat_legal_entity : (formData.work_type === 'repair' ? config?.pricing?.vat_physical_repair : config?.pricing?.vat_physical_new)
                        }
                    });
                } catch (webhookErr) { console.error('Webhook n8n failed:', webhookErr); }

            const res = await publicApi.post('/submit', { ...formData, domain, is_iframe: isIframe });
            if (res.data.token) {
                if (photos.length > 0) {
                    try {
                        const fd = new FormData();
                        photos.forEach(f => fd.append('files', f));
                        await axios.post(`/api/public/work-orders/${res.data.token}/documents`, fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } catch (err) { console.error('Failed to upload photos', err); }
                }
                if (isIframe) {
                    const lang = formData.client_language || 'fr';
                    if (lang === 'nl') window.top.location.href = 'https://davide-chape.webflow.io/nl/confirmation-contact';
                    else if (lang === 'en') window.top.location.href = 'https://davide-chape.webflow.io/en/confirmation-contact';
                    else window.top.location.href = 'https://davide-chape.webflow.io/confirmation-contact';
                } else {
                    navigate(`/public/proforma/${res.data.token}`);
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || t('errors.generic', 'Une erreur est survenue. Veuillez réessayer.'));
            setSubmitting(false);
        }
    };

    const calculateEstimatedPrice = () => {
        if (!config?.pricing || !formData.surface || parseFloat(formData.surface) <= 0) return 0;
        const p = config.pricing;
        const s = parseFloat(formData.surface);
        const th = parseFloat(formData.thickness || 5);
        const base = p.base_price_sqm * s;
        const extraThick = Math.max(0, th - p.standard_thickness_cm);
        const extraCost = extraThick * p.extra_thickness_price_per_cm * s;
        const foil = formData.has_foil ? p.plastic_foil_price_sqm * s : 0;
        const mesh = formData.has_mesh ? p.metal_mesh_price_sqm * s : 0;
        let hiddenExtra = 0;
        if (p.surface_thresholds) {
            p.surface_thresholds.forEach(thresh => {
                const minS = parseFloat(thresh.min_sqm || 0);
                const maxS = parseFloat(thresh.max_sqm || 999999);
                if (s >= minS && s < maxS) hiddenExtra += parseFloat(thresh.extra_charge || 0);
            });
        }
        const total = base + extraCost + foil + mesh + hiddenExtra;
        let vatRate = 21;
        if (formData.client_type === 'juridica') vatRate = p.vat_legal_entity;
        else vatRate = formData.work_type === 'repair' ? p.vat_physical_repair : p.vat_physical_new;
        return total * (1 + vatRate / 100);
    };

    const renderCalendar = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minAvailableDate = new Date(today);
        minAvailableDate.setDate(today.getDate() + 3);
        const targetDate = new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const days = [];
        const weekdays = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
        const header = weekdays.map(wd => (
            <div key={wd} className="text-center text-xs font-bold text-slate-400 py-1">{wd}</div>
        ));
        for (let i = 0; i < offset; i++) days.push(<div key={`blank-${i}`} className="p-1" />);
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isPast = d < minAvailableDate;
            const isSunday = d.getDay() === 0;
            const load = availableDates[dStr] || 0;
            const isGreen = load < 3 && (d.getDate() % 5 !== 0);
            const isUnavailable = isPast || isSunday || !isGreen;
            days.push(
                <button
                    key={dStr} type="button" disabled={isUnavailable}
                    onClick={() => setFormData({ ...formData, approximate_date: dStr })}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative border ${
                        formData.approximate_date === dStr
                            ? 'bg-blue-600 text-white shadow-md font-bold border-blue-600 ring-2 ring-blue-200'
                            : isPast || isSunday
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                : isGreen
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-medium'
                                    : 'bg-red-50 text-red-300 border-red-200 cursor-not-allowed opacity-70'
                    }`}
                >
                    <span className="text-sm">{i}</span>
                    {!isPast && !isSunday && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isGreen ? 'bg-emerald-400' : 'bg-red-300'}`} />
                    )}
                </button>
            );
        }
        const monthName = new Date(year, month, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
        return (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-slate-100 shadow-sm max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={() => setCalendarMonthOffset(p => Math.max(0, p - 1))}
                        disabled={calendarMonthOffset === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 capitalize">{monthName}</h3>
                    <button type="button" onClick={() => setCalendarMonthOffset(p => Math.min(12, p + 1))}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1">{header}{days}</div>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
    );

    const estTotal = calculateEstimatedPrice();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* ── HEADER ELIMINAT CONFORM CERINȚEI ── */}

            <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center mt-6">

                {/* ── STEP INDICATOR ── */}
                <div className="mb-8 px-1">
                    <div className="flex items-start justify-between relative">
                        <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 z-0" />
                        <div className="absolute top-3 left-0 h-0.5 bg-yellow-400 z-0 transition-all duration-500"
                            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }} />
                        {STEP_LABELS_FR.map((label, idx) => {
                            const s = idx + 1;
                            const isDone = s < step;
                            const isActive = s === step;
                            return (
                                <div key={s} className="flex flex-col items-center z-10 gap-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all duration-300 ${
                                        isDone ? 'bg-yellow-400 border-yellow-400 text-slate-900'
                                        : isActive ? 'bg-white border-yellow-400 text-yellow-500 shadow shadow-yellow-200'
                                        : 'bg-white border-slate-200 text-slate-300'
                                    }`}>
                                        {isDone ? '✓' : s}
                                    </div>
                                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                                        isActive ? 'text-slate-700' : isDone ? 'text-yellow-500' : 'text-slate-300'
                                    }`}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── CARD ── */}
                <div className="w-full bg-white border border-slate-100 p-5 sm:p-8 rounded-2xl shadow-lg">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* honeypot */}
                        <input type="text" name="b_name" value={formData.b_name || ''} onChange={e => setFormData({ ...formData, b_name: e.target.value })} style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 1 — DÉTAILS DU PROJET        */}
                        {/* ═══════════════════════════════════ */}
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                        {t('calculator.projectDetails', 'Détails du Projet')}
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        {t('calculator.projectDetailsSub', 'Décrivez le chantier pour que nous puissions calculer les matériaux.')}
                                    </p>
                                </div>

                                {/* Type de travail */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                        {t('calculator.workType', 'Type de travail')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        <button type="button" onClick={() => setFormData({ ...formData, work_type: 'new' })}
                                            className={`p-3 sm:p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                                formData.work_type === 'new'
                                                    ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                                                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-yellow-200'
                                            }`}>
                                            <Home className={`w-6 h-6 ${formData.work_type === 'new' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                            <span className="font-bold text-sm text-center leading-tight">{t('calculator.newBuild', 'Nouvelle Construction')}</span>
                                        </button>
                                        <button type="button" onClick={() => setFormData({ ...formData, work_type: 'repair' })}
                                            className={`p-3 sm:p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                                formData.work_type === 'repair'
                                                    ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                                                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-yellow-200'
                                            }`}>
                                            <HardHat className={`w-6 h-6 ${formData.work_type === 'repair' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                            <span className="font-bold text-sm text-center leading-tight">{t('calculator.renovation', 'Rénovation')}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Surface & Épaisseur */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.surface', 'Surface (m²)')}</label>
                                        <input type="number" required min="1" placeholder="120"
                                            value={formData.surface} onChange={e => setFormData({ ...formData, surface: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white focus:border-yellow-400 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                        <input type="number" required min="6" step="0.5" placeholder="6"
                                            value={formData.thickness} onChange={e => setFormData({ ...formData, thickness: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:bg-white focus:border-yellow-400 transition-all" />
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.options', 'Options')}</label>
                                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_foil ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-slate-50 hover:border-yellow-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <Layers className={`w-5 h-5 ${formData.has_foil ? 'text-yellow-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-sm text-slate-900">{t('calculator.foil', 'Film plastique')}</span>
                                        </div>
                                        <input type="checkbox" checked={formData.has_foil} onChange={e => setFormData({ ...formData, has_foil: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
                                    </label>
                                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_mesh ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-slate-50 hover:border-yellow-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <Grid3x3 className={`w-5 h-5 ${formData.has_mesh ? 'text-yellow-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-sm text-slate-900">{t('calculator.mesh', 'Treillis')}</span>
                                        </div>
                                        <input type="checkbox" checked={formData.has_mesh} onChange={e => setFormData({ ...formData, has_mesh: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
                                    </label>
                                </div>

                                <button type="button" onClick={() => {
                                    if (!formData.surface || parseFloat(formData.surface) <= 0) {
                                        setError(t('errors.surface_required', 'La surface est obligatoire.'));
                                        return;
                                    }
                                    if (!formData.thickness || parseFloat(formData.thickness) < 6) {
                                        setError(t('errors.thickness_min', "L'épaisseur minimale est de 6 cm."));
                                        return;
                                    }
                                    setError(''); setStep(2);
                                }} className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 sm:py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                    {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 2 — ADRESSE DU CHANTIER      */}
                        {/* ═══════════════════════════════════ */}
                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5 pb-48 sm:pb-60">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                        {t('calculator.site_address', 'Adresse du chantier')}
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        {t('calculator.addressSub', "Veuillez saisir l'adresse complète du chantier.")}
                                    </p>
                                </div>

                                <AddressAutocomplete
                                    value={formData.site_address}
                                    onChange={(val) => setFormData({ ...formData, site_address: val })}
                                    onSelect={(addrObj) => setFormData({ ...formData, site_address: addrObj.address })}
                                    placeholder={t('workorders.site_address', 'Adresse complète du chantier')}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:py-3 text-base focus:outline-none focus:bg-white focus:border-yellow-400 transition-all"
                                    required
                                />

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setStep(1)}
                                        className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">
                                        {t('calculator.back', 'Retour')}
                                    </button>
                                    <button type="button" onClick={() => {
                                        if (!formData.site_address) {
                                            setError(t('errors.address_required', "L'adresse du chantier est obligatoire."));
                                            return;
                                        }
                                        setError(''); setStep(3);
                                    }} className="w-2/3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 3 — DATE D'INTERVENTION      */}
                        {/* ═══════════════════════════════════ */}
                        {step === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                        {t('calculator.desired_date_title', "Date proposée d'intervention (à confirmer)")}
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        {t('calculator.dateSub', 'Sélectionnez une date souhaitée ou passez cette étape.')}
                                    </p>
                                </div>

                                {renderCalendar()}

                                {formData.approximate_date && (
                                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span>{new Date(formData.approximate_date + 'T12:00:00').toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        <button type="button" onClick={() => setFormData({ ...formData, approximate_date: '' })}
                                            className="ml-auto text-emerald-500 hover:text-emerald-700 text-xs font-bold underline">
                                            {t('calculator.changeDate', 'Changer')}
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setStep(2)}
                                        className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">
                                        {t('calculator.back', 'Retour')}
                                    </button>
                                    <button type="button" onClick={() => { setError(''); setStep(4); }}
                                        className="w-2/3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        {formData.approximate_date ? t('calculator.continue', 'Continuer') : t('calculator.skip', 'Passer cette étape')}
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 4 — VOS COORDONNÉES          */}
                        {/* ═══════════════════════════════════ */}
                        {step === 4 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                        {t('clients.client_details', 'Vos coordonnées')}
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        {t('calculator.contactSub', 'Particulier ou entreprise — indiquez vos informations.')}
                                    </p>
                                </div>

                                {/* Toggle Particulier / Entreprise */}
                                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl">
                                    <button type="button" onClick={() => setFormData({ ...formData, client_type: 'fizica' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.client_type === 'fizica' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <User className="w-4 h-4" /> {t('clients.type_physical', 'Particulier')}
                                    </button>
                                    <button type="button" onClick={() => setFormData({ ...formData, client_type: 'juridica' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.client_type === 'juridica' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <Building2 className="w-4 h-4" /> {t('clients.type_legal', 'Entreprise')}
                                    </button>
                                </div>

                                {/* Champs Entreprise (juridica) */}
                                {formData.client_type === 'juridica' && (
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.cui', 'Numéro de TVA')}</label>
                                            <div className="flex gap-2">
                                                <input type="text" required value={formData.client_company_vat}
                                                    onChange={e => setFormData({ ...formData, client_company_vat: e.target.value })}
                                                    onBlur={handleViesSearch}
                                                    placeholder="BE0123456789"
                                                    className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all" />
                                                <button type="button" onClick={handleViesSearch} disabled={isSearchingVies}
                                                    className="bg-slate-800 text-white w-14 rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center">
                                                    {isSearchingVies ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{t('clients.vies_hint', 'Entrez le numéro pour remplir automatiquement.')}</p>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.company_name', "Nom de l'entreprise")}</label>
                                            <input type="text" required value={formData.client_company_name}
                                                onChange={e => setFormData({ ...formData, client_company_name: e.target.value })}
                                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all" />
                                        </div>
                                    </div>
                                )}

                                {/* Prénom & Nom */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.first_name', 'Prénom')}</label>
                                        <input type="text" required value={formData.client_first_name}
                                            onChange={e => setFormData({ ...formData, client_first_name: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.last_name', 'Nom')}</label>
                                        <input type="text" required value={formData.client_last_name}
                                            onChange={e => setFormData({ ...formData, client_last_name: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.phone', 'Téléphone')}</label>
                                    <input type="tel" required value={formData.client_phone}
                                        onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.email', 'Email')}</label>
                                    <input type="email" required value={formData.client_email}
                                        onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                                        pattern="[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"
                                        title={t('clients.email_invalid', 'Veuillez entrer une adresse email valide (ex: contact@domaine.com)')}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all focus:invalid:border-red-400 focus:invalid:ring-red-100" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">{t('clients.billing_address', 'Adresse de facturation')} <span className="normal-case font-normal text-slate-400">({t('common.optional', 'optionnel')})</span></label>
                                    <input type="text" value={formData.client_address}
                                        onChange={e => setFormData({ ...formData, client_address: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-base focus:bg-white focus:border-yellow-400 outline-none transition-all" />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setStep(3)}
                                        className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">
                                        {t('calculator.back', 'Retour')}
                                    </button>
                                    <button type="button" onClick={(e) => {
                                        const form = e.target.closest('form');
                                        if (!form.checkValidity()) { form.reportValidity(); return; }
                                        setStep(5);
                                    }} className="w-2/3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════ */}
                        {/* ÉTAPE 5 — PHOTOS (optionnel)       */}
                        {/* ═══════════════════════════════════ */}
                        {step === 5 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                        {t('calculator.photosTitle', 'Photos du chantier')}
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        {t('calculator.photosSub', 'Ajoutez des photos pour obtenir un devis encore plus précis.')}
                                    </p>
                                </div>

                                {/* Tip */}
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                                    <Camera className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                    <span>{t('calculator.photosTip', "Conseil : photographiez l'espace global, le sol existant et tout obstacle potentiel.")}</span>
                                </div>

                                {/* Drop zone */}
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                    <input type="file" multiple accept="image/*"
                                        onChange={e => setPhotos([...photos, ...Array.from(e.target.files)])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="flex flex-col items-center gap-2 text-slate-500 pointer-events-none">
                                        <div className="w-12 h-12 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-sm">{t('calculator.photosClick', 'Cliquez pour sélectionner des photos')}</span>
                                        <span className="text-xs text-slate-400">{t('calculator.photosDrag', 'ou glissez-déposez ici')}</span>
                                    </div>
                                </div>

                                {photos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {photos.map((p, i) => (
                                            <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50 flex items-center justify-center">
                                                {p.type?.startsWith('image/') ? (
                                                    <img src={URL.createObjectURL(p)} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 text-slate-400 p-2 text-center">
                                                        <FileText className="w-6 h-6" />
                                                        <span className="text-[10px] break-all">{p.name}</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setPhotos(photos.filter((_, idx) => idx !== i)); }}
                                                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setStep(4)}
                                        className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">
                                        {t('calculator.back', 'Retour')}
                                    </button>
                                    <button type="submit" disabled={submitting}
                                        className="w-2/3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/30">
                                        {submitting
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : photos.length > 0
                                                ? t('calculator.get_quote_with_photos', `Recevoir le devis (${photos.length} photo${photos.length > 1 ? 's' : ''})`)
                                                : t('calculator.get_quote', 'Recevoir le devis')
                                        }
                                        {!submitting && <ChevronRight className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="flex justify-center">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {t('calculator.secureData', 'Données sécurisées et confidentielles.')}
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
