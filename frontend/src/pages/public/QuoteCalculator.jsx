import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowRight, 
    ArrowLeft, 
    Home, 
    Hammer, 
    CheckCircle2, 
    ShieldCheck, 
    Lock, 
    Mail, 
    User, 
    Phone,
    Layers,
    Grid3x3,
    Globe
} from 'lucide-react';

// --- TRANSLATIONS (FR, NL, EN) ---
const T = {
  fr: {
    backToSite: "Retour",
    step: "Étape",
    of: "sur",
    projectDetails: "Détails du Projet",
    projectDetailsSub: "Dites-nous quelques éléments pour calculer les matériaux.",
    workType: "Type de Travail",
    newBuild: "Nouvelle Construction",
    renovation: "Rénovation",
    totalArea: "Surface Totale (m²)",
    thickness: "Épaisseur de la Chape (cm)",
    extrasTitle: "Options Supplémentaires",
    extrasSub: "Ajoutez les options pour renforcer la chape et isoler l'espace.",
    mesh: "Armature en Treillis",
    meshSub: "Pour une durabilité accrue",
    foil: "Feuille de Séparation",
    foilSub: "Couche protectrice",
    secureData: "Données Sécurisées",
    lastStep: "Dernière étape !",
    lastStepSub: "Entrez vos coordonnées ci-dessous pour débloquer l'estimation.",
    fullName: "Nom Complet",
    phone: "Téléphone",
    email: "Email",
    generating: "Calcul en cours...",
    analyzing: "Analyse des données...",
    estimateReady: "Votre estimation est prête !",
    accordingToData: "Selon les données",
    withMesh: "Avec Treillis",
    withFoil: "Avec Feuille",
    estimatedCostIs: "le coût estimé est :",
    estimatedCost: "Coût Estimé",
    vatNotIncluded: "* Prix HTVA.",
    whatNext: "Et ensuite ?",
    whatNextSub: "Ceci n'est qu'une estimation. Un spécialiste vous contactera pour planifier une visite gratuite.",
    backHome: "Retour à l'Accueil",
    back: "Retour",
    continue: "Continuer",
    generate: "Générer",
    secureFooter: "Données sécurisées.",
    fibers: "Fibres + Duramint",
    fibersSub: "Pour une résistance maximale",
    withFibers: "Avec Fibres",
    included: "Inclus"
  },
  nl: {
    backToSite: "Terug",
    step: "Stap",
    of: "van",
    projectDetails: "Projectdetails",
    projectDetailsSub: "Vertel ons een paar basiszaken om de materialen te berekenen.",
    workType: "Type Werk",
    newBuild: "Nieuwbouw",
    renovation: "Renovatie",
    totalArea: "Oppervlakte (m²)",
    thickness: "Dikte Dekvloer (cm)",
    extrasTitle: "Extra Opties",
    extrasSub: "Voeg de nodige opties toe om de dekvloer te versterken.",
    mesh: "Wapeningsnet",
    meshSub: "Voor verhoogde duurzaamheid",
    foil: "Scheidingsfolie",
    foilSub: "Beschermlaag",
    secureData: "Veilige Gegevens",
    lastStep: "Laatste stap!",
    lastStepSub: "Vul uw gegevens in om uw schatting direct te ontgrendelen.",
    fullName: "Volledige Naam",
    phone: "Telefoonnummer",
    email: "E-mailadres",
    generating: "Berekenen...",
    analyzing: "Gegevens analyseren...",
    estimateReady: "Uw schatting is klaar!",
    accordingToData: "Volgens de gegevens",
    withMesh: "Met Wapeningsnet",
    withFoil: "Met Folie",
    estimatedCostIs: "is de geschatte kostprijs:",
    estimatedCost: "Geschatte Kosten",
    vatNotIncluded: "* Prijs excl. BTW.",
    whatNext: "Wat nu?",
    whatNextSub: "Dit is een schatting. Een specialist zal contact opnemen voor een gratis bezoek.",
    backHome: "Terug naar Home",
    back: "Terug",
    continue: "Doorgaan",
    generate: "Genereer",
    secureFooter: "Gegevens zijn veilig.",
    fibers: "Vezels + Duramint",
    fibersSub: "Voor maximale weerstand",
    withFibers: "Met Vezels",
    included: "Inbegrepen"
  },
  en: {
    backToSite: "Back",
    step: "Step",
    of: "of",
    projectDetails: "Project Details",
    projectDetailsSub: "Tell us a few basic things to calculate the materials.",
    workType: "Type of Work",
    newBuild: "New Build",
    renovation: "Renovation",
    totalArea: "Total Area (m²)",
    thickness: "Screed Thickness (cm)",
    extrasTitle: "Additional Options",
    extrasSub: "Add necessary options to strengthen the screed and insulate the space.",
    mesh: "Mesh Reinforcement",
    meshSub: "For increased durability",
    foil: "Separation Foil",
    foilSub: "Protective layer",
    secureData: "Secure Data",
    lastStep: "Last step!",
    lastStepSub: "Enter your details below to unlock your estimate instantly.",
    fullName: "Full Name",
    phone: "Phone",
    email: "Email",
    generating: "Calculating...",
    analyzing: "Analyzing data...",
    estimateReady: "Your estimate is ready!",
    accordingToData: "According to the data",
    withMesh: "With Mesh",
    withFoil: "With Foil",
    estimatedCostIs: "the estimated cost is:",
    estimatedCost: "Estimated Cost",
    vatNotIncluded: "* Price excl. VAT.",
    whatNext: "What's next?",
    whatNextSub: "This is just an estimate. A specialist will contact you to schedule a free visit.",
    backHome: "Return Home",
    back: "Back",
    continue: "Continue",
    generate: "Generate",
    secureFooter: "Data is completely secure.",
    fibers: "Fibers + Duramint",
    fibersSub: "For maximum resistance",
    withFibers: "With Fibers",
    included: "Included"
  }
};

// --- CONFIGURAȚIA OFICIALĂ DE PREȚURI ---
const PRICING = {
    baseScreed: 12.5, // per m2 pentru primii 5cm
    baseThickness: 5, // cm incluși în prețul de bază
    extraThicknessPrice: 1.25, // preț per cm suplimentar per m2
    foil: 1.2, // per m2
    mesh: 2.5, // per m2
    margin: 0.05 // 5% marjă pentru intervalul estimativ superior
};

export default function QuoteCalculator() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [lang, setLang] = useState('fr'); // Default language is French
    const t = T[lang];
    
    // Form State
    const [formData, setFormData] = useState({
        workType: 'new', // 'new' | 'renovation'
        area: '',
        thickness: '',
        hasFoil: false,
        hasMesh: false,
        hasFibers: false,
        name: '',
        phone: '',
        email: ''
    });

    // Validation state for current step
    const [isValid, setIsValid] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [estimatedPrice, setEstimatedPrice] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (step === 1) {
            setIsValid(!!formData.workType && Number(formData.area) > 0 && Number(formData.thickness) > 0);
        } else if (step === 2) {
            setIsValid(true);
        } else if (step === 3) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(formData.email);
            setIsValid(formData.name.trim().length > 2 && formData.phone.trim().length > 5 && isEmailValid);
        }
    }, [formData, step]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const calculatePrice = () => {
        const { area, thickness, hasFoil, hasMesh } = formData;
        const sqMeters = Number(area);
        const cmThickness = Number(thickness);
        
        let total = 0;
        
        // 1. Preț bază șapă (pentru primii 5cm)
        total += sqMeters * PRICING.baseScreed;

        // 2. Extra Grosime
        if (cmThickness > PRICING.baseThickness) {
            const extraCm = cmThickness - PRICING.baseThickness;
            total += sqMeters * (extraCm * PRICING.extraThicknessPrice);
        }

        // 3. Folie
        if (hasFoil) {
            total += sqMeters * PRICING.foil;
        }

        // 4. Plasă (Armare)
        if (hasMesh) {
            total += sqMeters * PRICING.mesh;
        }

        // 5. Fibers + Duramint (OBLIGATORIU)
        const fiberRate = sqMeters <= 200 ? 2.5 : 2.0;
        total += sqMeters * fiberRate;

        const minPrice = Math.round(total);
        const maxPrice = Math.round(total * (1 + PRICING.margin));

        setEstimatedPrice({ min: minPrice, max: maxPrice });
    };

    const handleNext = () => {
        if (step === 3) {
            setIsCalculating(true);
            setTimeout(() => {
                calculatePrice();
                setIsCalculating(false);
                setStep(4);
            }, 1200);
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(1, prev - 1));
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
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
                        <button onClick={() => setLang('fr')} className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded transition-all ${lang === 'fr' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <span className="text-xs sm:text-sm">🇫🇷</span> FR
                        </button>
                        <button onClick={() => setLang('nl')} className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded transition-all ${lang === 'nl' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <span className="text-xs sm:text-sm">🇳🇱</span> NL
                        </button>
                        <button onClick={() => setLang('en')} className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded transition-all ${lang === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <span className="text-xs sm:text-sm">🇬🇧</span> EN
                        </button>
                    </div>

                    <button 
                        onClick={() => navigate('/')} 
                        className="text-[11px] sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        {t.backToSite}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 relative z-10 w-full">
                
                {/* Progress Bar */}
                {step < 4 && (
                    <div className="w-full max-w-xl mb-4 sm:mb-6 mt-1">
                        <div className="flex justify-between mb-1.5 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <span>{t.step} {step} {t.of} 3</span>
                            <span>{Math.round((step / 3) * 100)}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-yellow-400 transition-all duration-500 ease-out"
                                style={{ width: `${(step / 3) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Wizard Container */}
                <div className="w-full max-w-xl bg-white border border-slate-100 p-5 sm:p-8 rounded-2xl shadow-lg relative mx-auto">
                    
                    {/* STEP 1: Core Details */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-slate-900 tracking-tight leading-tight">
                                {t.projectDetails}
                            </h1>
                            <p className="text-slate-500 mb-5 text-sm sm:text-base">
                                {t.projectDetailsSub}
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-wider">
                                        {t.workType}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        <button
                                            onClick={() => handleChange('workType', 'new')}
                                            className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 sm:gap-2 ${
                                                formData.workType === 'new' 
                                                ? 'border-yellow-400 bg-yellow-50 text-slate-900 shadow-sm' 
                                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                                            }`}
                                        >
                                            <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.workType === 'new' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                            <span className="font-bold text-[13px] sm:text-sm text-center leading-tight">{t.newBuild}</span>
                                        </button>
                                        <button
                                            onClick={() => handleChange('workType', 'renovation')}
                                            className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 sm:gap-2 ${
                                                formData.workType === 'renovation' 
                                                ? 'border-yellow-400 bg-yellow-50 text-slate-900 shadow-sm' 
                                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-yellow-200 hover:bg-yellow-50/50'
                                            }`}
                                        >
                                            <Hammer className={`w-5 h-5 sm:w-6 sm:h-6 ${formData.workType === 'renovation' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                            <span className="font-bold text-[13px] sm:text-sm text-center leading-tight">{t.renovation}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            {t.totalArea}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.area}
                                            onChange={(e) => handleChange('area', e.target.value)}
                                            placeholder="Ex: 120"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:py-3 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all shadow-inner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            {t.thickness}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.thickness}
                                            onChange={(e) => handleChange('thickness', e.target.value)}
                                            placeholder="Ex: 6"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:py-3 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Extras */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-slate-900 tracking-tight leading-tight">
                                {t.extrasTitle}
                            </h1>
                            <p className="text-slate-500 mb-5 text-sm sm:text-base">
                                {t.extrasSub}
                            </p>

                            <div className="space-y-3 sm:space-y-4">
                                {/* Armare Plasă */}
                                <div>
                                    <label className="flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 cursor-pointer hover:border-yellow-200 transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 sm:p-2.5 rounded-lg ${formData.hasMesh ? 'bg-yellow-100 text-yellow-600' : 'bg-white shadow-sm text-slate-400'}`}>
                                                <Grid3x3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{t.mesh}</div>
                                                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight">{t.meshSub}</div>
                                            </div>
                                        </div>
                                        <div className={`w-11 sm:w-12 h-6 sm:h-7 rounded-full transition-colors flex items-center px-1 shrink-0 ${formData.hasMesh ? 'bg-yellow-400' : 'bg-slate-200'}`}>
                                            <div className={`w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full transition-transform shadow-sm ${formData.hasMesh ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={formData.hasMesh} 
                                            onChange={(e) => handleChange('hasMesh', e.target.checked)} 
                                        />
                                    </label>
                                </div>

                                {/* Folie */}
                                <div>
                                    <label className="flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 cursor-pointer hover:border-yellow-200 transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 sm:p-2.5 rounded-lg ${formData.hasFoil ? 'bg-yellow-100 text-yellow-600' : 'bg-white shadow-sm text-slate-400'}`}>
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{t.foil}</div>
                                                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight">{t.foilSub}</div>
                                            </div>
                                        </div>
                                        <div className={`w-11 sm:w-12 h-6 sm:h-7 rounded-full transition-colors flex items-center px-1 shrink-0 ${formData.hasFoil ? 'bg-yellow-400' : 'bg-slate-200'}`}>
                                            <div className={`w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full transition-transform shadow-sm ${formData.hasFoil ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={formData.hasFoil} 
                                            onChange={(e) => handleChange('hasFoil', e.target.checked)} 
                                        />
                                    </label>
                                </div>

                                {/* Fibers + Duramint (Mandatory) */}
                                <div>
                                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 opacity-90 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
                                                <Hammer className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{t.fibers}</div>
                                                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight">{t.fibersSub}</div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 bg-emerald-100 text-emerald-700 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-md shrink-0">
                                            {t.included}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Lead Capture */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-5 sm:mb-6">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-700 text-[11px] sm:text-xs font-bold mb-3">
                                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t.secureData}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-slate-900 tracking-tight leading-tight">
                                    {t.lastStep}
                                </h1>
                                <p className="text-slate-500 text-sm sm:text-base leading-snug">
                                    {t.lastStepSub}
                                </p>
                            </div>

                            <div className="space-y-3.5 sm:space-y-4">
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5">{t.fullName}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all font-medium shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5">{t.phone}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            placeholder="04XX XXX XXX"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all font-medium shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5">{t.email}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            placeholder="email@example.com"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-yellow-400 transition-all font-medium shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {isCalculating && (
                                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-[3px] border-slate-100 border-t-yellow-400 rounded-full animate-spin mb-3"></div>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">{t.generating}</h3>
                                    <p className="text-sm text-slate-500">{t.analyzing}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: RESULT */}
                    {step === 4 && (
                        <div className="animate-in zoom-in-95 duration-300 text-center py-4 sm:py-6">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-slate-900 tracking-tight leading-tight">
                                {t.estimateReady}
                            </h1>
                            <p className="text-slate-600 mb-6 text-sm sm:text-base leading-snug max-w-md mx-auto">
                                {t.accordingToData} ({formData.area}m² / {formData.thickness}cm{formData.hasMesh ? ` / ${t.withMesh}` : ''}{formData.hasFoil ? ` / ${t.withFoil}` : ''} / {t.withFibers}), {t.estimatedCostIs}
                            </p>

                            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 sm:p-6 mb-6 inline-block w-full max-w-xs relative overflow-hidden group shadow-sm">
                                <div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1.5">{t.estimatedCost}</div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                                    {estimatedPrice.min.toLocaleString()}€ <span className="text-slate-400 font-medium mx-1">-</span> {estimatedPrice.max.toLocaleString()}€
                                </div>
                                <div className="text-slate-400 text-[10px] sm:text-xs mt-2.5 font-medium">{t.vatNotIncluded}</div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left mb-6 flex gap-3.5 items-start sm:items-center">
                                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600 shrink-0 mt-0.5 sm:mt-0" />
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5 leading-tight">{t.whatNext}</h4>
                                    <p className="text-slate-600 text-[11px] sm:text-sm leading-snug">
                                        {t.whatNextSub}
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    setStep(1);
                                    setFormData(p => ({...p, area: '', thickness: '', name: '', phone: '', email: ''}));
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 sm:py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                            >
                                {t.backHome}
                            </button>
                        </div>
                    )}

                    {/* Navigation Buttons (Steps 1-3) */}
                    {step < 4 && (
                        <div className="mt-6 sm:mt-8 flex items-center justify-between border-t border-slate-100 pt-5 sm:pt-6">
                            <button
                                onClick={handleBack}
                                disabled={step === 1 || isCalculating}
                                className={`flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold transition-all text-sm sm:text-base ${
                                    step === 1 
                                    ? 'opacity-0 pointer-events-none' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                {t.back}
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={!isValid || isCalculating}
                                className={`flex items-center gap-1.5 px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl font-bold transition-all text-sm sm:text-base ${
                                    !isValid 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                            >
                                {step === 3 ? t.generate : t.continue}
                                {step < 3 && <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                        </div>
                    )}

                </div>

                {/* Secure Trust Badge */}
                {step < 4 && (
                    <div className="mt-5 sm:mt-6 flex items-center justify-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t.secureFooter}
                    </div>
                )}
            </main>
        </div>
    );
}
