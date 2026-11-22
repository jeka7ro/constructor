import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, User, Loader2, CheckCircle2, HardHat, FileText, ChevronRight, Home, Layers, Grid3x3, ShieldCheck, ChevronLeft, Search, Camera, Trash2, Sun, Thermometer, Wind, Paintbrush, Shield, Ruler, Globe } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete';

const publicApi = axios.create({ baseURL: '/api/public/devis_online' });

const TOTAL_STEPS = 5;


export default function DevisOnline() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [availableDates, setAvailableDates] = useState({});
    const [step, setStep] = useState(1);
    const [photos, setPhotos] = useState([]);
    const [formData, setFormData] = useState({
        service_category: 'chape', // 'chape' | 'isolation' — chosen from Step 1 so Chape and Isolation are separate quotes
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
        
        // ── Multiple Surfaces ──
        surfaces: [{ id: '1', label: 'Chape', surface: '', thickness: '', has_foil: false, has_mesh: false, has_duramint: true }],
        isolations: [{ id: 'iso-1', type: 'pur', surface: '', thickness: '', isolation_pur_aspiration: false, isolation_pur_niveller: false, isolation_pur_poncage: false, isolation_pur_protection: false }],
        
        // Legacy
        surface: '',
        thickness: '',
        has_foil: false,
        has_mesh: false,
        has_duramint: true,
        approximate_date: '',
        honeypot: '',
        // Isolation
        needs_isolation: false,
        isolation_type: '',
        isolation_surface: '',
        isolation_thickness: '',
        isolation_pur_aspiration: false,
        isolation_pur_niveller: false,
        isolation_pur_poncage: false,
        isolation_pur_protection: false
    });

    const [isSearchingVies, setIsSearchingVies] = useState(false);
    const [viesLookupNotice, setViesLookupNotice] = useState('');
    const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [errorField, setErrorField] = useState('');



    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && ['fr', 'nl', 'en'].includes(langParam)) {
            i18n.changeLanguage(langParam);
            setFormData(p => ({ ...p, client_language: langParam }));
        } else {
            // DevisOnline is client-facing: always default to French
            i18n.changeLanguage('fr');
            setFormData(p => ({ ...p, client_language: 'fr' }));
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
        if (!vatNum || vatNum.length < 8) return;
        setIsSearchingVies(true);
        setViesLookupNotice('');
        try {
            const hasCountryPrefix = /^[A-Za-z]{2}/.test(vatNum);
            const country = hasCountryPrefix ? vatNum.substring(0, 2).toUpperCase() : 'BE';
            const cleanVat = hasCountryPrefix ? vatNum.substring(2) : vatNum;
            const res = await publicApi.get(`/vies/${country}/${cleanVat}`);
            if (res.data && res.data.valid) {
                setFormData(p => ({
                    ...p,
                    client_company_name: res.data.name || p.client_company_name,
                    client_address: res.data.address || p.client_address
                }));
                if (errorField === 'client_company_vat') {
                    setErrorField('');
                    setError('');
                }
            } else {
                // Non-blocking notice so client can still type company name manually
                setViesLookupNotice(t('clients.vies_not_found_optional', "Numéro non trouvé dans la BCE — vous pouvez saisir le nom de l'entreprise manuellement."));
            }
        } catch (err) {
            console.error('BCE/VIES Error:', err);
            setViesLookupNotice(t('clients.vies_not_found_optional', "Recherche BCE indisponible — vous pouvez saisir le nom de l'entreprise manuellement."));
        } finally {
            setIsSearchingVies(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.honeypot) return;
        const isIsolationOnly = formData.service_category === 'isolation';
        const activeSurfaces = isIsolationOnly ? [] : (formData.surfaces || []);
        const activeIsolations = isIsolationOnly ? (formData.isolations || []) : [];
        const totalSurface = activeSurfaces.reduce((sum, s) => sum + (parseFloat(s.surface) || 0), 0);
        const totalIsoSurface = activeIsolations.reduce((sum, i) => sum + (parseFloat(i.surface) || 0), 0);
        if (!isIsolationOnly && totalSurface <= 0) {
            setError(t('workorders.surface_required', 'La surface est obligatoire.'));
            return;
        }
        if (isIsolationOnly && totalIsoSurface <= 0) {
            setError(t('workorders.surface_required', 'La surface est obligatoire.'));
            return;
        }
        setSubmitting(true);
        try {
            const domain = window.location.hostname;
            const urlSource = new URLSearchParams(window.location.search).get('source');
            const chosenLang = i18n.language || formData.client_language || 'fr';
            const labeledSurfaces = activeSurfaces.map((s, idx) => ({
                ...s,
                label: activeSurfaces.length > 1 ? `Chape ${idx + 1}` : 'Chape'
            }));
            const labeledIsolations = activeIsolations.map((iso, idx) => {
                const sameType = activeIsolations.filter(i => i.type === iso.type);
                let lbl = iso.type === 'pur' ? 'Isolation PUR' : (iso.type === 'eps' ? 'Isolation EPS' : 'Isolation');
                if (sameType.length > 1) {
                    const typeIdx = activeIsolations.filter((i, iIdx) => i.type === iso.type && iIdx <= idx).length;
                    lbl = `${lbl} ${typeIdx}`;
                } else if (activeIsolations.length > 1) {
                    lbl = `${lbl} ${idx + 1}`;
                }
                return { ...iso, label: lbl };
            });
            const submitData = { 
                ...formData, 
                surfaces: labeledSurfaces,
                isolations: labeledIsolations,
                surface: isIsolationOnly ? 0 : (parseFloat(labeledSurfaces[0]?.surface) || 0),
                thickness: isIsolationOnly ? 0 : (parseFloat(labeledSurfaces[0]?.thickness) || 0),
                needs_isolation: isIsolationOnly,
                client_language: chosenLang,
                language: chosenLang,
                lang: chosenLang,
                domain, 
                is_iframe: false, 
                source: urlSource 
            };
            // Remove fields not expected by backend
            delete submitData.b_name;
            // Clean up isolation data: convert empty strings to null for float fields
            if (!submitData.needs_isolation) {
                delete submitData.isolation_type;
                delete submitData.isolation_surface;
                delete submitData.isolation_thickness;
            } else {
                if (submitData.isolation_surface === '') submitData.isolation_surface = null;
                if (submitData.isolation_thickness === '') submitData.isolation_thickness = null;
                if (submitData.isolation_type === '') submitData.isolation_type = null;
            }
            const res = await publicApi.post('/submit', submitData);
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
                // Webhook n8n — fires AFTER backend so we have the token & signing_url
                try {
                    const signingUrl = `https://${domain}/public/proforma/${res.data.token}?lang=${chosenLang}`;
                    await axios.post('https://n8n-uk6n.onrender.com/webhook/davide-chape-form', {
                        first_name: formData.client_first_name,
                        last_name: formData.client_last_name,
                        email: formData.client_email,
                        phone: formData.client_phone,
                        client_language: chosenLang,
                        company_name: formData.client_company_name,
                        client_type: formData.client_type,
                        surfaces: labeledSurfaces,
                        isolations: labeledIsolations,
                        // Legacy compatibility
                        surface: formData.surface || (formData.surfaces?.[0]?.surface),
                        thickness: formData.thickness || (formData.surfaces?.[0]?.thickness),
                        work_type: formData.work_type,
                        site_address: formData.site_address,
                        approximate_date: formData.approximate_date,
                        has_foil: formData.surfaces?.[0]?.has_foil || formData.has_foil,
                        has_mesh: formData.surfaces?.[0]?.has_mesh || formData.has_mesh,
                        has_duramint: formData.surfaces?.[0]?.has_duramint || formData.has_duramint,
                        needs_isolation: formData.isolations?.length > 0 || formData.needs_isolation,
                        isolation_type: formData.isolations?.[0]?.type || formData.isolation_type,
                        isolation_surface: formData.isolations?.[0]?.surface || formData.isolation_surface,
                        isolation_thickness: formData.isolations?.[0]?.thickness || formData.isolation_thickness,
                        source_domain: domain,
                        is_iframe: false,
                        submitted_at: new Date().toISOString(),
                        signing_url: signingUrl,
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
                navigate(`/public/proforma/${res.data.token}?lang=${chosenLang}`);
            }
        } catch (err) {
            console.error(err);
            let errMsg = t('errors.generic', 'Une erreur est survenue. Veuillez réessayer.');
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errMsg = err.response.data.detail;
                } else if (Array.isArray(err.response.data.detail)) {
                    errMsg = err.response.data.detail.map(d => d.msg).join(', ');
                }
            }
            setError(errMsg);
            setSubmitting(false);
        }
    };

    const calculateEstimatedPrice = () => {
        if (!config?.pricing) return 0;
        const p = config.pricing;
        const isIsolationOnly = formData.service_category === 'isolation';

        let total = 0;

        if (!isIsolationOnly) {
            const surfaces = (formData.surfaces || []).filter(s => parseFloat(s.surface || 0) > 0);
            const totalSurface = surfaces.reduce((sum, s) => sum + parseFloat(s.surface || 0), 0);
            if (totalSurface <= 0) return 0;

            const baseLargeThresh = parseFloat(p.base_large_threshold_sqm || 250);
            const baseRate = totalSurface > baseLargeThresh ? parseFloat(p.base_price_sqm_large || p.base_price_sqm || 12.5) : parseFloat(p.base_price_sqm || 12.5);

            const stdThick = parseFloat(p.standard_thickness_cm || 5);
            const extraThresh = parseFloat(p.extra_thickness_large_threshold_sqm || baseLargeThresh);
            const extraPrice = totalSurface > extraThresh ? parseFloat(p.extra_thickness_price_per_cm_large || p.extra_thickness_price_per_cm || 1.25) : parseFloat(p.extra_thickness_price_per_cm || 1.25);

            const fiberThresh = parseFloat(p.fiber_large_threshold_sqm || 200);
            const fiberRate = totalSurface > fiberThresh ? parseFloat(p.fiber_price_sqm_large || 2.0) : parseFloat(p.fiber_price_sqm || 2.5);

            let baseCost = 0;
            let extraCost = 0;
            let foil = 0;
            let mesh = 0;
            let fiber = 0;

            surfaces.forEach(s => {
                const sArea = parseFloat(s.surface || 0);
                const sThick = parseFloat(s.thickness || 5);

                baseCost += baseRate * sArea;
                extraCost += Math.max(0, sThick - stdThick) * extraPrice * sArea;
                if (s.has_foil || formData.has_foil) foil += parseFloat(p.plastic_foil_price_sqm || 1.2) * sArea;
                if (s.has_mesh || formData.has_mesh) mesh += parseFloat(p.metal_mesh_price_sqm || 2.5) * sArea;
                if (s.has_duramint !== false) fiber += fiberRate * sArea;
            });

            let hiddenExtra = 0;
            if (p.surface_thresholds && totalSurface > 0) {
                p.surface_thresholds.forEach((thresh, idx) => {
                    const minS = parseFloat(thresh.min_sqm || 0);
                    const nextTier = p.surface_thresholds[idx + 1];
                    const maxS = nextTier && parseFloat(nextTier.min_sqm) > parseFloat(thresh.max_sqm || 0)
                        ? parseFloat(nextTier.min_sqm) - 0.0001
                        : parseFloat(thresh.max_sqm || 999999);
                    if (totalSurface >= minS && totalSurface <= maxS) hiddenExtra += parseFloat(thresh.extra_charge || 0);
                });
            }

            total = baseCost + extraCost + foil + mesh + fiber + hiddenExtra;
        } else {
            const isolations = (formData.isolations || []).filter(i => parseFloat(i.surface || 0) > 0 && i.type);
            if (isolations.length === 0) return 0;

            isolations.forEach(iso => {
                const iArea = parseFloat(iso.surface || 0);
                const iThick = parseFloat(iso.thickness || 3);
                if (iso.type === 'pur') {
                    const base3cm = parseFloat(p.pur_base_price_3cm || 13.95);
                    const stepTo10 = parseFloat(p.pur_step_price_up_to_10cm || 1.65);
                    const stepOver10 = parseFloat(p.pur_extra_price_above_10cm || 2.10);
                    const minExec = parseFloat(p.pur_minimum_execution_price || 1375.0);

                    const cmTo10 = Math.max(0, Math.min(iThick, 10) - 3);
                    const cmOver10 = Math.max(0, iThick - 10);
                    const ratePerSqm = base3cm + cmTo10 * stepTo10 + cmOver10 * stepOver10;
                    let isoCost = Math.max(minExec, ratePerSqm * iArea);

                    if (iso.isolation_pur_aspiration || p.is_pur_aspiration_mandatory) isoCost += parseFloat(p.pur_opt_aspiration || 0) * iArea;
                    if (iso.isolation_pur_niveller || p.is_pur_niveller_mandatory) isoCost += parseFloat(p.pur_opt_niveller || 0) * iArea;
                    if (iso.isolation_pur_poncage || p.is_pur_poncage_mandatory) isoCost += parseFloat(p.pur_opt_poncage || 0) * iArea;
                    if (iso.isolation_pur_protection || p.is_pur_protection_mandatory) isoCost += parseFloat(p.pur_opt_protection || 0) * iArea;
                    total += isoCost;
                } else if (iso.type === 'eps') {
                    const volM3 = (iArea * iThick) / 100.0;
                    let epsRate = 240.0;
                    if (Array.isArray(p.eps_volume_thresholds) && p.eps_volume_thresholds.length > 0) {
                        const matched = p.eps_volume_thresholds.find(t => volM3 >= parseFloat(t.min_m3 || 0) && volM3 <= parseFloat(t.max_m3 || 999999));
                        if (matched && matched.price_per_m3) epsRate = parseFloat(matched.price_per_m3);
                    }
                    total += volM3 * epsRate;
                }
            });
        }

        let vatRate = 21;
        if (formData.client_type === 'juridica') vatRate = p.vat_legal_entity ?? 0;
        else vatRate = formData.work_type === 'repair' ? (p.vat_physical_repair ?? 6) : (p.vat_physical_new ?? 21);

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
        const weekdays = i18n.language === 'nl' ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] :
                         i18n.language === 'en' ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] :
                         ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
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
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm py-2.5 px-3 sm:py-3 sm:px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
                    <img
                        src="https://cdn.prod.website-files.com/67efee5e09c6da428d8d176a/67f784844af92f795caaeedb_Davide%20Chape%20-Logo.svg"
                        alt="Davide Chape" className="h-6 sm:h-8 object-contain"
                    />
                    <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <Globe className="w-3.5 h-3.5 text-slate-500 ml-1 hidden xs:block" />
                        {['fr', 'nl', 'en'].map(lang => (
                            <button key={lang} onClick={() => handleLanguageChange(lang)}
                                className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-black rounded-lg transition-all ${i18n.language === lang ? 'bg-white shadow-sm text-slate-900 border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'}`}>
                                <img src={`https://flagcdn.com/w20/${lang === 'en' ? 'gb' : lang}.png`} alt={lang} className="w-4 h-[11px] sm:w-[18px] sm:h-[13px] object-cover shadow-sm rounded-sm" />
                                <span>{lang.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center mt-6">

                {/* ── STEP INDICATOR ── */}
                <div className="mb-8 px-1">
                    <div className="flex items-start justify-between relative">
                        <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 z-0" />
                        <div className="absolute top-3 left-0 h-0.5 bg-yellow-400 z-0 transition-all duration-500"
                            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }} />
                        {[
                            t('calculator.step_details', 'Détails'),
                            t('calculator.step_address', 'Adresse'),
                            t('calculator.step_date', 'Date'),
                            t('calculator.step_contact', 'Contact'),
                            t('calculator.step_photos', 'Photos')
                        ].map((label, idx) => {
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
                                        {isDone ? '' : s}
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
                <div className="w-full bg-white border border-slate-100 p-5 sm:p-8 rounded-2xl shadow-lg min-h-[520px] flex flex-col">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
                        {/* honeypot */}
                        <input type="text" name="b_name" value={formData.b_name || ''} onChange={e => setFormData({ ...formData, b_name: e.target.value })} style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

                        {/* ═════════════════════════════════════════════════════════════ */}
                        {/* ÉTAPE 1 — CHOIX DU SERVICE : CHAPE OU ISOLATION (SÉPARÉS)     */}
                        {/* ═════════════════════════════════════════════════════════════ */}
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-slate-900 tracking-tight">
                                        {formData.service_category === 'isolation'
                                            ? t('calculator.isolation_title', 'Isolation (PUR / EPS)')
                                            : t('calculator.chape_title', 'Chape')}
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        {t('calculator.choose_service_sub', 'La chape et l’isolation étant exécutées à des dates différentes, choisissez la prestation pour ce devis.')}
                                    </p>
                                </div>

                                {/* Apple HIG Segmented Control (segmented-controls.md: equal-width text segments, no redundant introductory label) */}
                                <div
                                    role="tablist"
                                    aria-label={t('calculator.service_type_label', 'Prestation')}
                                    className="grid grid-cols-2 p-1 bg-slate-200/75 rounded-full border border-slate-200/80 shadow-inner"
                                >
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={formData.service_category !== 'isolation'}
                                        onClick={() => {
                                            setError('');
                                            setErrorField('');
                                            setFormData(p => ({ ...p, service_category: 'chape', needs_isolation: false }));
                                        }}
                                        className={`py-2.5 px-4 rounded-full text-sm font-semibold transition-all ${
                                            formData.service_category !== 'isolation'
                                                ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.10)]'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {t('calculator.chape_title', 'Chape')}
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={formData.service_category === 'isolation'}
                                        onClick={() => {
                                            setError('');
                                            setErrorField('');
                                            setFormData(p => ({
                                                ...p,
                                                service_category: 'isolation',
                                                needs_isolation: true,
                                                isolations: p.isolations?.length > 0
                                                    ? p.isolations
                                                    : [{ id: Date.now().toString(), type: 'pur', surface: '', thickness: '', isolation_pur_aspiration: false, isolation_pur_niveller: false, isolation_pur_poncage: false, isolation_pur_protection: false }]
                                            }));
                                        }}
                                        className={`py-2.5 px-4 rounded-full text-sm font-semibold transition-all ${
                                            formData.service_category === 'isolation'
                                                ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.10)]'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {t('calculator.isolation_title', 'Isolation (PUR / EPS)')}
                                    </button>
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

                                {/* ── BRANCH A: CHAPE ONLY ── */}
                                {formData.service_category !== 'isolation' && (
                                    <>
                                        {/* Surfaces List */}
                                        <div className="space-y-4">
                                            {(formData.surfaces || []).map((s, index) => (
                                                <div key={s.id || index} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                                                    {formData.surfaces.length > 1 && (
                                                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/60">
                                                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md">
                                                                {t('calculator.chape_n', 'Chape {{n}}', { n: index + 1 })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-end gap-3">
                                                        <div className="flex-1">
                                                            <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${errorField === `surface_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.surface', 'Surface (m²)')}</label>
                                                            <input type="number" min="1" placeholder="120"
                                                                value={s.surface} onChange={e => {
                                                                    const newSurfaces = [...formData.surfaces];
                                                                    newSurfaces[index].surface = e.target.value;
                                                                    setFormData({ ...formData, surfaces: newSurfaces });
                                                                    if (errorField === `surface_${index}`) { setErrorField(''); setError(''); }
                                                                }}
                                                                className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white transition-all ${errorField === `surface_${index}` ? 'border-red-400 text-red-600 focus:border-red-500 bg-red-50/30' : 'border-slate-100 focus:border-yellow-400'}`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${errorField === `thickness_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                                            <input type="number" min="5" step="0.5" placeholder="5"
                                                                value={s.thickness} onChange={e => {
                                                                    const newSurfaces = [...formData.surfaces];
                                                                    newSurfaces[index].thickness = e.target.value;
                                                                    setFormData({ ...formData, surfaces: newSurfaces });
                                                                    if (errorField === `thickness_${index}`) { setErrorField(''); setError(''); }
                                                                }}
                                                                className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white transition-all ${errorField === `thickness_${index}` ? 'border-red-400 text-red-600 focus:border-red-500 bg-red-50/30' : 'border-slate-100 focus:border-yellow-400'}`} />
                                                        </div>
                                                        {formData.surfaces.length > 1 && (
                                                            <button type="button" onClick={() => {
                                                                const newSurfaces = formData.surfaces.filter((_, i) => i !== index);
                                                                setFormData({ ...formData, surfaces: newSurfaces });
                                                            }} className="h-[40px] px-3 bg-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-colors border border-red-100 flex items-center justify-center">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            <button type="button" onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    surfaces: [...formData.surfaces, { id: Date.now().toString(), label: '', surface: '', thickness: '', has_foil: formData.has_foil, has_mesh: formData.has_mesh, has_duramint: true }]
                                                });
                                            }} className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:text-yellow-600 hover:border-yellow-400 hover:bg-yellow-50 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                                                + {t('calculator.add_surface', 'Ajouter une autre surface')}
                                            </button>
                                        </div>

                                        {/* Global Options */}
                                        <div className="space-y-2 mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.options', 'Options')}</label>
                                            <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_foil ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-white hover:border-yellow-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <Layers className={`w-5 h-5 ${formData.has_foil ? 'text-yellow-600' : 'text-slate-400'}`} />
                                                    <span className="font-bold text-sm text-slate-900">{t('calculator.foil', 'Film plastique')}</span>
                                                </div>
                                                <input type="checkbox" checked={formData.has_foil} onChange={e => {
                                                    const checked = e.target.checked;
                                                    setFormData(p => ({
                                                        ...p,
                                                        has_foil: checked,
                                                        surfaces: (p.surfaces || []).map(s => ({ ...s, has_foil: checked }))
                                                    }));
                                                }} className="w-4 h-4 accent-yellow-400" />
                                            </label>
                                            <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.has_mesh ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 bg-white hover:border-yellow-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <Grid3x3 className={`w-5 h-5 ${formData.has_mesh ? 'text-yellow-600' : 'text-slate-400'}`} />
                                                    <span className="font-bold text-sm text-slate-900">{t('calculator.mesh', 'Treillis')}</span>
                                                </div>
                                                <input type="checkbox" checked={formData.has_mesh} onChange={e => {
                                                    const checked = e.target.checked;
                                                    setFormData(p => ({
                                                        ...p,
                                                        has_mesh: checked,
                                                        surfaces: (p.surfaces || []).map(s => ({ ...s, has_mesh: checked }))
                                                    }));
                                                }} className="w-4 h-4 accent-yellow-400" />
                                            </label>
                                            <label className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all border-yellow-400 bg-yellow-50/50 opacity-80 cursor-not-allowed`} title={t('calculator.duramint_always_included', 'Toujours inclus')}>
                                                <div className="flex items-center gap-3">
                                                    <Layers className={`w-5 h-5 text-yellow-600`} />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-slate-900">{t('calculator.duramint', 'Fibre')}</span>
                                                        <span className="text-[10px] text-yellow-700">{t('calculator.always_included', 'Toujours inclus')}</span>
                                                    </div>
                                                </div>
                                                <input type="checkbox" checked={true} readOnly className="w-4 h-4 accent-yellow-400 cursor-not-allowed" />
                                            </label>
                                        </div>

                                        <button type="button" onClick={() => {
                                            let hasError = false;
                                            for (let i = 0; i < formData.surfaces.length; i++) {
                                                const s = formData.surfaces[i];
                                                if (!s.surface || parseFloat(s.surface) <= 0) {
                                                    setErrorField(`surface_${i}`);
                                                    setError(t('errors.surface_required', 'La surface est obligatoire.'));
                                                    hasError = true;
                                                    break;
                                                }
                                                if (!s.thickness || parseFloat(s.thickness) < 5) {
                                                    setErrorField(`thickness_${i}`);
                                                    setError(t('errors.thickness_min', "L'épaisseur minimale est de 5 cm."));
                                                    hasError = true;
                                                    break;
                                                }
                                            }
                                            if (hasError) return;
                                            
                                            setFormData(p => ({
                                                ...p,
                                                needs_isolation: false,
                                                surface: p.surfaces[0]?.surface,
                                                thickness: p.surfaces[0]?.thickness,
                                                has_foil: p.has_foil,
                                                has_mesh: p.has_mesh,
                                                has_duramint: true
                                            }));
                                            
                                            setError(''); setStep(2);
                                        }} className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 sm:py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </>
                                )}

                                {/* ── BRANCH B: ISOLATION ONLY (PUR / EPS) ── */}
                                {formData.service_category === 'isolation' && (
                                    <div className="space-y-4">
                                        {(formData.isolations || []).map((iso, index) => (
                                            <div key={iso.id || index} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative">
                                                {formData.isolations.length > 1 && (
                                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 pr-10">
                                                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-md">
                                                            {t('calculator.isolation_n', 'Isolation {{n}}', { n: index + 1 })}
                                                        </span>
                                                    </div>
                                                )}
                                                {formData.isolations.length > 1 && (
                                                    <button type="button" onClick={() => {
                                                        const newIsolations = formData.isolations.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, isolations: newIsolations });
                                                    }} className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 bg-white rounded-md shadow-sm border border-red-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">{t('calculator.isolation_choose', "Type d'isolation")}</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button type="button" onClick={() => {
                                                            const newIsolations = [...formData.isolations];
                                                            newIsolations[index].type = 'pur';
                                                            setFormData({ ...formData, isolations: newIsolations });
                                                        }} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                                                            iso.type === 'pur'
                                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'
                                                        }`}>
                                                            <Wind className={`w-5 h-5 ${iso.type === 'pur' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                            <span className="font-bold text-sm">Isolation PUR</span>
                                                        </button>
                                                        <button type="button" onClick={() => {
                                                            const newIsolations = [...formData.isolations];
                                                            newIsolations[index].type = 'eps';
                                                            setFormData({ ...formData, isolations: newIsolations });
                                                        }} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                                                            iso.type === 'eps'
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300'
                                                        }`}>
                                                            <Thermometer className={`w-5 h-5 ${iso.type === 'eps' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                            <span className="font-bold text-sm">Isolation EPS</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className={`block text-[11px] font-bold mb-1.5 uppercase tracking-wider ${errorField === `iso_surface_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.surface', 'Surface (m²)')}</label>
                                                        <input type="number" min="1" placeholder="120"
                                                            value={iso.surface} onChange={e => {
                                                                const newIsolations = [...formData.isolations];
                                                                newIsolations[index].surface = e.target.value;
                                                                setFormData({ ...formData, isolations: newIsolations });
                                                                if (errorField === `iso_surface_${index}`) { setErrorField(''); setError(''); }
                                                            }}
                                                            className={`w-full bg-white border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none transition-all ${errorField === `iso_surface_${index}` ? 'border-red-400 text-red-600' : iso.type === 'pur' ? 'border-slate-100 focus:border-indigo-400' : 'border-slate-100 focus:border-emerald-400'}`} />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-[11px] font-bold mb-1.5 uppercase tracking-wider ${errorField === `iso_thickness_${index}` ? 'text-red-500' : 'text-slate-500'}`}>{t('calculator.thickness', 'Épaisseur (cm)')}</label>
                                                        <input type="number" min="1" step="0.5" placeholder="5"
                                                            value={iso.thickness} onChange={e => {
                                                                const newIsolations = [...formData.isolations];
                                                                newIsolations[index].thickness = e.target.value;
                                                                setFormData({ ...formData, isolations: newIsolations });
                                                                if (errorField === `iso_thickness_${index}`) { setErrorField(''); setError(''); }
                                                            }}
                                                            className={`w-full bg-white border-2 rounded-xl px-3 py-2.5 text-base focus:outline-none transition-all ${errorField === `iso_thickness_${index}` ? 'border-red-400 text-red-600' : iso.type === 'pur' ? 'border-slate-100 focus:border-indigo-400' : 'border-slate-100 focus:border-emerald-400'}`} />
                                                    </div>
                                                </div>

                                                {iso.type === 'pur' && (
                                                    <div className="space-y-2">
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('calculator.options', 'Options')}</label>
                                                        {[
                                                            { key: 'isolation_pur_aspiration', label: t('calculator.pur_aspiration', 'Aspiration'), icon: Wind, mandatory: config?.pricing?.is_pur_aspiration_mandatory },
                                                            { key: 'isolation_pur_niveller', label: t('calculator.pur_niveller', 'Nivellement au laser'), icon: Ruler, mandatory: config?.pricing?.is_pur_niveller_mandatory },
                                                            { key: 'isolation_pur_poncage', label: t('calculator.pur_poncage', 'Ponçage de la mousse'), sublabel: t('calculator.pur_poncage_sub', 'obligatoire pour chauffage au sol'), icon: Paintbrush, mandatory: config?.pricing?.is_pur_poncage_mandatory },
                                                            { key: 'isolation_pur_protection', label: t('calculator.pur_protection', 'Protection au-dessus 1M'), icon: Shield, mandatory: config?.pricing?.is_pur_protection_mandatory },
                                                        ].map(opt => (
                                                            <label key={opt.key} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${opt.mandatory ? 'border-indigo-400 bg-indigo-50/50 opacity-80 cursor-not-allowed' : iso[opt.key] ? 'border-indigo-400 bg-indigo-50/50 cursor-pointer' : 'border-slate-100 bg-white hover:border-indigo-200 cursor-pointer'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <opt.icon className={`w-5 h-5 ${(iso[opt.key] || opt.mandatory) ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                                                                        {opt.sublabel && <span className="text-[10px] text-amber-600 italic">{opt.sublabel}</span>}
                                                                        {opt.mandatory && <span className="text-[10px] text-indigo-700">{t('calculator.always_included', 'Toujours inclus')}</span>}
                                                                    </div>
                                                                </div>
                                                                <input type="checkbox" checked={opt.mandatory || iso[opt.key]} disabled={opt.mandatory}
                                                                    onChange={e => {
                                                                        if (!opt.mandatory) {
                                                                            const newIsolations = [...formData.isolations];
                                                                            newIsolations[index][opt.key] = e.target.checked;
                                                                            setFormData({ ...formData, isolations: newIsolations });
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 accent-indigo-500" />
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <button type="button" onClick={() => {
                                            setFormData({
                                                ...formData,
                                                isolations: [...formData.isolations, { id: Date.now().toString(), type: 'pur', surface: '', thickness: '', isolation_pur_aspiration: false, isolation_pur_niveller: false, isolation_pur_poncage: false, isolation_pur_protection: false }]
                                            });
                                        }} className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                                            + {t('calculator.add_isolation', 'Ajouter une autre isolation')}
                                        </button>

                                        <button type="button" onClick={() => {
                                            let hasError = false;
                                            for (let i = 0; i < formData.isolations.length; i++) {
                                                const iso = formData.isolations[i];
                                                if (!iso.type) {
                                                    setError(t('errors.isolation_type_required', "Veuillez choisir un type d'isolation."));
                                                    hasError = true;
                                                    break;
                                                }
                                                if (!iso.surface || parseFloat(iso.surface) <= 0) {
                                                    setErrorField(`iso_surface_${i}`);
                                                    setError(t('errors.surface_required', 'La surface est obligatoire.'));
                                                    hasError = true;
                                                    break;
                                                }
                                                if (!iso.thickness || parseFloat(iso.thickness) <= 0) {
                                                    setErrorField(`iso_thickness_${i}`);
                                                    setError(t('errors.thickness_min', "L'épaisseur est obligatoire."));
                                                    hasError = true;
                                                    break;
                                                }
                                            }
                                            if (hasError) return;

                                            setFormData(p => ({
                                                ...p,
                                                needs_isolation: true,
                                                isolation_type: p.isolations[0]?.type || 'pur',
                                                isolation_surface: p.isolations[0]?.surface || '',
                                                isolation_thickness: p.isolations[0]?.thickness || '',
                                                isolation_pur_aspiration: p.isolations[0]?.isolation_pur_aspiration || false,
                                                isolation_pur_niveller: p.isolations[0]?.isolation_pur_niveller || false,
                                                isolation_pur_poncage: p.isolations[0]?.isolation_pur_poncage || false,
                                                isolation_pur_protection: p.isolations[0]?.isolation_pur_protection || false,
                                            }));

                                            setError(''); setStep(2);
                                        }} className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 sm:py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            {t('calculator.continue', 'Continuer')} <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
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
                                            setErrorField('site_address');
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

                                {/* Apple HIG Segmented Control: Particulier / Entreprise */}
                                <div role="tablist" className="grid grid-cols-2 p-1 bg-slate-200/75 rounded-full border border-slate-200/80 shadow-inner">
                                    <button type="button" role="tab" aria-selected={formData.client_type === 'fizica'} onClick={() => setFormData({ ...formData, client_type: 'fizica' })}
                                        className={`py-2.5 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 ${formData.client_type === 'fizica' ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.10)]' : 'text-slate-600 hover:text-slate-900'}`}>
                                        {t('clients.type_physical', 'Particulier')}
                                    </button>
                                    <button type="button" role="tab" aria-selected={formData.client_type === 'juridica'} onClick={() => setFormData({ ...formData, client_type: 'juridica' })}
                                        className={`py-2.5 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 ${formData.client_type === 'juridica' ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.10)]' : 'text-slate-600 hover:text-slate-900'}`}>
                                        {t('clients.type_legal', 'Entreprise')}
                                    </button>
                                </div>

                                {/* Champs Entreprise (juridica) */}
                                {formData.client_type === 'juridica' && (
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                                                {t('clients.cui', 'Numéro de TVA')}{' '}
                                                <span className="normal-case font-normal text-slate-400">({t('common.optional', 'optionnel')})</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <input type="text" value={formData.client_company_vat}
                                                    onChange={e => {
                                                        setFormData({ ...formData, client_company_vat: e.target.value });
                                                        setViesLookupNotice('');
                                                        if (errorField === 'client_company_vat') { setErrorField(''); setError(''); }
                                                    }}
                                                    onBlur={handleViesSearch}
                                                    placeholder="BE0123456789"
                                                    className="flex-1 bg-white border-2 border-slate-200 focus:border-yellow-400 rounded-xl px-3 py-2.5 text-base focus:bg-white outline-none transition-all" />
                                                <button type="button" onClick={handleViesSearch} disabled={isSearchingVies}
                                                    className="bg-slate-800 text-white w-14 rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center">
                                                    {isSearchingVies ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {viesLookupNotice ? (
                                                <p className="text-xs text-amber-600 font-medium mt-1">{viesLookupNotice}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400 mt-1">{t('clients.vies_hint', 'Entrez le numéro pour remplir automatiquement via la BCE.')}</p>
                                            )}
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
                                        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
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
