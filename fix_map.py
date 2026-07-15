import os

file_path = "frontend/src/components/MiniLiveTrackingMap.jsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace the flex row layout back to flex-1 relative
old_layout = """      <div className="flex-1 flex flex-row overflow-hidden relative">
        {loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
        )}
        {/* Legend Sidebar */}
        <div className="w-72 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-[10]">
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
        
        {/* Map Area */}
        <div className="flex-1 relative">"""

new_layout = """      <div className="flex-1 relative">
        {loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
        )}
        {/* Floating Legend right aligned */}
        <div className="absolute top-4 right-4 z-[1000] w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-auto flex flex-col gap-3 max-h-[calc(100%-2rem)] overflow-y-auto">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                    <Truck className="w-3 h-3" /> {t('logistics.legend', 'Legendă')} ({vehicles.length})
                </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
                {vehicles.map(v => {
                    const isMoving = v.speed > 0;
                    return (
                        <div key={v.id} className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-2 first:border-0 first:pt-0">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="relative shrink-0">
                                        <div className="w-3 h-3 rounded-full shadow-sm shrink-0 border border-white/50" style={{ backgroundColor: v.team_color }}></div>
                                    </div>
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={v.name}>{v.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {v.distance_today != null && (
                                        <span className="text-[10px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                            {v.distance_today}km
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 pl-5">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="text-[10px] font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5 text-slate-500 italic">
                                        {isMoving ? `${Math.round(v.speed)} km/h` : t('live.stopped', "À l'arrêt")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>"""

content = content.replace(old_layout, new_layout)
content = content.replace("from 'lucide-react'\nimport { Expand, Shrink }", "from 'lucide-react'\nimport { Expand, Shrink, Truck }")

# And remove the closing div I added for the map area
old_end = """        </MapContainer>
        </div>
      </div>"""
new_end = """        </MapContainer>
      </div>"""
content = content.replace(old_end, new_end)

with open(file_path, "w") as f:
    f.write(content)
