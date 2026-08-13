import re

file_path = "frontend/src/pages/admin/ActivitiesManagement.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will find the 'return (' statement and replace the JSX
start_return = content.find("    return (")

if start_return != -1:
    before_return = content[:start_return]
    
    new_jsx = """    const columns = [
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
                const cat = categoryList.find(c => c.id === row.category_id)
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
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(row.id, row.is_active); }}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold transition-colors ${row.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                </div>
            )
        }
    ]

    const filteredData = flatActivities.filter(a => {
        if (!showInactive && !a.is_active) return false;
        return true;
    });

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 w-full">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t('dashboard.activities', 'Activități')}
                    </h1>
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
                <KPICard label={t('activities.categories', 'Categorii')} value={categoryList.length} icon={Layers} colorTheme="purple" />
                <KPICard label={t('activities.total_activities', 'Total Activități')} value={totalActivities} icon={ActivityIcon} colorTheme="blue" />
                <KPICard label={t('activities.active_count', 'Active')} value={activeCount} icon={CheckCircle} colorTheme="green" />
                <KPICard label={t('activities.inactive_count', 'Inactive')} value={inactiveCount} icon={XCircle} colorTheme="slate" />
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={filteredData}
                loading={loading}
                searchable={true}
                searchPlaceholder={t('activities.search_placeholder', 'Caută activități...')}
                emptyText={t('activities.no_activities', 'Nicio activitate găsită')}
                defaultSortKey="name"
            />

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
"""

    if not before_return.endswith("\n"):
        before_return += "\n"
        
    final_content = before_return + new_jsx
    
    # We must also import DataTable if it's missing
    if "import DataTable" not in final_content:
        import_stmt = "import DataTable from '../../components/DataTable'\n"
        # add it after the last import
        idx = final_content.find("import KPICard")
        if idx != -1:
            final_content = final_content[:idx] + import_stmt + final_content[idx:]
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(final_content)
    print("Successfully rewrote ActivitiesManagement.jsx with DataTable")
else:
    print("Could not find return statement")
