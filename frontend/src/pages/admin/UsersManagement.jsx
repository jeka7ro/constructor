import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { Shield, Plus, Search, Edit2, Trash2, Loader2, Mail, Phone, X, Save, Eye, EyeOff, UserCog, Lock, ScanLine, Upload } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useAdminStore } from '../../store/adminStore'
import AvatarCropModal from '../../components/AvatarCropModal'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
const ADMIN_ROLE_NAMES = ['Administrator', 'Super Administrator']

const EMPTY_FORM = {
    last_name: '',
    first_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role_id: '',
    is_active: true,
    cnp: '',
    birth_place: '',
    id_card_series: '',
    birth_date: ''
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

    // OCR / Avatar state
    const [idCardFile, setIdCardFile] = useState(null)
    const [idCardPreview, setIdCardPreview] = useState(null)
    const [ocrLoading, setOcrLoading] = useState(false)
    const [avatarCropImage, setAvatarCropImage] = useState(null)
    const [avatarUploadUserId, setAvatarUploadUserId] = useState(null)

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
            setRoles(response.data || [])
        } catch (err) {
            console.error('Error fetching roles:', err)
        }
    }

    const openAdd = () => {
        setEditingUser(null)
        setFormData(EMPTY_FORM)
        setShowPassword(false)
        setIdCardFile(null)
        setIdCardPreview(null)
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
            confirm_password: '',
            role_id: user.role_id || '',
            is_active: user.is_active ?? true,
            cnp: user.cnp || '',
            birth_place: user.birth_place || '',
            id_card_series: user.id_card_series || '',
            birth_date: user.birth_date || ''
        })
        setShowPassword(false)
        setIdCardFile(null)
        setIdCardPreview(null)
        setShowModal(true)
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setIdCardFile(file)
            setIdCardPreview(URL.createObjectURL(file))
        }
    }

    const handleScanIdCard = async () => {
        if (!idCardFile) {
            showToast({ type: 'error', message: 'Selectează o imagine cu buletinul mai întâi.' })
            return
        }
        try {
            setOcrLoading(true)
            
            // Dynamic import to prevent Vite/Webpack from bundling massive libraries on initial load
            const { extractTextFromImageOrPdf } = await import('../../lib/pdfOcr')
            
            const extractedText = await extractTextFromImageOrPdf(idCardFile)

            const fd = new FormData()
            fd.append('file', idCardFile)
            fd.append('raw_text', extractedText)

            const resp = await api.post('/admin/users/ocr/extract', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            
            if (resp.data) {
                setFormData(prev => ({
                    ...prev,
                    last_name: resp.data.last_name || prev.last_name,
                    first_name: resp.data.first_name || prev.first_name,
                    cnp: resp.data.cnp || prev.cnp,
                    birth_place: resp.data.birth_place || prev.birth_place,
                    id_card_series: resp.data.id_card_series || prev.id_card_series,
                    birth_date: resp.data.birth_date || prev.birth_date
                }))
                showToast({ type: 'success', message: 'Datele au fost extrase cu succes din buletin!' })
            }
        } catch (err) {
            console.error('OCR Error:', err)
            openDialog({ type: 'danger', title: 'Eroare Scanare', message: 'Nu am putut citi buletinul automat. Te rugăm să introduci datele manual.', confirmText: 'OK', cancelText: null })
        } finally {
            setOcrLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.last_name.trim() || !formData.first_name.trim()) {
            showToast({ type: 'error', message: 'Numele și prenumele sunt obligatorii.' })
            return
        }
        if (!formData.email.trim()) {
            showToast({ type: 'error', message: 'Email-ul este obligatoriu.' })
            return
        }
        if (!editingUser && !formData.password.trim()) {
            showToast({ type: 'error', message: 'Parola este obligatorie pentru utilizator nou.' })
            return
        }
        if (formData.password.trim() && formData.password !== formData.confirm_password) {
            showToast({ type: 'error', message: 'Parolele nu coincid.' })
            return
        }
        if (!formData.role_id) {
            showToast({ type: 'error', message: 'Selectează un rol.' })
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
                cnp: formData.cnp,
                birth_place: formData.birth_place,
                id_card_series: formData.id_card_series,
                birth_date: formData.birth_date
            }
            if (formData.password.trim()) payload.password = formData.password.trim()

            if (editingUser) {
                await api.put(`/admin/users/${editingUser.id}`, payload)
                showToast({ type: 'success', message: 'Utilizator actualizat.' })
            } else {
                await api.post('/admin/users/', payload)
                showToast({ type: 'success', message: 'Utilizator creat.' })
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
                    showToast({ type: 'success', message: 'Utilizator șters.' })
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
    const labelCls = "block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"

    return (
        <div className="p-6 space-y-5">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Gestionare Utilizatori
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Toate conturile de utilizatori (Administratori)</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Caută după nume sau email..."
                            className="w-64 pl-9 pr-9 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        {search && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {filtered.length}/{users.length}
                                </span>
                                <button
                                    onClick={() => setSearch('')}
                                    className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5 text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-5 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold shadow-sm shadow-blue-500/20 transition-all whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Adaugă Utilizator
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3 text-left border-r border-slate-100 dark:border-slate-800">Utilizator</th>
                            <th className="px-5 py-3 text-left">Contact</th>
                            <th className="px-5 py-3 text-left">Rol</th>
                            <th className="px-5 py-3 text-left">Status</th>
                            <th className="px-5 py-3 text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="py-16 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                                Niciun utilizator găsit
                            </td></tr>
                        ) : filtered.map(user => (
                            <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-5 py-3 border-r border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="relative cursor-pointer"
                                            onClick={() => {
                                                if (isSuperAdmin || user.role_name !== 'Super Administrator') {
                                                    setAvatarUploadUserId(user.id);
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = (e) => setAvatarCropImage(e.target.files[0]);
                                                    input.click();
                                                }
                                            }}
                                            title="Schimbă poza (doar Adminii autorizați)"
                                        >
                                            {user.avatar_path ? (
                                                <img src={`${API_BASE}${user.avatar_path}`} alt="" className="w-10 h-12 rounded-lg object-cover object-[center_20%] ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 relative z-0 hover:z-50 transition-transform duration-200 hover:scale-[1.8] hover:shadow-2xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }} />
                                            ) : null}
                                            <div className={`w-10 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm ring-1 ring-blue-200 dark:ring-blue-800 shrink-0 ${user.avatar_path ? 'hidden' : 'flex'} group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors`}>
                                                {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.last_name} {user.first_name}</p>
                                            <p className="text-[11px] font-mono text-slate-400">{user.employee_code}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="space-y-0.5">
                                        {user.email && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate max-w-[180px]">{user.email}</span>
                                            </div>
                                        )}
                                        {user.phone && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{user.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {user.role_name}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <button onClick={() => handleToggleActive(user)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                                        user.is_active
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {user.is_active ? 'Activ' : 'Inactiv'}
                                    </button>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        {isSuperAdmin || user.role_name !== 'Super Administrator' ? (
                                            <>
                                                <button onClick={() => openEdit(user)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Editează">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(user)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="Șterge">
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

            {/* AVATAR CROP MODAL */}
            <AvatarCropModal
                imageFile={avatarCropImage}
                onCancel={() => {
                    setAvatarCropImage(null)
                    setAvatarUploadUserId(null)
                }}
                onSave={async (blob) => {
                    if (!avatarUploadUserId) return;
                    const fd = new FormData()
                    fd.append('file', blob, 'avatar.jpg')
                    try {
                        await api.post(`/admin/users/${avatarUploadUserId}/upload-avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                        fetchUsers()
                        showToast({ type: 'success', message: 'Avatar actualizat' })
                    } catch (err) {
                        console.error('Avatar upload error:', err);
                        showToast({ type: 'error', message: 'Eroare la actualizare avatar' })
                    }
                    setAvatarCropImage(null)
                    setAvatarUploadUserId(null)
                }}
            />

            {/* ADD/EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <UserCog className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {editingUser ? 'Editează Utilizator' : 'Adaugă Utilizator'}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-5 overflow-y-auto space-y-6">
                            
                            {/* SCANNER SECTION */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Extragere Automată Date (OCR)</h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button type="button" className="px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-2 shadow-sm">
                                            <Upload className="w-4 h-4" />
                                            {idCardFile ? 'Schimbă imaginea' : 'Încarcă Buletin'}
                                        </button>
                                    </div>
                                    {idCardPreview && (
                                        <button
                                            type="button"
                                            onClick={handleScanIdCard}
                                            disabled={ocrLoading}
                                            className="px-4 h-10 bg-violet-500 hover:bg-violet-600 text-white rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                            Scanează CI
                                        </button>
                                    )}
                                </div>
                                {idCardFile && <p className="text-[11px] font-medium text-slate-500 mt-2 truncate max-w-full">Selectat: {idCardFile.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Nume *</label>
                                        <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputCls} placeholder="ex: Popescu" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Prenume *</label>
                                        <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputCls} placeholder="ex: Ion" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>CNP</label>
                                        <input type="text" value={formData.cnp} onChange={e => setFormData({ ...formData, cnp: e.target.value })} className={inputCls} placeholder="13 cifre" maxLength={13} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Serie și Nr. CI</label>
                                        <input type="text" value={formData.id_card_series} onChange={e => setFormData({ ...formData, id_card_series: e.target.value })} className={inputCls} placeholder="ex: ZT 123456" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Email *</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} placeholder="email@example.com" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Telefon</label>
                                        <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputCls} placeholder="07xx xxx xxx" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Locul Nașterii</label>
                                        <input type="text" value={formData.birth_place} onChange={e => setFormData({ ...formData, birth_place: e.target.value })} className={inputCls} placeholder="ex: Mun. București" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Data Nașterii</label>
                                        <input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label className={labelCls}>Rol *</label>
                                        <select value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })} className={inputCls}>
                                            <option value="">Selectează rol...</option>
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    {editingUser && (
                                        <div className="flex items-center mt-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Cont activ</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className={labelCls}>
                                            Parolă {editingUser ? <span className="normal-case font-normal text-slate-400">(lasă gol pentru a o păstra)</span> : '*'}
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
                                        <label className={labelCls}>
                                            Repetă Parola {editingUser ? <span className="normal-case font-normal text-slate-400">(lasă gol)</span> : '*'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.confirm_password}
                                                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                                className={inputCls + ' pr-10'}
                                                placeholder="Confirmă parola"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-shrink-0 justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 rounded-b-2xl">
                            <button onClick={() => setShowModal(false)} className="px-5 h-10 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300 rounded-full transition-colors">
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
