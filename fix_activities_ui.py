import re

file_path = "frontend/src/pages/admin/ActivitiesManagement.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Restore bubble search in the header
old_header = """            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 w-full">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t('dashboard.activities', 'Activități')}
                    </h1>
                </div>"""
new_header = """            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 w-full">
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
                </div>"""

content = content.replace(old_header, new_header)

# Make filteredData use searchQuery
old_filtered = """    const filteredData = allData.filter(a => {
        if (!showInactive && !a.is_active) return false;
        return true;
    });"""
new_filtered = """    const filteredData = allData.filter(a => {
        if (!showInactive && !a.is_active) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (a.name || '').toLowerCase().includes(query) || (a.unit_type || '').toLowerCase().includes(query);
        }
        return true;
    });"""

content = content.replace(old_filtered, new_filtered)

# Update DataTable wrapper
old_table = """            {/* DataTable */}
            <DataTable
                columns={columns}
                data={filteredData}
                loading={loading}
                searchable={true}
                searchPlaceholder={t('activities.search_placeholder', 'Caută activități...')}
                emptyText={t('activities.no_activities', 'Nicio activitate găsită')}
                defaultSortKey="name"
            />"""
new_table = """            {/* DataTable */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    loading={loading}
                    searchable={false}
                    emptyText={t('activities.no_activities', 'Nicio activitate găsită')}
                    defaultSortKey="name"
                />
            </div>"""

content = content.replace(old_table, new_table)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Activities UI fixed.")
