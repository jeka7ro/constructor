import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { Shield, Plus, Search, Edit2, Trash2, Loader2, Mail, Phone, X, Save, Eye, EyeOff, UserCog, Lock } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useAdminStore } from '../../store/adminStore'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
const ADMIN_ROLE_NAMES = ['Administrator', 'Super Administrator']

const EMPTY_FORM = {
    last_name: '',
    first_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '',
    is_active: true,
}

export default function UsersManagement() {
    const { t } = useTranslation()
    const { openDialog, showToast } = useUIStore()
    const admin = useAdminStore(state => state.admin)
    const isSuperAdmin = admin?.is_super_admin === true
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roles, setRoles] = useState([])

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        fetchUsers()
        fetchRoles()
    }, [search])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const params = { search, page: 1, page_size: 100 }
            const response = await api.get('/admin/users/', { params })
            const all = response.data.users || []
            const adminUsers = all.filter(u =>
                !(u.employee_code === 'ADMIN' || (u.last_name === 'Admin' && u.first_name === 'User')) &&
                ADMIN_ROLE_NAMES.includes(u.role_name)
            )
            setUsers(adminUsers)
        } catch (err) {
            console.error('Error fetching users:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchRoles = async () => {
        try {
            const response = await api.get('/admin/roles/')
            setRoles((response.data || []).filter(r => ADMIN_ROLE_NAMES.includes(r.name)))
        } catch (err) {
            console.error('Error fetching roles:', err)
        }
    }

    const openAdd = () => {
        setEditingUser(null)
        setFormData(EMPTY_FORM)
        setShowPassword(false)
        setShowModal(true)
    }

    const openEdit = (user) => {
        setEditingUser(user)
        setFormData({
            last_name: user.last_name || '',
            first_name: user.first_name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            role_id: user.role_id || '',
            is_active: user.is_active ?? true,
        })
        setShowPassword(false)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!formData.last_name.trim() || !formData.first_name.trim()) {
            showToast?.({ type: 'error', message: 'Numele și prenumele sunt obligatorii.' })
            return
        }
        if (!formData.email.trim()) {
            showToast?.({ type: 'error', message: 'Email-ul este obligatoriu.' })
            return
        }
        if (!editingUser && !formData.password.trim()) {
            showToast?.({ type: 'error', message: 'Parola este obligatorie pentru utilizator nou.' })
            return
        }
        if (!formData.role_id) {
            showToast?.({ type: 'error', message: 'Selectează un rol.' })
            return
        }
        try {
            setSaving(true)
            const payload = {
                last_name: formData.last_name.trim(),
                first_name: formData.first_name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                role_id: formData.role_id,
                is_active: formData.is_active,
            }
            if (formData.password.trim()) payload.password = formData.password.trim()

            if (editingUser) {
                await api.put(`/admin/users/${editingUser.id}`, payload)
                showToast?.({ type: 'success', message: 'Utilizator actualizat.' })
            } else {
                await api.post('/admin/users/', payload)
                showToast?.({ type: 'success', message: 'Utilizator creat.' })
            }
            setShowModal(false)
            fetchUsers()
        } catch (err) {
            openDialog({ type: 'danger', title: 'Eroare', message: err.response?.data?.detail || err.message, confirmText: 'OK', cancelText: null })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (user) => {
        openDialog({
            type: 'danger',
            title: 'Șterge Utilizator',
            message: `Sigur vrei să ștergi utilizatorul "${user.first_name} ${user.last_name}"?`,
            confirmText: 'Șterge',
            cancelText: 'Anulează',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/users/${user.id}`)
                    showToast?.({ type: 'success', message: 'Utilizator șters.' })
                    fetchUsers()
                } catch (err) {
                    openDialog({ type: 'danger', title: 'Eroare', message: err.response?.data?.detail || err.message, confirmText: 'OK', cancelText: null })
                }
            }
        })
    }

    const handleToggleActive = async (user) => {
        try {
            await api.put(`/admin/users/${user.id}`, { is_active: !user.is_active })
            fetchUsers()
        } catch (err) {
            console.error(err)
        }
    }

    const filtered = users.filter(u => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            u.first_name?.toLowerCase().includes(q) ||
            u.last_name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        )
    })

    const inputCls = "w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
    const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5"

    return (
        <div className="p-6 space-y-5">
            {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Gestionare Utilizatori
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Conturi cu acces la panoul de administrare</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după nume sau email..."
                            className="w-64 pl-9 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    {isSuperAdmin ? (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-2 px-5 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold shadow-sm shadow-blue-500/20 transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Adaugă Utilizator
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5 px-4 h-10 rounded-full bg-slate-100 text-slate-400 text-sm font-medium">
                            <Lock className="w-3.5 h-3.5" />
                            Doar Super Admin
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Utilizator</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="py-16 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                                Niciun utilizator admin găsit
                            </td></tr>
                        ) : filtered.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        {user.avatar_path ? (
                                            <img src={`${API_BASE}${user.avatar_path}`} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.last_name} {user.first_name}</p>
                                            <p className="text-xs text-slate-400">{user.employee_code}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="space-y-0.5">
                                        {user.email && <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{user.email}</p>}
                                        {user.phone && <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{user.phone}</p>}
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                        user.role_name === 'Super Administrator'
                                            ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800'
                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                    }`}>
                                        {user.role_name}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <button onClick={() => handleToggleActive(user)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                                        user.is_active
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {user.is_active ? 'Activ' : 'Inactiv'}
                                    </button>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {isSuperAdmin ? (
                                            <>
                                                <button onClick={() => openEdit(user)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-700" title="Editează">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(user)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600" title="Șterge">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <Lock className="w-4 h-4 text-slate-300" title="Doar Super Admin poate edita" />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ADD/EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <UserCog className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {editingUser ? 'Editează Utilizator' : 'Adaugă Utilizator Admin'}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Nume *</label>
                                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputCls} placeholder="ex: Popescu" />
                                </div>
                                <div>
                                    <label className={labelCls}>Prenume *</label>
                                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputCls} placeholder="ex: Ion" />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Email *</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} placeholder="email@example.com" />
                            </div>

                            <div>
                                <label className={labelCls}>Telefon</label>
                                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputCls} placeholder="07xx xxx xxx" />
                            </div>

                            <div>
                                <label className={labelCls}>
                                    Parolă {editingUser ? <span className="normal-case font-normal">(lasă gol pentru a păstra)</span> : '*'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className={inputCls + ' pr-10'}
                                        placeholder={editingUser ? '••••••••' : 'Parolă nouă'}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Rol *</label>
                                <select value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })} className={inputCls}>
                                    <option value="">Selectează rol...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>

                            {editingUser && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Cont activ</span>
                                </label>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2.5">
                            <button onClick={() => setShowModal(false)} className="px-5 h-10 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-colors bg-slate-50">
                                Anulează
                            </button>
                            <button onClick={handleSave} disabled={saving} className="px-5 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingUser ? 'Salvează' : 'Creează'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
