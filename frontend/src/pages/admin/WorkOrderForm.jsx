import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
    ChevronLeft, Plus, Trash2, ClipboardList, Check,
    User, MapPin, Calendar, FileText, Loader2,
    Users, Truck, Image, X, Clock, Save, Send, Banknote, Info
} from 'lucide-react'
import api from '../../lib/api'
import MiniMapSelector from '../../components/MiniMapSelector'
import SearchableSelect from '../../components/SearchableSelect'
import AddressAutocomplete from '../../components/AddressAutocomplete'

const VOLUME_UNITS = ['m²', 'm³', 'm liniar', 'buc', 'ore', 'kg', 'tone', 'saci', 'pal', 'set']

const EMPTY_FORM = {
    title: '',
    // Client
    client_mode: 'existing',
    client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_language: 'ro',
    client_type: 'fizica',
    client_country: 'RO',
    client_contact_person: '',
    client_address: '',
    client_company_reg_number: '',
    client_company_vat: '',
    client_company_bank: '',
    client_company_iban: '',
    client_company_swift: '',
    // Locatie
    site_mode: 'existing',
    site_id: '',
    site_address: '',
    site_latitude: '',
    site_longitude: '',
    site_geofence_radius: 100,
    // Planificare
    start_date: '',
    start_time: '07:00',
    deadline_date: '',
    // Cantitati
    volumes: [{ label: '', quantity: '', unit: 'm²', thickness: '' }],
    // Materiale
    materials: [{ name: '', quantity: '', unit: '' }],
    // Echipa + vehicul
    assigned_team_id: '',
    assigned_vehicle_id: '',
    // Pret
    estimated_amount: '',
    estimated_currency: 'EUR',
    // Acces
    access_notes: '',
}

function Section({ icon: Icon, title, children, zIndex }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" style={{ zIndex, position: zIndex ? 'relative' : 'static' }}>
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
            </div>
            <div className="p-3 space-y-3">{children}</div>
        </div>
    )
}

function Field({ label, required, children }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    )
}

const INPUT = "w-full px-3 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
const SELECT = "w-full px-3 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"

export default function WorkOrderForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const isEdit = Boolean(id)
    const fileRef = useRef()

    const [form, setForm] = useState(() => {
        if (!isEdit) {
            try {
                const saved = localStorage.getItem('work_order_draft_new');
                if (saved) return JSON.parse(saved);
            } catch (e) {}
        }
        return EMPTY_FORM;
    })
    const [clients, setClients] = useState([])
    const [sites, setSites] = useState([])
    const [teams, setTeams] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [activities, setActivities] = useState([])
    const [warehouseItems, setWarehouseItems] = useState([])
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [error, setError] = useState(null)
    const [instructionPhotos, setInstructionPhotos] = useState([]) // { file, preview }
    const [currentStep, setCurrentStep] = useState(1)
    const [savedId, setSavedId] = useState(null)
    const [showBankDetails, setShowBankDetails] = useState(false)

    const set = (key, val) => setForm(p => ({ ...p, [key]: val }))


    // Auto-calculate estimated_amount based on volumes and client type
    useEffect(() => {
        let isAutoCalculated = false;
        let totalNet = 0;
        
        form.volumes.forEach(vol => {
            const surface = parseFloat(vol.quantity) || 0;
            const thickness = parseFloat(vol.thickness) || 0;
            if (vol.label?.toLowerCase()?.includes('sapa') && surface > 0) {
                isAutoCalculated = true;
                const extraThickness = Math.max(0, thickness - 5);
                const basePrice = 12.5 * surface;
                const extraPrice = extraThickness * 1.25 * surface;
                const foilPrice = vol.has_foil ? 1.2 * surface : 0;
                const meshPrice = vol.has_mesh ? 2.5 * surface : 0;
                
                // Fibers + Duramit (Mandatory)
                const fiberRate = surface <= 200 ? 2.5 : 2.0;
                const fiberPrice = surface * fiberRate;
                
                totalNet += basePrice + extraPrice + foilPrice + meshPrice + fiberPrice;
            }
        });

        if (isAutoCalculated) {
            let totalGross = totalNet;
            const client = clients.find(c => c.id === form.client_id);
            if (client?.client_type === 'fizica') {
                totalGross = totalNet * 1.21;
            }
            totalGross = Math.round(totalGross * 100) / 100;
            
            if (form.estimated_amount !== totalGross || form.is_auto_calculated !== true) {
                setForm(p => ({ ...p, estimated_amount: totalGross, is_auto_calculated: true }));
            }
        } else {
            if (form.is_auto_calculated) {
                setForm(p => ({ ...p, is_auto_calculated: false }));
            }
        }
    }, [form.volumes, form.client_id, clients, form.estimated_amount, form.is_auto_calculated]);

    useEffect(() => {
        if (!isEdit) {
            localStorage.setItem('work_order_draft_new', JSON.stringify(form));
        }
    }, [form, isEdit]);

    useEffect(() => {
        const load = async () => {
            try {
                const [cRes, sRes, tRes, vRes, aRes, wRes] = await Promise.all([
                    api.get('/admin/clients'),
                    api.get('/admin/sites/'),
                    api.get('/admin/teams/'),
                    api.get('/admin/vehicles').catch(() => ({ data: [] })),
                    api.get('/activities/?is_active=true').catch(() => ({ data: [] })),
                    api.get('/warehouse/items').catch(() => ({ data: [] }))
                ])
                setClients(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
                const sd = sRes.data
                setSites(Array.isArray(sd) ? sd : (sd?.items || sd?.sites || []))
                setTeams(tRes.data?.teams || tRes.data || [])
                setVehicles(Array.isArray(vRes.data) ? vRes.data : (vRes.data?.items || []))
                
                const acts = aRes.data?.activities || (Array.isArray(aRes.data) ? aRes.data.flatMap(c => c.activities || []) : [])
                setActivities(acts)
                
                setWarehouseItems(Array.isArray(wRes.data) ? wRes.data : (wRes.data?.items || []))

                if (!isEdit) {
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const getStr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    const paramDate = searchParams.get('date');
                    const paramTime = searchParams.get('time');
                    const initialDate = paramDate || prev.start_date || getStr(today);
                    
                    setForm(prev => {
                        const hasDraftVolumes = prev.volumes && (prev.volumes.length > 1 || prev.volumes[0].label !== '' || prev.volumes[0].quantity !== '');
                        return {
                            ...prev,
                            start_date: initialDate,
                            start_time: paramTime || prev.start_time || '07:00',
                            deadline_date: prev.deadline_date || initialDate,
                            volumes: !hasDraftVolumes && acts.length === 1 ? [{ label: acts[0].name, quantity: '', unit: 'm²', thickness: '' }] : prev.volumes
                        };
                    })

                    // Auto-detect actual location only if we don't already have one in the draft
                    if ("geolocation" in navigator && (!form.site_latitude || form.site_mode !== 'new')) {
                        navigator.geolocation.getCurrentPosition(async (pos) => {
                            const lat = pos.coords.latitude.toFixed(6)
                            const lon = pos.coords.longitude.toFixed(6)
                            setForm(p => ({ ...p, site_latitude: lat, site_longitude: lon }))
                            
                            try {
                                const res = await fetch(
                                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
                                    { headers: { 'Accept-Language': 'ro' } }
                                )
                                const data = await res.json()
                                if (data?.display_name) {
                                    const a = data.address || {}
                                    const parts = [
                                        a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
                                        a.city || a.town || a.village || a.municipality,
                                        a.county,
                                    ].filter(Boolean)
                                    const addr = parts.length > 0 ? parts.join(', ') : data.display_name
                                    setForm(p => ({ ...p, site_address: addr }))
                                }
                            } catch {}
                        }, () => {}, { enableHighAccuracy: true, timeout: 10000 })
                    }
                }
            } catch {}

            if (isEdit) {
                try {
                    const res = await api.get(`/admin/work-orders/${id}`)
                    const wo = res.data
                    setForm(prev => ({
                        ...prev,
                        title: wo.title || '',
                        access_notes: wo.access_notes || '',
                        start_date: wo.start_date || '',
                        start_time: wo.start_time || '07:00',
                        deadline_date: wo.deadline_date || '',
                        client_mode: wo.client_id ? 'existing' : 'new',
                        client_id: wo.client_id || '',
                        client_name: wo.client_name || '',
                        client_email: wo.client_email || '',
                        client_phone: wo.client_phone || '',
                        client_language: wo.client_language || 'ro',
                        site_mode: wo.site_id ? 'existing' : 'new',
                        site_id: wo.site_id || '',
                        site_address: wo.site_address || '',
                        site_latitude: wo.site_latitude || '',
                        site_longitude: wo.site_longitude || '',
                        site_geofence_radius: wo.site_geofence_radius || 100,
                        assigned_team_id: wo.assigned_team_id || '',
                        assigned_vehicle_id: wo.assigned_vehicle_id || '',
                        estimated_price: wo.estimated_price || '',
                        volumes: wo.volumes?.length ? wo.volumes : [{ label: '', quantity: '', unit: 'm²', thickness: '' }],
                        materials: wo.materials?.length ? wo.materials : [{ name: '', quantity: '', unit: '' }],
                    }))
                    
                    if (wo.estimated_price) {
                        const match = wo.estimated_price.match(/^([\d.,]+)\s*([a-zA-Z]+)?$/)
                        if (match) {
                            setForm(p => ({ ...p, estimated_amount: match[1], estimated_currency: match[2] || 'EUR' }))
                        } else {
                            setForm(p => ({ ...p, estimated_amount: wo.estimated_price, estimated_currency: 'EUR' }))
                        }
                    }

                    setSavedId(wo.id)
                    
                    // Auto-geocode if address exists but no coordinates
                    if (wo.site_address && !wo.site_latitude && !wo.site_longitude) {
                        try {
                            const geores = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(wo.site_address)}&format=json&limit=1`, { headers: { 'Accept-Language': 'ro' } })
                            const data = await geores.json()
                            if (data && data.length > 0) {
                                setForm(p => ({ ...p, site_latitude: parseFloat(data[0].lat).toFixed(6), site_longitude: parseFloat(data[0].lon).toFixed(6) }))
                            }
                        } catch {}
                    }
                } catch {}
            }
        }
        load()
    }, [id])

    const addRow = (field, empty) => setForm(p => ({ ...p, [field]: [...p[field], empty] }))
    const removeRow = (field, idx) => setForm(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }))
    const updateRow = (field, idx, key, val) => setForm(p => ({
        ...p,
        [field]: p[field].map((row, i) => i === idx ? { ...row, [key]: val } : row)
    }))

    const handleDetectGPS = () => {
        setDetecting(true)
        if (!navigator.geolocation) {
            alert('Geolocatia nu este suportata de browser.');
            setDetecting(false);
            return;
        }

        const gpsTimeout = setTimeout(() => {
            setDetecting(false);
            alert('Timpul a expirat. Verifică dacă browser-ul are permisiunea de a accesa locația (GPS) în setările telefonului.');
        }, 8000);

        navigator.geolocation.getCurrentPosition(
            async pos => {
                clearTimeout(gpsTimeout);
                const lat = pos.coords.latitude.toFixed(6)
                const lon = pos.coords.longitude.toFixed(6)
                setForm(p => ({ ...p, site_latitude: lat, site_longitude: lon }))
                // Reverse geocoding — populeaza adresa automat
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
                        { headers: { 'Accept-Language': 'ro' } }
                    )
                    const data = await res.json()
                    if (data?.display_name) {
                        const a = data.address || {}
                        const parts = [
                            a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
                            a.city || a.town || a.village || a.municipality,
                            a.county,
                        ].filter(Boolean)
                        const addr = parts.length > 0 ? parts.join(', ') : data.display_name
                        setForm(p => ({ ...p, site_address: addr }))
                    }
                } catch {}
                setDetecting(false)
            },
            (err) => {
                clearTimeout(gpsTimeout);
                setDetecting(false);
                alert('Eroare detectare GPS: ' + err.message + '\nTe rugăm să verifici dacă ai permis accesul la locație în browser/telefon.');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        )
    }

    const handlePhotoAdd = (e) => {
        const files = Array.from(e.target.files || [])
        const newPhotos = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
        setInstructionPhotos(p => [...p, ...newPhotos])
        e.target.value = ''
    }

    const removePhoto = (idx) => {
        setInstructionPhotos(p => {
            URL.revokeObjectURL(p[idx].preview)
            return p.filter((_, i) => i !== idx)
        })
    }

    const buildPayload = () => {
        let generatedTitle = form.title.trim();
        if (!generatedTitle) {
            const cName = form.client_mode === 'existing' 
                ? clients.find(c => c.id === form.client_id)?.name 
                : form.client_name;
            generatedTitle = `Comandă ${cName || 'Fără Titlu'}`;
        }
        return {
            title: generatedTitle,
        access_notes: form.access_notes,
        start_date: form.start_date || null,
        start_time: form.start_time || null,
        deadline_date: form.deadline_date || null,
        client_id: form.client_mode === 'existing' ? form.client_id || null : null,
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        client_language: form.client_language || 'ro',
        site_id: form.site_mode === 'existing' ? form.site_id || null : null,
        site_address: form.site_mode === 'new' ? form.site_address : null,
        site_latitude: form.site_mode === 'new' ? (form.site_latitude || null) : null,
        site_longitude: form.site_mode === 'new' ? (form.site_longitude || null) : null,
        site_geofence_radius: form.site_mode === 'new' ? (parseInt(form.site_geofence_radius) || 100) : null,
        assigned_team_id: form.assigned_team_id || null,
        assigned_vehicle_id: form.assigned_vehicle_id || null,
        volumes: form.volumes.filter(v => v.label),
        materials: form.materials.filter(m => m.name),
    }
}

    const uploadInstructionPhotos = async (woId) => {
        for (const p of instructionPhotos) {
            const fd = new FormData()
            fd.append('file', p.file)
            fd.append('photo_type', 'instruction')
            try { await api.post(`/admin/work-orders/${woId}/photos`, fd) } catch {}
        }
    }

    const handleSave = async (andSend = false) => {
        setError(null)
        andSend ? setSending(true) : setSaving(true)
        try {
            let woId = savedId || id
            if (woId) {
                await api.put(`/admin/work-orders/${woId}`, buildPayload())
            } else {
                const res = await api.post('/admin/work-orders', buildPayload())
                if (res.data) {
                    if (!isEdit) {
                        localStorage.removeItem('work_order_draft_new');
                    }
                    setSavedId(res.data.id)
                    woId = res.data.id
                }
            }
            if (instructionPhotos.length) await uploadInstructionPhotos(woId)
            if (andSend) await api.post(`/admin/work-orders/${woId}/send`)
            navigate('/admin/work-orders')
        } catch (e) {
            setError(e.response?.data?.detail || 'Eroare la salvare.')
        } finally {
            setSaving(false); setSending(false)
        }
    }
    const handleAcceptSand = (sandKg) => {
        setForm(p => {
            const mats = [...p.materials];
            const existingIndex = mats.findIndex(m => m.name?.toLowerCase().includes('nisip'));
            if (existingIndex >= 0) {
                mats[existingIndex] = { ...mats[existingIndex], quantity: sandKg, unit: 'kg' };
            } else {
                const last = mats[mats.length - 1];
                if (last && !last.name && !last.quantity) {
                    mats[mats.length - 1] = { name: 'Nisip', quantity: sandKg, unit: 'kg' };
                } else {
                    mats.push({ name: 'Nisip', quantity: sandKg, unit: 'kg' });
                }
            }
            return { ...p, materials: mats };
        });
    };

    
    const handleNext = () => {
        setError(null)
        if (currentStep === 1) {
            if (form.client_mode === 'new') {
                if (!form.client_name?.trim()) return setError('Introduceți numele noului client.')
            } else {
                if (!form.client_id) return setError('Selectați un client.')
            }
            if (form.site_mode === 'new') {
                if (!form.site_address?.trim()) return setError('Introduceți adresa locației noi.')
            } else {
                if (!form.site_id) return setError('Selectați o locație.')
            }
        }
        if (currentStep === 2) {
            if (!form.start_date) return setError('Alegeți data începerii.')
        }

        if (currentStep < 3) {
            setCurrentStep(s => s + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const selectedClient = clients.find(c => c.id === form.client_id)
    const selectedSite = sites.find(s => s.id === form.site_id)

    // Calculation variables for render
    let autoNet = 0;
    let autoBase = 0;
    let autoExtra = 0;
    let autoFoil = 0;
    let autoMesh = 0;
    let isAutoRender = false;
    let surfaceForAuto = 0;
    let extraThickForAuto = 0;

    form.volumes.forEach(vol => {
        const surface = parseFloat(vol.quantity) || 0;
        const thickness = parseFloat(vol.thickness) || 0;
        if (vol.label?.toLowerCase()?.includes('sapa') && surface > 0) {
            isAutoRender = true;
            surfaceForAuto += surface;
            const extraThickness = Math.max(0, thickness - 5);
            extraThickForAuto = extraThickness;
            autoBase += 12.5 * surface;
            autoExtra += extraThickness * 1.25 * surface;
            autoFoil += vol.has_foil ? 1.2 * surface : 0;
            autoMesh += vol.has_mesh ? 2.5 * surface : 0;
        }
    });

    autoNet = autoBase + autoExtra + autoFoil + autoMesh;
    let autoVat = 0;
    let totalGross = autoNet;
    const clientForRender = clients.find(c => c.id === form.client_id);
    if (isAutoRender && clientForRender?.client_type === 'fizica') {
        autoVat = autoNet * 0.21;
        totalGross = autoNet + autoVat;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/admin/work-orders')}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow shadow-blue-500/30 shrink-0">
                    <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                        {isEdit ? 'Editare Comandă' : 'Comandă Nouă'}
                    </h1>
                    <p className="text-sm text-slate-500">Completează câmpurile de mai jos</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold mb-4">
                    {error}
                </div>
            )}


            {/* Stepper UI */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: currentStep === 1 ? '15%' : currentStep === 2 ? '50%' : '100%' }}></div>
                </div>
                {[
                    { step: 1, label: 'Detalii Generale' },
                    { step: 2, label: 'Planificare & Resurse' },
                    { step: 3, label: 'Financiar & Acces' }
                ].map(s => (
                    <div key={s.step} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                            currentStep >= s.step 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700'
                        }`}>
                            {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                        </div>
                        <span className={`text-xs font-bold hidden sm:block ${currentStep >= s.step ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="max-w-3xl mx-auto space-y-6">

                {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Section icon={FileText} title="Detalii, Client și Locație" zIndex={80}>
                        {/* 2. Client */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <User className="w-4 h-4 text-blue-500" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Client</h3>
                            </div>
                            <div className="flex gap-2 mb-4">
                                {[['existing', 'Client Existent'], ['new', 'Client Nou']].map(([m, label]) => (
                                    <button key={m} onClick={() => set('client_mode', m)}
                                        className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.client_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {form.client_mode === 'existing' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                        <div className="md:col-span-2">
                                            <Field label="Selecteaza Client">
                                                <select value={form.client_id} onChange={e => {
                                                    const cl = clients.find(c => c.id === e.target.value)
                                                    setForm(p => ({
                                                        ...p,
                                                        client_id: e.target.value,
                                                        client_name: cl?.name || '',
                                                        client_email: cl?.email || '',
                                                        client_phone: cl?.phone || '',
                                                        client_language: cl?.preferred_language || 'ro',
                                                    }))
                                                }} className={SELECT}>
                                                    <option value="">— Alege client —</option>
                                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </Field>
                                        </div>
                                        <div className="md:col-span-1">
                                            <Field label="Limba">
                                                <select 
                                                    value={form.client_language} 
                                                    onChange={e => set('client_language', e.target.value)}
                                                    className={SELECT}
                                                >
                                                    <option value="ro">🇷🇴 Română</option>
                                                    <option value="en">🇬🇧 Engleză</option>
                                                    <option value="fr">🇫🇷 Franceză</option>
                                                    <option value="de">🇩🇪 Germană</option>
                                                    <option value="nl">🇳🇱 Olandeză</option>
                                                    <option value="ru">🇷🇺 Rusă</option>
                                                </select>
                                            </Field>
                                        </div>
                                    </div>
                                    {selectedClient && (
                                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                                            {selectedClient.phone && <p>{selectedClient.phone}</p>}
                                            {selectedClient.email && <p>{selectedClient.email}</p>}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        <button type="button" onClick={() => set('client_type', 'juridica')}
                                            className={`flex-1 px-4 h-8 rounded-md text-xs font-bold transition-all ${form.client_type === 'juridica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            Persoană Juridică
                                        </button>
                                        <button type="button" onClick={() => set('client_type', 'fizica')}
                                            className={`flex-1 px-4 h-8 rounded-md text-xs font-bold transition-all ${form.client_type === 'fizica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            Persoană Fizică
                                        </button>
                                    </div>

                                    {form.client_type === 'juridica' ? (
                                        <>
                                            <Field label="Nume Companie *" required>
                                                <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={INPUT} />
                                            </Field>
                                            <Field label="Țară">
                                                <select value={form.client_country} onChange={e => set('client_country', e.target.value)} className={INPUT}>
                                                    <option value="RO">România</option>
                                                    <option value="FR">Franța</option>
                                                    <option value="BE">Belgia</option>
                                                    <option value="NL">Olanda</option>
                                                    <option value="DE">Germania</option>
                                                    <option value="IT">Italia</option>
                                                    <option value="ES">Spania</option>
                                                    <option value="GB">Marea Britanie</option>
                                                </select>
                                            </Field>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label={form.client_country === 'RO' ? 'CUI' : 'VAT Number (TVA)'}>
                                                    <input type="text" value={form.client_company_vat} onChange={e => set('client_company_vat', e.target.value)} className={INPUT} />
                                                </Field>
                                                <Field label={form.client_country === 'RO' ? 'Nr. Reg. Comerțului' : 'Registration Number'}>
                                                    <input type="text" value={form.client_company_reg_number} onChange={e => set('client_company_reg_number', e.target.value)} className={INPUT} />
                                                </Field>
                                            </div>
                                            <div>
                                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                                    <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Adaugă detalii bancare (Bancă, IBAN, SWIFT)</span>
                                                </label>
                                                {showBankDetails && (
                                                    <div className="space-y-4">
                                                        <Field label="Nume Bancă"><input type="text" value={form.client_company_bank} onChange={e => set('client_company_bank', e.target.value)} className={INPUT} /></Field>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Field label="IBAN"><input type="text" value={form.client_company_iban} onChange={e => set('client_company_iban', e.target.value)} className={INPUT} /></Field>
                                                            <Field label="SWIFT"><input type="text" value={form.client_company_swift} onChange={e => set('client_company_swift', e.target.value)} className={INPUT} /></Field>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <Field label="Nume și Prenume *" required>
                                            <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={INPUT} placeholder="Popescu Ion" />
                                        </Field>
                                    )}

                                    {form.client_type === 'juridica' && (
                                        <Field label="Persoană de Contact">
                                            <input type="text" value={form.client_contact_person} onChange={e => set('client_contact_person', e.target.value)} className={INPUT} />
                                        </Field>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Field label="Telefon"><input type="text" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className={INPUT} /></Field>
                                        <Field label="Email"><input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className={INPUT} /></Field>
                                        <Field label="Limba">
                                            <select value={form.client_language} onChange={e => set('client_language', e.target.value)} className={SELECT}>
                                                <option value="ro">🇷🇴 Română</option>
                                                <option value="en">🇬🇧 Engleză</option>
                                                <option value="fr">🇫🇷 Franceză</option>
                                                <option value="de">🇩🇪 Germană</option>
                                                <option value="nl">🇳🇱 Olandeză</option>
                                                <option value="ru">🇷🇺 Rusă</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <Field label="Adresă"><input type="text" value={form.client_address} onChange={e => set('client_address', e.target.value)} className={INPUT} /></Field>
                                </div>
                            )}
                        </div>

                        <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>

                        {/* 3. Locatie + GPS */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Locație Lucrare</h3>
                            </div>
                            <div className="flex gap-2 mb-4">
                                {[['existing', 'Santier Existent'], ['new', 'Adresa Manuala']].map(([m, label]) => (
                                    <button key={m} onClick={() => set('site_mode', m)}
                                        className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.site_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {form.site_mode === 'existing' ? (
                                <>
                                    <Field label="Selecteaza Santier">
                                        <select value={form.site_id} onChange={e => {
                                            const s = sites.find(x => x.id === e.target.value)
                                            setForm(p => ({
                                                ...p,
                                                site_id: e.target.value,
                                                site_address: s?.address || '',
                                                site_latitude: s?.latitude || '',
                                                site_longitude: s?.longitude || '',
                                            }))
                                        }} className={SELECT}>
                                            <option value="">— Alege santier —</option>
                                            {sites.map(s => <option key={s.id} value={s.id}>{s.name} {s.address ? `— ${s.address}` : ''}</option>)}
                                        </select>
                                    </Field>
                                    {selectedSite && (
                                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                                            {selectedSite.address}
                                            {selectedSite.latitude && (
                                                <p className="text-xs text-slate-400 mt-0.5">GPS: {selectedSite.latitude}, {selectedSite.longitude}</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <Field label="Adresa Lucrarii" required>
                                        <AddressAutocomplete 
                                            value={form.site_address}
                                            onChange={(addr, lat, lon) => {
                                                setForm(p => ({
                                                    ...p,
                                                    site_address: addr,
                                                    ...(lat && lon ? { site_latitude: lat, site_longitude: lon } : {})
                                                }))
                                            }}
                                            placeholder="Str. ..., Nr. ..., Oras, Judet"
                                            className={INPUT} 
                                        />
                                    </Field>

                                    {/* GPS */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Coordonate GPS</span>
                                            <button
                                                type="button"
                                                onClick={handleDetectGPS}
                                                disabled={detecting}
                                                className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800 disabled:opacity-60"
                                            >
                                                {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                                Detecteaza automat
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 ml-1">Latitudine</label>
                                                <input type="number" step="any" value={form.site_latitude}
                                                    onChange={e => set('site_latitude', e.target.value)}
                                                    placeholder="44.4268"
                                                    className={INPUT} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 ml-1">Longitudine</label>
                                                <input type="number" step="any" value={form.site_longitude}
                                                    onChange={e => set('site_longitude', e.target.value)}
                                                    placeholder="26.1025"
                                                    className={INPUT} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 ml-1">Raza Geo (m)</label>
                                                <input type="number" value={form.site_geofence_radius}
                                                    onChange={e => set('site_geofence_radius', e.target.value)}
                                                    placeholder="100"
                                                    min="10" max="5000"
                                                    className={INPUT} />
                                            </div>
                                        </div>
                                        <MiniMapSelector
                                            latitude={form.site_latitude}
                                            longitude={form.site_longitude}
                                            onLocationChange={async (lat, lon) => {
                                                setForm(p => ({ ...p, site_latitude: lat, site_longitude: lon }))
                                                try {
                                                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, { headers: { 'Accept-Language': 'ro' } })
                                                    const data = await res.json()
                                                    if (data?.display_name) {
                                                        const a = data.address || {}
                                                        const parts = [a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road, a.city || a.town || a.village || a.municipality, a.county].filter(Boolean)
                                                        const addr = parts.length > 0 ? parts.join(', ') : data.display_name
                                                        setForm(p => ({ ...p, site_address: addr }))
                                                    }
                                                } catch {}
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                </div>
            )}
            
            {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 4. Planificare + Pret */}
            <Section icon={Calendar} title="Planificare și Ofertare" zIndex={50}>
                <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                    <Field label="Data Incepere" required>
                        <input type="date" value={form.start_date}
                            onChange={e => set('start_date', e.target.value)}
                            className={INPUT} />
                    </Field>
                    <Field label="Ora Start">
                        <input type="time" value={form.start_time}
                            onChange={e => set('start_time', e.target.value)}
                            className={INPUT} />
                    </Field>
                    <Field label="Termen Limita">
                        <input type="date" value={form.deadline_date}
                            onChange={e => set('deadline_date', e.target.value)}
                            className={INPUT} />
                    </Field>
                </div>
            </Section>

            {/* 6. Echipa + Vehicul */}
            <Section icon={Users} title="Echipa si Vehicul" zIndex={40}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <Field label="Șef de Echipă / Responsabil">
                        <SearchableSelect
                            value={form.assigned_team_id}
                            onChange={teamId => {
                                set('assigned_team_id', teamId);
                                if (teamId) {
                                    const selectedTeam = teams.find(t => t.id === teamId);
                                    if (selectedTeam && selectedTeam.team_leader_id) {
                                        const autoVehicle = vehicles.find(v => v.user_ids?.includes(selectedTeam.team_leader_id));
                                        if (autoVehicle) {
                                            set('assigned_vehicle_id', autoVehicle.id);
                                        }
                                    }
                                } else {
                                    set('assigned_vehicle_id', '');
                                }
                            }}
                            options={teams.map(t => ({
                                value: t.id,
                                label: t.team_leader_name && t.team_leader_name !== 'N/A' ? t.team_leader_name : t.name,
                                subLabel: t.team_leader_name && t.team_leader_name !== 'N/A' && t.name !== t.team_leader_name ? `Echipa: ${t.name}` : undefined
                            }))}
                            placeholder="— Fără alocare —"
                        />
                    </Field>
                    <Field label="Vehicul / Camion">
                        <SearchableSelect
                            value={form.assigned_vehicle_id}
                            onChange={val => set('assigned_vehicle_id', val)}
                            options={vehicles.map(v => ({
                                value: v.id,
                                label: `${v.plate_number || 'Fără nr.'} ${v.brand ? `— ${v.brand}` : ''}`,
                                subLabel: v.name
                            }))}
                            placeholder="— Fără vehicul —"
                        />
                    </Field>
                </div>
            </Section>

            {/* 5. Volume + Materiale */}
            <Section icon={FileText} title="Cantitati Estimate" zIndex={30}>
                {/* Volumes */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Lucrari / Volume</span>
                        <button onClick={() => addRow('volumes', { label: '', quantity: '', unit: 'm²' })}
                            className="flex items-center gap-1 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                            <Plus className="w-3 h-3" /> Adauga
                        </button>
                    </div>
                    {form.volumes.map((vol, i) => {
                        const surface = parseFloat(vol.quantity) || 0;
                        const thickness = parseFloat(vol.thickness) || 0;
                        const sandKg = surface * thickness * 16;
                        
                        return (
                        <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                                <SearchableSelect 
                                    value={vol.label} 
                                    onChange={val => updateRow('volumes', i, 'label', val)}
                                    options={activities.map(act => ({ value: act.name, label: act.name }))}
                                    placeholder="Alege activitatea..."
                                    className="flex-1 min-w-[150px]"
                                />
                                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                                    <div className="flex gap-2 flex-1 sm:flex-none">
                                        <input value={vol.quantity} onChange={e => updateRow('volumes', i, 'quantity', e.target.value)}
                                            placeholder="Cant." type="number" min="0"
                                            className="w-full sm:w-20 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                        <select value={vol.unit} onChange={e => updateRow('volumes', i, 'unit', e.target.value)}
                                            className="w-20 px-2 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm shrink-0">
                                            {VOLUME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <input value={vol.thickness} onChange={e => updateRow('volumes', i, 'thickness', e.target.value)}
                                            placeholder="Grosime (cm)" type="number" step="any" min="0"
                                            className="flex-1 sm:w-32 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                        
                                        {form.volumes.length > 1 && (
                                            <button onClick={() => removeRow('volumes', i)}
                                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {vol.label?.toLowerCase()?.includes('sapa') && (
                                <div className="flex flex-wrap gap-4 mt-2 px-1">
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!vol.has_foil}
                                            onChange={e => updateRow('volumes', i, 'has_foil', e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        Include Folie plastic (1,2 EUR/m²)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!vol.has_mesh}
                                            onChange={e => updateRow('volumes', i, 'has_mesh', e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        Include Plasă metalică (2,50 EUR/m²)
                                    </label>
                                </div>
                            )}

                            {sandKg > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mt-1 sm:ml-auto w-full sm:w-auto">
                                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 py-1.5 px-3 rounded-lg">
                                        Necesar estimativ nisip: {sandKg.toLocaleString('ro-RO')} kg ({(sandKg / 1000).toLocaleString('ro-RO')} tone)
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleAcceptSand(sandKg)}
                                        className="flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Adaugă la Materiale
                                    </button>
                                </div>
                            )}
                        </div>
                    )})}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Materiale Necesare</span>
                        <button onClick={() => addRow('materials', { name: '', quantity: '', unit: '' })}
                            className="flex items-center gap-1 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                            <Plus className="w-3 h-3" /> Adauga
                        </button>
                    </div>
                    {form.materials.map((mat, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <SearchableSelect 
                                value={mat.name} 
                                onChange={val => {
                                    updateRow('materials', i, 'name', val)
                                    const selectedItem = warehouseItems.find(item => item.name === val)
                                    if (selectedItem?.unit) {
                                        updateRow('materials', i, 'unit', selectedItem.unit)
                                    }
                                }}
                                options={warehouseItems.map(item => ({ value: item.name, label: item.name }))}
                                placeholder="Alege materialul..."
                                className="flex-1"
                            />
                            <input type="number" min="0" placeholder="Cant." value={mat.quantity} onChange={e => updateRow('materials', i, 'quantity', e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-20 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            <input type="text" placeholder="Unit. (kg, m)" value={mat.unit} onChange={e => updateRow('materials', i, 'unit', e.target.value)}
                                className="w-16 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            {form.materials.length > 1 && (
                                <button onClick={() => removeRow('materials', i)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </Section>
                </div>
            )}
            
            {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <Section icon={Image} title="Instructiuni Acces (vizibile echipei)" zIndex={10}>
                <Field label="Note Acces">
                    <textarea
                        value={form.access_notes}
                        onChange={e => set('access_notes', e.target.value)}
                        placeholder="Cod intrare: 1234&#10;Etaj 3, apartament stanga&#10;Suna la interfon la Ionescu"
                        rows={4}
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                    />
                </Field>

                {/* Poze instructiuni */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Poze Instructiuni ({instructionPhotos.length})
                        </span>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Adauga Poza
                        </button>
                                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
                            </div>
                            {instructionPhotos.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {instructionPhotos.map((p, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                            <img src={p.preview} alt="" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removePhoto(i)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-slate-400">Aceste poze sunt vizibile doar pentru echipa, nu apar la client.</p>
                        </div>
                    </Section>


            {/* 7. Preț Estimativ (Proformă) */}
            <Section icon={Banknote} title="Preț Estimativ (Proformă)" zIndex={10}>
                <div className="flex flex-col gap-4">
                    <Field label="Valoare estimată">
                        <div className="flex w-full sm:w-1/2 shadow-sm rounded-xl">
                            <input type="number" min="0"
                                value={form.estimated_amount || ''}
                                onChange={e => {
                                    set('estimated_amount', e.target.value)
                                    set('estimated_price', e.target.value ? `${e.target.value} ${form.estimated_currency || 'EUR'}` : '')
                                }}
                                placeholder="ex: 1500"
                                disabled={form.is_auto_calculated}
                                className={`w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-l-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${form.is_auto_calculated ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400'}`}
                            />
                            <select
                                value={form.estimated_currency || 'EUR'}
                                onChange={e => {
                                    set('estimated_currency', e.target.value)
                                    if (form.estimated_amount) {
                                        set('estimated_price', `${form.estimated_amount} ${e.target.value}`)
                                    }
                                }}
                                className="w-24 px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="EUR">EUR</option>
                                <option value="RON">RON</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            Apare pe proforma trimisă clientului
                        </p>
                    </Field>
                    
                    {isAutoRender && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 w-full mt-2">
                            <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Calcul Cost (Vizibil doar Admin)</p>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span className="font-medium">Șapă de bază (≤5cm)</span>
                                    <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × 12.50 = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoBase.toFixed(2)} EUR</b></span>
                                </div>
                                {autoExtra > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">Grosime extra ({extraThickForAuto} cm)</span>
                                        <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × {(extraThickForAuto * 1.25).toFixed(2)} = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoExtra.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                {autoFoil > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">Folie plastic</span>
                                        <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × 1.20 = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoFoil.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                {autoMesh > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">Plasă metalică</span>
                                        <span className="text-right whitespace-nowrap">{surfaceForAuto} m² × 2.50 = <b className="text-slate-800 dark:text-slate-200 ml-1">{autoMesh.toFixed(2)} EUR</b></span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                                    <span>Total Net:</span>
                                    <span>{autoNet.toFixed(2)} EUR</span>
                                </div>
                                {clientForRender?.client_type === 'fizica' ? (
                                    <div className="flex justify-between items-center font-bold text-amber-600 dark:text-amber-500 mt-1.5">
                                        <span>TVA (21% Persoană Fizică):</span>
                                        <span>{autoVat.toFixed(2)} EUR</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center text-slate-500 text-xs mt-1.5">
                                        <span>TVA: 0% (Persoană Juridică)</span>
                                        <span>0.00 EUR</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>
                                <div className="flex justify-between items-center text-base font-black text-blue-600 dark:text-blue-400">
                                    <span>TOTAL DE PLATĂ:</span>
                                    <span>{totalGross.toFixed(2)} EUR</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Section>

                    </div>
                )}
            </div>

            {/* Actions Bottom */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => {
                        if (currentStep > 1) {
                            setCurrentStep(s => s - 1)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        } else {
                            navigate(-1)
                        }
                    }}
                    className="px-6 h-11 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    {currentStep > 1 ? 'Înapoi' : 'Anulează'}
                </button>
                
                <div className="flex gap-3">
                    {currentStep < 3 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center justify-center gap-2 px-8 h-11 rounded-full border border-transparent bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                        >
                            Următorul
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 px-8 h-11 rounded-full border border-transparent bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvează și Finalizează
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
