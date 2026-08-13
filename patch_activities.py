import re

file_path = "frontend/src/pages/admin/ActivitiesManagement.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to add hardcoded activities before filteredData is passed to DataTable
hardcoded_injection = """
    // --- Hardcoded System Activities ---
    const systemActivities = [
        {
            id: 'sys-chape',
            name: t('pricing_settings.tab_chape', 'Șapă (Screed)'),
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
        return true;
    });
"""

# Replace the old filteredData logic
old_filtered = """    const filteredData = flatActivities.filter(a => {
        if (!showInactive && !a.is_active) return false;
        return true;
    });"""

content = content.replace(old_filtered, hardcoded_injection)

# We also need to update the category rendering to use displayCategoryList
content = content.replace("const cat = categoryList.find(c => c.id === row.category_id)", "const cat = displayCategoryList.find(c => c.id === row.category_id)")

# We also need to hide edit/delete for system activities
old_actions = """                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleEditActivity(row); }}"""
new_actions = """                <div className="flex items-center gap-2">
                    {row.is_system ? (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {t('common.system', 'Sistem')}
                        </span>
                    ) : (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleEditActivity(row); }}"""

content = content.replace(old_actions, new_actions)

old_actions_end = """                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>"""
new_actions_end = """                        <Trash2 className="w-4 h-4" />
                    </button>
                        </>
                    )}
                </div>"""

content = content.replace(old_actions_end, new_actions_end)

# Also disable toggling status for system activities
old_status = """            render: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(row.id, row.is_active); }}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold transition-colors ${row.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    {row.is_active ? t('common.active', 'Activ') : t('common.inactive', 'Inactiv')}
                </button>
            )"""
new_status = """            render: (row) => (
                <button
                    disabled={row.is_system}
                    onClick={(e) => { e.stopPropagation(); if(!row.is_system) handleToggleActive(row.id, row.is_active); }}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold transition-colors ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} ${!row.is_system ? 'hover:opacity-80 cursor-pointer' : 'cursor-default opacity-80'}`}
                >
                    {row.is_active ? t('common.active', 'Activ') : t('common.inactive', 'Inactiv')}
                </button>
            )"""

content = content.replace(old_status, new_status)

# Update the KPIs to include the system ones
content = content.replace("value={categoryList.length}", "value={displayCategoryList.length}")
content = content.replace("value={totalActivities}", "value={allData.length}")
content = content.replace("value={activeCount}", "value={allData.filter(a => a.is_active).length}")
content = content.replace("value={inactiveCount}", "value={allData.filter(a => !a.is_active).length}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("ActivitiesManagement updated with hardcoded activities.")
