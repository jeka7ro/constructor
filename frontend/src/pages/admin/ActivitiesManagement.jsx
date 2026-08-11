import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import {
    Plus, Edit2, Trash2, Loader2, Activity as ActivityIcon, Activity,
    CheckCircle, XCircle, X, ChevronDown, ChevronRight, Palette,
    FolderPlus, GripVertical, Layers, FileDown, FileSpreadsheet, Search, Save, Folder
} from 'lucide-react'
import DataTable from '../../components/DataTable'
import KPICard from '../../components/KPICard'

export default function ActivitiesManagement() {
    const { t } = useTranslation()
    const { showDialog } = useUIStore()
    const [categories, setCategories] = useState([])
    const [flatActivities, setFlatActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState({})
    const [searchQuery, setSearchQuery] = useState('')
    const [showInactive, setShowInactive] = useState(false)

    // Category modal
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3b82f6', sort_order: 0 })

    // Activity modal
    const [showActivityModal, setShowActivityModal] = useState(false)
    const [editingActivity, setEditingActivity] = useState(null)
    const [activityForm, setActivityForm] = useState({
        name: '', unit_type: 'buc', category_id: '', description: '',
        quantity_rules: '', sort_order: 0, is_active: true
    })

    // Category list for dropdowns
    const [categoryList, setCategoryList] = useState([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [activitiesRes, categoriesRes] = await Promise.all([
                api.get('/activities/?is_active=true'),
                api.get('/admin/activity-categories/')
            ])

            // Also get inactive activities
            let inactiveRes
            try {
                inactiveRes = await api.get('/activities/?is_active=false')
            } catch (e) {
                inactiveRes = { data: { categories: [], activities: [] } }
            }

            const activeGrouped = activitiesRes.data.categories || []
            const inactiveGrouped = inactiveRes.data.categories || []
            const allFlat = [
                ...(activitiesRes.data.activities || []),
                ...(inactiveRes.data.activities || [])
            ]

            // Merge grouped categories with all activities
            const catMap = {}
            for (const cat of (categoriesRes.data.categories || [])) {
                catMap[cat.id] = { ...cat, activities: [] }
            }
            
            for (const cat of activeGrouped) {
                const key = cat.id || '__uncategorized'
                if (!catMap[key]) catMap[key] = { ...cat, activities: [] }
                catMap[key].activities = [...catMap[key].activities, ...cat.activities]
            }
            for (const cat of inactiveGrouped) {
                const key = cat.id || '__uncategorized'
                if (!catMap[key]) catMap[key] = { ...cat, activities: [] }
                const existingIds = new Set(catMap[key].activities.map(a => a.id))
                for (const act of cat.activities) {
                    if (!existingIds.has(act.id)) {
                        catMap[key].activities.push(act)
                    }
                }
            }

            setCategories(Object.values(catMap))
            setFlatActivities(allFlat)
            setCategoryList(categoriesRes.data.categories || [])

            // Auto-expand all categories
            const expanded = {}
            Object.keys(catMap).forEach(k => { expanded[k] = true })
            setExpandedCategories(expanded)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleCategory = (catId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catId || '__uncategorized']: !prev[catId || '__uncategorized']
        }))
    }

    // Category CRUD
    const handleSaveCategory = async (e) => {
        e.preventDefault()
        try {
            if (editingCategory) {
                await api.put(`/admin/activity-categories/${editingCategory.id}`, categoryForm)
            } else {
                await api.post('/admin/activity-categories/', categoryForm)
            }
            setShowCategoryModal(false)
            setEditingCategory(null)
            setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
            fetchData()
        } catch (error) {
            console.error('Error saving category:', error)
            showDialog({ type: 'danger', title: t('common.error'), message: error.response?.data?.detail || t('activities.errors.save_category'), confirmText: 'OK', cancelText: null })
        }
    }

    const handleEditCategory = (cat) => {
        setEditingCategory(cat)
        setCategoryForm({ name: cat.name, color: cat.color, sort_order: cat.sort_order || 0 })
        setShowCategoryModal(true)
    }

    const handleDeleteCategory = async (catId) => {
        showDialog({
            type: 'danger',
            title: t('activities.delete.category_title'),
            message: t('activities.delete.category_message'),
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/activity-categories/${catId}`)
                    fetchData()
                } catch (error) {
                    console.error('Error deleting category:', error)
                    showDialog({ type: 'danger', title: t('common.error', 'Erreur'), message: error.response?.data?.detail || t('activities.errors.delete_category'), confirmText: 'OK', cancelText: null })
                }
            }
        })
    }

    // Activity CRUD
    const handleSaveActivity = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...activityForm,
                category_id: activityForm.category_id || null
            }
            if (editingActivity) {
                await api.put(`/admin/activities/${editingActivity.id}`, payload)
            } else {
                await api.post('/admin/activities/', payload)
            }
            setShowActivityModal(false)
            setEditingActivity(null)
            setActivityForm({
                name: '', unit_type: 'buc', category_id: '', description: '',
                quantity_rules: '', sort_order: 0, is_active: true
            })
            fetchData()
        } catch (error) {
            console.error('Error saving activity:', error)
            showDialog({ type: 'danger', title: t('common.error', 'Erreur'), message: error.response?.data?.detail || t('activities.errors.save_activity'), confirmText: 'OK', cancelText: null })
        }
    }

    const handleEditActivity = (activity) => {
        setEditingActivity(activity)
        setActivityForm({
            name: activity.name,
            unit_type: activity.unit_type,
            category_id: activity.category_id || '',
            description: activity.description || '',
            quantity_rules: activity.quantity_rules || '',
            sort_order: activity.sort_order || 0,
            is_active: activity.is_active
        })
        setShowActivityModal(true)
    }

    const handleAddActivityToCategory = (catId) => {
        setEditingActivity(null)
        setActivityForm({
            name: '', unit_type: 'buc', category_id: catId || '',
            description: '', quantity_rules: '', sort_order: 0, is_active: true
        })
        setShowActivityModal(true)
    }

    const handleDeleteActivity = async (id) => {
        showDialog({
            type: 'danger',
            title: t('activities.delete.activity_title'),
            message: t('activities.delete.activity_message'),
            confirmText: t('common.delete', 'Supprimer'),
            onConfirm: async () => {
                try {
                    const response = await api.delete(`/admin/activities/${id}`)
                    if (response.data?.message?.includes('deactivated')) {
                        showDialog({
                            type: 'info',
                            title: t('activities.deactivated.title'),
                            message: t('activities.deactivated.message'),
                            confirmText: 'OK',
                            cancelText: null
                        })
                    }
                    fetchData()
                } catch (error) {
                    console.error('Error deleting activity:', error)
                    showDialog({ type: 'danger', title: t('common.error', 'Erreur'), message: error.response?.data?.detail || t('activities.errors.delete_activity'), confirmText: 'OK', cancelText: null })
                }
            }
        })
    }

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await api.put(`/admin/activities/${id}`, { is_active: !currentStatus })
            fetchData()
        } catch (error) {
            console.error('Error toggling activity:', error)
        }
    }

    const totalActivities = flatActivities.length
    const activeCount = flatActivities.filter(a => a.is_active).length
    const inactiveCount = flatActivities.filter(a => !a.is_active).length

    const PRESET_COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
        '#64748b'
    ]

    const columns = [
        {
            key: 'name',
            label: t('common.name', 'Nume'),
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                </div>
            )
        },
        {
            key: 'category',
            label: t('activities.category', 'Categorie'),
            sortable: true,
            render: (row) => {
                const cat = displayCategoryList.find(c => c.id === row.category_id)
                return cat ? (
                    <span 
                        className="px-2 py-1 rounded-full text-xs font-bold" 
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}40` }}
                    >
                        {cat.name}
                    </span>
                ) : (
                    <span className="text-slate-400">-</span>
                )
            }
        },
        {
            key: 'unit_type',
            label: t('activities.unit', 'Unitate'),
            sortable: true,
            render: (row) => (
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">
                    {row.unit_type}
                </span>
            )
        },
        {
            key: 'is_active',
            label: 'Status',
            sortable: true,
            render: (row) => (
                <button
                    disabled={row.is_system}
                    onClick={(e) => { e.stopPropagation(); if(!row.is_system) handleToggleActive(row.id, row.is_active); }}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold transition-colors ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} ${!row.is_system ? 'hover:opacity-80 cursor-pointer' : 'cursor-default opacity-80'}`}
                >
                    {row.is_active ? t('common.active', 'Activ') : t('common.inactive', 'Inactiv')}
                </button>
            )
        },
        {
            key: 'actions',
            label: t('common.actions', 'Acțiuni'),
            render: (row) => (
                <div className="flex items-center gap-2">
                    {row.is_system ? (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {t('common.system', 'Sistem')}
                        </span>
                    ) : (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleEditActivity(row); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title={t('common.edit', 'Editează')}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteActivity(row.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t('common.delete', 'Șterge')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                        </>
                    )}
                </div>
            )
        }
    ]


    // --- Hardcoded System Activities ---
    const systemActivities = [
        {
            id: 'sys-chape',
            name: t('pricing_settings.tab_chape', 'Chape'),
            category_id: 'sys-cat',
            unit_type: 'm²',
            is_active: true,
            is_system: true
        },
        {
            id: 'sys-pur',
            name: t('pricing_settings.tab_pur', 'Izolație PUR'),
            category_id: 'sys-cat',
            unit_type: 'm²',
            is_active: true,
            is_system: true
        },
        {
            id: 'sys-eps',
            name: t('pricing_settings.tab_eps', 'Izolație EPS'),
            category_id: 'sys-cat',
            unit_type: 'm³',
            is_active: true,
            is_system: true
        }
    ];

    const systemCategory = {
        id: 'sys-cat',
        name: t('activities.system_category', 'Sistem (Core)'),
        color: '#6366f1' // Indigo
    };

    // Include systemCategory in our list for rendering
    const displayCategoryList = [...categoryList, systemCategory];

    const allData = [...systemActivities, ...flatActivities];

    const filteredData = allData.filter(a => {
        if (!showInactive && !a.is_active) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (a.name || '').toLowerCase().includes(query) || (a.unit_type || '').toLowerCase().includes(query);
        }
        return true;
    });


    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 w-full">
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t('dashboard.activities', 'Activități')}
                    </h1>
                    <div className="relative group flex items-center">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('activities.search_placeholder', 'Caută activități...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                        <input 
                            type="checkbox" 
                            checked={showInactive} 
                            onChange={(e) => setShowInactive(e.target.checked)} 
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('activities.archive_inactive', 'Arhivă (Inactivi)')}</span>
                    </label>

                    <button
                        onClick={async () => {
                            try {
                                const response = await api.get('/admin/activities/export/excel', { responseType: 'blob' })
                                const url = window.URL.createObjectURL(new Blob([response.data]))
                                const link = document.createElement('a')
                                link.href = url
                                link.setAttribute('download', `activitati_${new Date().toISOString().slice(0, 10)}.xlsx`)
                                document.body.appendChild(link)
                                link.click()
                                link.remove()
                                window.URL.revokeObjectURL(url)
                            } catch (error) {
                                showDialog({ type: 'danger', title: t('common.export_error', 'Eroare Export'), message: t('common.error_message') + (error.response?.data?.detail || error.message), confirmText: 'OK', cancelText: null })
                            }
                        }}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('common.export', 'Exportă')}</span>
                    </button>
                    
                    <button
                        onClick={() => {
                            setEditingCategory(null)
                            setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
                            setShowCategoryModal(true)
                        }}
                        className="flex items-center gap-1.5 px-4 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('activities.new_category', 'Categorie Nouă')}</span>
                    </button>
                    
                    <button
                        onClick={() => handleAddActivityToCategory('')}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        {t('activities.new_activity', 'Activitate Nouă')}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KPICard label={t('activities.categories', 'Categorii')} value={displayCategoryList.length} icon={Layers} colorTheme="purple" />
                <KPICard label={t('activities.total_activities', 'Total Activități')} value={allData.length} icon={ActivityIcon} colorTheme="blue" />
                <KPICard label={t('activities.active_count', 'Active')} value={allData.filter(a => a.is_active).length} icon={CheckCircle} colorTheme="green" />
                <KPICard label={t('activities.inactive_count', 'Inactive')} value={allData.filter(a => !a.is_active).length} icon={XCircle} colorTheme="slate" />
            </div>

            {/* DataTable */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    loading={loading}
                    searchable={false}
                    emptyText={t('activities.no_activities', 'Nicio activitate găsită')}
                    defaultSortKey="name"
                />
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {editingCategory ? t('activities.edit_category', 'Editează Categorie') : t('activities.new_category', 'Categorie Nouă')}
                            </h2>
                            <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('common.name', 'Nume')}</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder={t('activities.category_name_placeholder', 'Ex: Finisaje')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('common.color', 'Culoare')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setCategoryForm({ ...categoryForm, color })}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform ${categoryForm.color === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Sortare</label>
                                <input
                                    type="number"
                                    value={categoryForm.sort_order}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryModal(false)}
                                    className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                >
                                    {t('common.cancel', 'Anulează')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                                >
                                    {t('common.save', 'Salvează')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActivityModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {editingActivity ? t('activities.edit_activity', 'Editează Activitate') : t('activities.new_activity', 'Activitate Nouă')}
                            </h2>
                            <button onClick={() => setShowActivityModal(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('common.name', 'Nume')}</label>
                                <input
                                    type="text"
                                    required
                                    value={activityForm.name}
                                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('activities.category', 'Categorie')}</label>
                                    <select
                                        value={activityForm.category_id}
                                        onChange={(e) => setActivityForm({ ...activityForm, category_id: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                    >
                                        <option value="">-- Fără Categorie --</option>
                                        {categoryList.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('activities.unit', 'Unitate')}</label>
                                    <select
                                        value={activityForm.unit_type}
                                        onChange={(e) => setActivityForm({ ...activityForm, unit_type: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                    >
                                        <option value="m²">m²</option>
                                        <option value="m³">m³</option>
                                        <option value="ml">ml</option>
                                        <option value="buc">buc</option>
                                        <option value="ora">oră</option>
                                        <option value="zi">zi</option>
                                        <option value="global">global</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={activityForm.is_active}
                                        onChange={(e) => setActivityForm({ ...activityForm, is_active: e.target.checked })}
                                        className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('common.active', 'Activ')}</span>
                                </label>
                            </div>
                            
                            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowActivityModal(false)}
                                    className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
                                >
                                    {t('common.cancel', 'Anulează')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                                >
                                    {t('common.save', 'Salvează')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
