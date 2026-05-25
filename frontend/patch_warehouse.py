import re

file_path = "src/pages/admin/WarehouseManagement.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add selectedSite state
content = content.replace("const [activeTab, setActiveTab] = useState('TOATE')", "const [activeTab, setActiveTab] = useState('TOATE')\n    const [selectedSite, setSelectedSite] = useState('')")

# 2. Add allSites state and fetch
if "const [allSites, setAllSites] = useState([])" not in content:
    content = content.replace("const [activeTab, setActiveTab] = useState('TOATE')", "const [activeTab, setActiveTab] = useState('TOATE')\n    const [allSites, setAllSites] = useState([])")

if "fetchSites" not in content:
    fetch_func = """
    const fetchSites = () => {
        api.get('/admin/sites/', { params: { page_size: 1000, status: 'active' } })
            .then(res => {
                const list = Array.isArray(res.data?.sites) ? res.data.sites : (Array.isArray(res.data) ? res.data : [])
                setAllSites(list)
            })
            .catch(err => console.error(err))
    }
    """
    content = content.replace("const fetchItems = () => {", fetch_func + "\n    const fetchItems = () => {")
    content = content.replace("fetchItems()", "fetchItems()\n        fetchSites()")

# 3. Update fetchItems to pass site_id
content = content.replace("api.get('/admin/warehouse/items', { params: { category: activeTab !== 'TOATE' ? activeTab : undefined } })", "api.get('/admin/warehouse/items', { params: { category: activeTab !== 'TOATE' ? activeTab : undefined, site_id: selectedSite || undefined } })")

# 4. Trigger fetchItems on selectedSite change
if "useEffect(() => {\n        fetchItems()\n    }, [activeTab, selectedSite])" not in content:
    content = content.replace("useEffect(() => {\n        fetchItems()\n    }, [activeTab])", "useEffect(() => {\n        fetchItems()\n    }, [activeTab, selectedSite])")

# 5. Add Dropdown UI near Export Excel
dropdown_ui = """
                        <select 
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                            className="h-10 px-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Magazia Centrală (Toate)</option>
                            {allSites.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
"""
# Find Export Excel button
content = content.replace("<button\n                                onClick={handleExportExcel}", dropdown_ui + "\n                        <button\n                                onClick={handleExportExcel}")

with open(file_path, "w") as f:
    f.write(content)

print("Done updating WarehouseManagement.jsx")
