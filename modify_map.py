import os

file_path = "frontend/src/components/MiniLiveTrackingMap.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Add imports for Expand, Shrink
content = content.replace("from 'lucide-react'", "from 'lucide-react'\nimport { Expand, Shrink } from 'lucide-react'")

# Add isMapFull state
content = content.replace("const [connected, setConnected] = useState(true);", "const [connected, setConnected] = useState(true);\n  const [isMapFull, setIsMapFull] = useState(false);")

# Update zoomControl and scrollWheelZoom
content = content.replace("zoomControl={false}", "zoomControl={true}")
content = content.replace("scrollWheelZoom={false}", "scrollWheelZoom={true}")

# Update Map container class to support fullscreen
content = content.replace(
    'className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700"',
    'className={`flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 ${isMapFull ? "fixed inset-0 z-50 rounded-none border-none" : "w-full h-full"}`}'
)

# Add Fullscreen toggle button next to RefreshCw
content = content.replace(
    '<button onClick={fetchLive} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">',
    """<button onClick={() => setIsMapFull(!isMapFull)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mr-2">
                {isMapFull ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            </button>
            <button onClick={fetchLive} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">"""
)

# Add Legend Card inside flex-1 relative
legend_card = """        {/* Legend Card */}
        <div className="absolute top-4 left-4 z-[1000] w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[80%]">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>{t('logistics.legend', 'Legendă Echipe & Utilaje')}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{vehicles.length}</span>
            </div>
            <div className="overflow-y-auto p-2 space-y-2">
                {vehicles.map(v => {
                    const isMoving = v.speed > 0;
                    return (
                        <div key={v.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                            <div className="relative">
                                {v.avatar_url ? (
                                    <img src={v.avatar_url.startsWith('http') ? v.avatar_url : `http://davidechape.localhost:5678${v.avatar_url}`} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: v.team_color }} />
                                ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm" style={{ backgroundColor: v.team_color, borderColor: 'white' }}>
                                        <div className="text-white font-bold text-xs">{v.name.substring(0, 2).toUpperCase()}</div>
                                    </div>
                                )}
                                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isMoving ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{v.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between mt-0.5">
                                    <span className={isMoving ? 'text-green-600 font-medium' : ''}>
                                        {isMoving ? `${Math.round(v.speed)} km/h` : t('live.stopped', 'Staționează')}
                                    </span>
                                    {v.distance_today != null && (
                                        <span className="text-slate-400 font-medium">{v.distance_today} km {t('live.today', 'azi')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
"""

content = content.replace("<MapContainer", legend_card + "\n        <MapContainer")

with open(file_path, "w") as f:
    f.write(content)
