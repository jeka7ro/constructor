import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# Replace handleClose calls with triggerClose in the main button
old_btn = """                        onClick={handleClose}
                        className={`w-full py-4 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-60 ${canClose ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'}`}"""

new_btn = """                        onClick={() => setShowFinalizeModal(true)}
                        className={`w-full py-4 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-60 ${canClose ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'}`}"""

c = c.replace(old_btn, new_btn)

# Add the modal rendering just before closing the main modal div
old_modal_end = """        </div>
    )
}

function TabInfo"""

modal_code = """
            {showFinalizeModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Quantités réelles</h3>
                            <button onClick={() => setShowFinalizeModal(false)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Veuillez confirmer les quantités réelles avant de finaliser la commande.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Surface coulée réelle (m²)</label>
                                <input 
                                    type="number" min="0" step="0.01" value={actualSurface} onChange={(e) => setActualSurface(e.target.value)}
                                    placeholder="Ex: 120.5"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Épaisseur réelle (cm)</label>
                                <input 
                                    type="number" min="0" step="0.01" value={actualThickness} onChange={(e) => setActualThickness(e.target.value)}
                                    placeholder="Ex: 5"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité de sable réelle (kg)</label>
                                <input 
                                    type="number" min="0" step="0.01" value={actualSand} onChange={(e) => setActualSand(e.target.value)}
                                    placeholder="Ex: 8500"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <button 
                            disabled={!actualSurface || !actualThickness || !actualSand || closing}
                            onClick={() => {
                                setShowFinalizeModal(false)
                                handleClose()
                            }}
                            className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmer et Finaliser
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function TabInfo"""

c = c.replace(old_modal_end, modal_code)

with open(f, 'w') as file:
    file.write(c)

