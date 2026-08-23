import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import SearchableSelect from '../../components/SearchableSelect'
import {
    Handshake, Plus, Trash2, Edit2, Eye, EyeOff, Loader2, X, 
    CheckCircle, XCircle, Mail, User, Building2, Globe, Copy, Truck, ChevronDown, ChevronUp
} from 'lucide-react'
import { useTenantStore } from '../../store/tenantStore'

export default function PartnersManagement() {
    const { t } = useTranslation()
    const { tenant } = useTenantStore()
    const [partners, setPartners] = useState([])
    const [clients, setClients] = useState([])
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingPartner, setEditingPartner] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

    const fetchPartners = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get('/partner/partners')
            setPartners(res.data || [])
        } catch (err) {
            console.error('Failed to fetch partners', err)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchClients = useCallback(async () => {
        try {
            const res = await api.get('/admin/clients')
            setClients(res.data || [])
        } catch (err) {
            console.error('Failed to fetch clients', err)
        }
    }, [])

    const fetchTeams = useCallback(async () => {
        try {
            const res = await api.get('/admin/teams')
            setTeams(res.data?.teams || [])
        } catch (err) {
            console.error('Failed to fetch teams', err)
        }
    }, [])

    useEffect(() => {
        fetchPartners()
        fetchClients()
        fetchTeams()
    }, [fetchPartners, fetchClients, fetchTeams])

    const handleDelete = async (id) => {
        try {
            await api.delete(`/partner/partners/${id}`)
            setPartners(prev => prev.filter(p => p.id !== id))
            setShowDeleteConfirm(null)
        } catch (err) {
            console.error('Failed to delete', err)
        }
    }

    const handleToggleStatus = async (partner, newStatus) => {
        try {
            // Optimistic update
            setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, is_active: newStatus } : p))
            await api.put(`/partner/partners/${partner.id}`, { ...partner, is_active: newStatus })
        } catch (err) {
            console.error('Failed to toggle status', err)
            // Revert on error
            setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, is_active: !newStatus } : p))
        }
    }

    const handleSaved = () => {
        setShowModal(false)
        setEditingPartner(null)
        fetchPartners()
    }

    const getPartnerUrl = () => {
        const hostname = window.location.hostname
        const port = window.location.port
        const protocol = window.location.protocol
        const base = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
        return `${base}/partner/login`
    }

    const columns = [
        {
            key: 'full_name',
            label: t('partners.name', 'Nom'),
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: row.color || '#3b82f6' }}
                    >
                        {(row.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-slate-800 dark:text-white">{row.full_name}</p>
                        <p className="text-xs text-slate-400">{row.email}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'client_name',
            label: t('partners.company', 'Société associée'),
            render: (row) => (
                <span className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {row.client_name || '—'}
                </span>
            )
        },
        {
            key: 'preferred_language',
            label: t('partners.language', 'Langue'),
            render: (row) => {
                const flags = { fr: '🇫🇷', nl: '🇳🇱', en: '🇬🇧' }
                return (
                    <span className="text-sm">
                        {flags[row.preferred_language] || '🌐'} {(row.preferred_language || 'fr').toUpperCase()}
                    </span>
                )
            }
        },
        {
            key: 'is_active',
            label: t('partners.status', 'Statut'),
            render: (row) => (
                <label className="relative inline-flex items-center cursor-pointer" title={row.is_active ? t('partners.active', 'Actif') : t('partners.inactive', 'Inactif')}>
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={row.is_active}
                        onChange={(e) => handleToggleStatus(row, e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500 shadow-inner"></div>
                    <span className={`ml-2 text-xs font-medium ${row.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {row.is_active ? t('partners.active', 'Actif') : t('partners.inactive', 'Inactif')}
                    </span>
                </label>
            )
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { setEditingPartner(row); setShowModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title={t('partners.edit', 'Modifier')}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(row.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title={t('partners.delete', 'Supprimer')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        },
    ]

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Handshake className="w-7 h-7 text-blue-600" />
                        {t('partners.title', 'Partenaires')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('partners.subtitle', 'Gérer les comptes partenaires externes')}
                    </p>
                </div>
                <button
                    onClick={() => { setEditingPartner(null); setShowModal(true) }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 hover:brightness-110"
                    style={{ backgroundColor: tenant?.primary_color || '#2563EB' }}
                >
                    <Plus className="w-5 h-5" />
                    {t('partners.add', 'Ajouter un partenaire')}
                </button>
            </div>

            {/* Partner URL info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        {t('partners.login_url_label', 'Lien de connexion partenaire :')}
                    </p>
                    <code className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-mono">{getPartnerUrl()}</code>
                </div>
                <button
                    onClick={() => navigator.clipboard.writeText(getPartnerUrl())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium transition-colors"
                >
                    <Copy className="w-4 h-4" />
                    {t('partners.copy_link', 'Copier')}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <DataTable
                    data={partners}
                    columns={columns}
                    loading={loading}
                    searchable={true}
                    searchKeys={['full_name', 'email', 'client_name']}
                    searchPlaceholder={t('partners.search', 'Rechercher un partenaire...')}
                    emptyMessage={t('partners.empty', 'Aucun partenaire')}
                />
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <PartnerFormModal
                    partner={editingPartner}
                    clients={clients}
                    teams={teams}
                    onClose={() => { setShowModal(false); setEditingPartner(null) }}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete Confirm */}
            {showDeleteConfirm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <p className="text-slate-700 dark:text-slate-200 font-medium mb-4">
                            {t('partners.confirm_delete', 'Êtes-vous sûr de vouloir supprimer ce partenaire ?')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteConfirm)}
                                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                            >
                                {t('common.delete', 'Supprimer')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}


// ── Create/Edit Partner Modal ──
function PartnerFormModal({ partner, clients = [], teams = [], onClose, onSaved }) {
    const { t } = useTranslation()
    const { tenant } = useTenantStore()
    const isEdit = !!partner?.id

    const [form, setForm] = useState({
        email: partner?.email || '',
        full_name: partner?.full_name || '',
        password: '',
        client_id: partner?.client_id || '',
        preferred_language: partner?.preferred_language || 'fr',
        is_active: partner?.is_active !== false,
        allowed_team_ids: Array.isArray(partner?.allowed_team_ids) ? partner.allowed_team_ids : [],
        color: partner?.color || '#3b82f6',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSaving(true)

        try {
            if (isEdit) {
                const payload = { ...form }
                if (!payload.password) delete payload.password
                await api.put(`/partner/partners/${partner.id}`, payload)
            } else {
                if (!form.password) {
                    setError(t('partners.password_required', 'Le mot de passe est obligatoire'))
                    setSaving(false)
                    return
                }
                await api.post('/partner/partners', form)
            }
            onSaved()
        } catch (err) {
            setError(err.response?.data?.detail || 'Erreur')
        } finally {
            setSaving(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Handshake className="w-5 h-5 text-blue-600" />
                        {isEdit ? t('partners.edit_title', 'Modifier le partenaire') : t('partners.add_title', 'Nouveau partenaire')}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <User className="w-4 h-4 inline mr-1 text-slate-400" />
                            {t('partners.full_name', 'Nom complet')}
                        </label>
                        <input
                            type="text"
                            value={form.full_name}
                            onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                            placeholder="Jean Dupont"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <Mail className="w-4 h-4 inline mr-1 text-slate-400" />
                            {t('partners.email', 'E-mail')}
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                            placeholder="partner@company.com"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            {t('partners.password', 'Mot de passe')}
                            {isEdit && <span className="text-xs text-slate-400 ml-2">({t('partners.leave_blank', 'laisser vide pour ne pas changer')})</span>}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                required={!isEdit}
                                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Client (Company) */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <Building2 className="w-4 h-4 inline mr-1 text-slate-400" />
                            {t('partners.company', 'Société associée')}
                        </label>
                        <SearchableSelect
                            value={form.client_id}
                            onChange={(val) => setForm(prev => ({ ...prev, client_id: val }))}
                            options={clients.map(c => ({ value: c.id, label: c.name }))}
                            placeholder={t('partners.select_company', '— Sélectionner une société —')}
                            searchPlaceholder={t('common.search', 'Căutare...')}
                            buttonClassName="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[46px] text-sm"
                        />
                    </div>

                    {/* Language */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <Globe className="w-4 h-4 inline mr-1 text-slate-400" />
                            {t('partners.language', 'Langue')}
                        </label>
                        <div className="flex gap-2">
                            {[
                                { code: 'fr', label: '🇫🇷 Français' },
                                { code: 'nl', label: '🇳🇱 Nederlands' },
                                { code: 'en', label: '🇬🇧 English' },
                            ].map(l => (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, preferred_language: l.code }))}
                                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.preferred_language === l.code
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            {t('partners.color', 'Couleur du partenaire')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color" 
                                value={form.color} 
                                onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))}
                                className="w-12 h-12 p-1 border border-slate-200 dark:border-slate-600 rounded-full cursor-pointer bg-white dark:bg-slate-700"
                            />
                            <span className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold">{form.color}</span>
                        </div>
                    </div>

                    {/* Allowed Teams Dropdown */}
                    <div className="relative">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <Truck className="w-4 h-4 inline mr-1 text-slate-400" />
                            {t('partners.allowed_teams', 'Équipes autorisées')}
                        </label>
                        <div 
                            className="flex items-center justify-between w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => setTeamsDropdownOpen(!teamsDropdownOpen)}
                        >
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {form.allowed_team_ids.length === 0 
                                    ? t('partners.no_teams_selected', 'Sélectionnez les équipes...')
                                    : t('partners.teams_selected_count', '{{count}} équipe(s) sélectionnée(s)', { count: form.allowed_team_ids.length })}
                            </span>
                            {teamsDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>

                        {teamsDropdownOpen && (
                            <div className="absolute z-[100] top-[100%] left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar p-2">
                                {teams.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic p-2">{t('partners.no_teams', 'Aucune équipe disponible')}</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {teams.map(team => {
                                            const isActive = form.allowed_team_ids.includes(team.id);
                                            return (
                                                <label 
                                                    key={team.id} 
                                                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {team.name}
                                                    </span>
                                                    <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isActive}
                                                            onChange={(e) => {
                                                                const next = e.target.checked 
                                                                    ? [...form.allowed_team_ids, team.id]
                                                                    : form.allowed_team_ids.filter(id => id !== team.id);
                                                                setForm(prev => ({ ...prev, allowed_team_ids: next }));
                                                            }}
                                                            className="sr-only"
                                                        />
                                                        <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                        >
                            {t('common.cancel', 'Annuler')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:brightness-110"
                            style={{ backgroundColor: tenant?.primary_color || '#2563EB' }}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isEdit ? t('common.save', 'Enregistrer') : t('partners.create', 'Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
