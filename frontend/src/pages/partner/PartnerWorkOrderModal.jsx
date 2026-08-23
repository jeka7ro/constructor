import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import partnerApi from '../../lib/partnerApi'
import {
    X, MapPin, Layers, Plus, Trash2, Loader2, Calendar, Wrench, Sparkles,
    Paperclip, FileText, Image as ImageIcon
} from 'lucide-react'
import AddressAutocomplete from '../../components/AddressAutocomplete'

const T = {
    fr: {
        new_title: 'Nouvelle commande',
        edit_title: 'Modifier la commande',
        address: 'Adresse du chantier',
        address_placeholder: 'Saisissez l\'adresse...',
        work_type: 'Type de travail',
        new_work: 'Nouveau',
        repair_work: 'Rénovation',
        date: 'Date souhaitée',
        time: 'Heure souhaitée',
        notes: 'Remarques',
        notes_placeholder: 'Instructions spéciales, accès, contact sur place...',
        surfaces: 'Surfaces',
        surface: 'Surface',
        add_surface: 'Ajouter une surface',
        sqm: 'm²',
        thickness: 'Épaisseur (cm)',
        foil: 'Film plastique',
        mesh: 'Treillis métallique',
        fiber: 'Fibres + Duramint',
        save: 'Enregistrer',
        saving: 'Enregistrement...',
        cancel: 'Annuler',
        required: 'Ce champ est obligatoire',
        documents: 'Documents et photos',
        add_files: 'Ajouter des fichiers',
        no_files: 'Aucun fichier sélectionné',
    },
    nl: {
        new_title: 'Nieuwe bestelling',
        edit_title: 'Bestelling bewerken',
        address: 'Adres van de werf',
        address_placeholder: 'Voer het adres in...',
        work_type: 'Type werk',
        new_work: 'Nieuw',
        repair_work: 'Renovatie',
        date: 'Gewenste datum',
        time: 'Gewenste tijd',
        notes: 'Opmerkingen',
        notes_placeholder: 'Speciale instructies, toegang, contactpersoon...',
        surfaces: 'Oppervlakten',
        surface: 'Oppervlakte',
        add_surface: 'Oppervlakte toevoegen',
        sqm: 'm²',
        thickness: 'Dikte (cm)',
        foil: 'Plastic folie',
        mesh: 'Metalen gaas',
        fiber: 'Vezels + Duramint',
        save: 'Opslaan',
        saving: 'Opslaan...',
        cancel: 'Annuleren',
        required: 'Dit veld is verplicht',
        documents: 'Documenten en foto\'s',
        add_files: 'Bestanden toevoegen',
        no_files: 'Geen bestand geselecteerd',
    },
    en: {
        new_title: 'New order',
        edit_title: 'Edit order',
        address: 'Site address',
        address_placeholder: 'Enter the address...',
        work_type: 'Work type',
        new_work: 'New',
        repair_work: 'Renovation',
        date: 'Desired date',
        time: 'Desired time',
        notes: 'Notes',
        notes_placeholder: 'Special instructions, access, on-site contact...',
        surfaces: 'Surfaces',
        surface: 'Surface',
        add_surface: 'Add surface',
        sqm: 'm²',
        thickness: 'Thickness (cm)',
        foil: 'Plastic foil',
        mesh: 'Metal mesh',
        fiber: 'Fibres + Duramint',
        save: 'Save',
        saving: 'Saving...',
        cancel: 'Cancel',
        required: 'This field is required',
        documents: 'Documents and photos',
        add_files: 'Add files',
        no_files: 'No files selected',
    },
}

const DEFAULT_SURFACE = { label: 'Chape', quantity: '', unit: 'm²', thickness: 7, has_foil: false, has_mesh: false, has_duramint: true }

export default function PartnerWorkOrderModal({ order, lang, onClose, onSaved }) {
    const t = T[lang] || T.fr
    const isEdit = order && order.id

    const [form, setForm] = useState({
        site_address: '',
        work_type: 'new',
        start_date: '',
        start_time: '',
        notes: '',
        surfaces: [{ ...DEFAULT_SURFACE }],
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const [filesToUpload, setFilesToUpload] = useState([])
    const [existingFiles, setExistingFiles] = useState([])
    const fileRef = useRef(null)

    // Populate form on edit
    useEffect(() => {
        if (order) {
            const surfaces = (order.volumes && order.volumes.length > 0)
                ? order.volumes.map(v => ({
                    label: v.label || 'Chape',
                    quantity: v.quantity || '',
                    unit: v.unit || 'm²',
                    thickness: v.thickness || 7,
                    has_foil: v.has_foil || false,
                    has_mesh: v.has_mesh || false,
                    has_duramint: v.has_duramint !== false,
                }))
                : [{ ...DEFAULT_SURFACE }]

            setForm({
                site_address: order.site_address || '',
                work_type: order.work_type || 'new',
                start_date: order.start_date ? order.start_date.split('T')[0] : '',
                start_time: order.start_date && order.start_date.includes('T') ? order.start_date.split('T')[1].substring(0, 5) : '',
                notes: order.notes || '',
                surfaces,
            })

            // Load existing attachments
            if (order.id) {
                partnerApi.get(`/work-orders/${order.id}/attachments`)
                    .then(res => setExistingFiles(res.data || []))
                    .catch(() => {})
            }
        }
    }, [order])

    const updateSurface = (index, field, value) => {
        setForm(prev => ({
            ...prev,
            surfaces: prev.surfaces.map((s, i) => i === index ? { ...s, [field]: value } : s)
        }))
    }

    const addSurface = () => {
        setForm(prev => ({
            ...prev,
            surfaces: [...prev.surfaces, { ...DEFAULT_SURFACE, label: `Surface ${prev.surfaces.length + 1}` }]
        }))
    }

    const removeSurface = (index) => {
        if (form.surfaces.length <= 1) return
        setForm(prev => ({
            ...prev,
            surfaces: prev.surfaces.filter((_, i) => i !== index)
        }))
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFilesToUpload(prev => [...prev, ...Array.from(e.target.files)])
        }
    }

    const removeFile = (index) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index))
    }

    const removeExistingFile = async (attachmentId) => {
        if (!order?.id) return
        try {
            await partnerApi.delete(`/work-orders/${order.id}/attachments/${attachmentId}`)
            setExistingFiles(prev => prev.filter(f => f.id !== attachmentId))
        } catch (err) {
            console.error('Failed to delete attachment', err)
        }
    }

    const validate = () => {
        const errs = {}
        if (!form.site_address.trim()) errs.address = t.required
        if (!form.surfaces.some(s => parseFloat(s.quantity) > 0)) errs.surfaces = t.required
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setSaving(true)

        try {
            let finalDate = null;
            if (form.start_date) {
                finalDate = form.start_time ? `${form.start_date}T${form.start_time}:00` : form.start_date;
            }

            const payload = {
                site_address: form.site_address,
                work_type: form.work_type,
                start_date: finalDate,
                notes: form.notes || null,
                surfaces: form.surfaces.map(s => ({
                    ...s,
                    quantity: parseFloat(s.quantity) || 0,
                    thickness: parseFloat(s.thickness) || 7,
                })).filter(s => s.quantity > 0),
            }

            let woId = isEdit ? order.id : null

            if (isEdit) {
                await partnerApi.put(`/work-orders/${order.id}`, payload)
            } else {
                const res = await partnerApi.post('/work-orders', payload)
                woId = res.data?.id
            }

            // Upload files
            if (woId && filesToUpload.length > 0) {
                for (const file of filesToUpload) {
                    const fd = new FormData()
                    fd.append('file', file)
                    try {
                        await partnerApi.post(`/work-orders/${woId}/attachments`, fd)
                    } catch (uploadErr) {
                        console.error('File upload failed', uploadErr)
                    }
                }
            }

            onSaved()
        } catch (err) {
            console.error('Save failed', err)
            let msg = err.message
            if (err.response?.data?.detail) {
                const det = err.response.data.detail
                msg = Array.isArray(det) ? det.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ') : det
            }
            setErrors(prev => ({ ...prev, api: msg }))
        } finally {
            setSaving(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">
                        {isEdit ? t.edit_title : t.new_title}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
                    {errors.api && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                            {errors.api}
                        </div>
                    )}
                    {/* Address */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <MapPin className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                            {t.address}
                        </label>
                        <AddressAutocomplete
                            value={form.site_address}
                            onChange={(val) => setForm(prev => ({ ...prev, site_address: val }))}
                            onSelect={(place) => {
                                setForm(prev => ({ ...prev, site_address: place.address || '' }))
                            }}
                            placeholder={t.address_placeholder}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                                {t.date}
                            </label>
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                <span className="w-3.5 h-3.5 inline-block mr-1"></span>
                                {t.time}
                            </label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Surfaces */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                            <Layers className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                            {t.surfaces}
                        </label>
                        {errors.surfaces && <p className="text-red-500 text-xs mb-2">{errors.surfaces}</p>}

                        <div className="space-y-3">
                            {form.surfaces.map((surface, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                            {t.surface} {i + 1}
                                        </span>
                                        {form.surfaces.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSurface(i)}
                                                className="p-1 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.surface} ({t.sqm})</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={surface.quantity}
                                                onChange={(e) => updateSurface(i, 'quantity', e.target.value)}
                                                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                                                placeholder="150"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.thickness}</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="1"
                                                value={surface.thickness}
                                                onChange={(e) => updateSurface(i, 'thickness', e.target.value)}
                                                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
                                                placeholder="7"
                                            />
                                        </div>
                                    </div>



                                    {/* Material toggles */}
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: 'has_foil', label: t.foil, color: 'blue' },
                                            { key: 'has_mesh', label: t.mesh, color: 'purple' },
                                            { key: 'has_duramint', label: t.fiber, color: 'emerald' },
                                        ].map(mat => (
                                            <button
                                                key={mat.key}
                                                type="button"
                                                onClick={() => updateSurface(i, mat.key, !surface[mat.key])}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${surface[mat.key]
                                                        ? `bg-${mat.color}-50 border-${mat.color}-300 text-${mat.color}-700 dark:bg-${mat.color}-900/30 dark:border-${mat.color}-600 dark:text-${mat.color}-300`
                                                        : 'bg-white dark:bg-slate-600 border-slate-200 dark:border-slate-500 text-slate-400'
                                                    }`}
                                            >
                                                {surface[mat.key] ? '✓ ' : ''}{mat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addSurface}
                            className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t.add_surface}
                        </button>
                    </div>

                    {/* Fichiers / Documents */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <Paperclip className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                            {t.documents}
                        </label>
                        <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                            <input 
                                type="file" 
                                multiple 
                                ref={fileRef}
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={handleFileChange} 
                            />
                            
                            <div className="flex flex-col items-center justify-center space-y-2">
                                {/* Existing attachments */}
                                {existingFiles.length > 0 && (
                                    <ul className="w-full space-y-2">
                                        {existingFiles.map((file) => {
                                            const isPdf = (file.photo_path || '').toLowerCase().endsWith('.pdf');
                                            return (
                                                <li key={file.id} className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm group">
                                                    <div className="flex items-center gap-2 truncate">
                                                        {isPdf ? <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                                        <span className="truncate text-slate-700 dark:text-slate-200 font-medium">{file.description || (file.photo_path || '').split('/').pop() || 'Document'}</span>
                                                        <span className="text-[8px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">✓</span>
                                                    </div>
                                                    <button type="button" onClick={() => removeExistingFile(file.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 transition-colors shrink-0 ml-2">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}

                                {/* New files to upload */}
                                {filesToUpload.length === 0 && existingFiles.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t.no_files}</p>
                                ) : filesToUpload.length > 0 ? (
                                    <ul className="w-full space-y-2">
                                        {filesToUpload.map((file, idx) => (
                                            <li key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-700 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm group">
                                                <div 
                                                    className="flex items-center gap-2 truncate cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => {
                                                        const url = URL.createObjectURL(file);
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    {file.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                                    <span className="truncate group-hover:underline text-blue-600 dark:text-blue-400">{file.name}</span>
                                                    <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">Nouveau</span>
                                                </div>
                                                <button type="button" onClick={() => removeFile(idx)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 transition-colors shrink-0 ml-2">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                <button 
                                    type="button" 
                                    onClick={() => fileRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t.add_files}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{t.notes}</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                            placeholder={t.notes_placeholder}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm text-slate-700 dark:text-slate-200 font-medium transition-colors"
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t.saving}
                                </>
                            ) : t.save}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
