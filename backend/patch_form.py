import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Add state hooks
state_hooks = """    const [showFullClient, setShowFullClient] = useState(false);
    const [showFullSite, setShowFullSite] = useState(false);

    useEffect(() => {
        if (!isEdit) {
            setShowFullClient(true);
            setShowFullSite(true);
        }
    }, [isEdit]);
"""
if "showFullClient" not in content:
    content = content.replace("const [detecting, setDetecting] = useState(false)", "const [detecting, setDetecting] = useState(false)\n" + state_hooks)


# 2. Modify Client section rendering
# Find: {/* 2. Client */}
client_start_marker = "{/* 2. Client */}"
client_end_marker = """<div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>"""

client_block_regex = re.compile(re.escape(client_start_marker) + r"(.*?)" + re.escape(client_end_marker), re.DOTALL)
match = client_block_regex.search(content)
if match:
    original_client_block = match.group(1)
    
    new_client_block = """
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-500" />
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('work_order_form.client', 'Client')}</h3>
                                </div>
                                {isEdit && !showFullClient && (
                                    <button type="button" onClick={() => setShowFullClient(true)} className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors">
                                        <Edit2 className="w-3 h-3" /> {t('common.edit', 'Modifică')}
                                    </button>
                                )}
                            </div>

                            {!showFullClient ? (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold">{form.client_name ? form.client_name.charAt(0).toUpperCase() : '?'}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{form.client_name || 'Nume Nesetat'}</h4>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                {form.client_phone && <span>📞 {form.client_phone}</span>}
                                                {form.client_email && <span>✉️ {form.client_email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        {[['existing', t('common.existing', 'Client Existent')], ['new', t('common.new', 'Client Nou')]].map(([m, label]) => (
                                            <button key={m} onClick={() => setForm(p => ({ ...p, client_mode: m }))}
                                                className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.client_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                                {label}
                                            </button>
                                        ))}
                                        {isEdit && (
                                            <button type="button" onClick={() => setShowFullClient(false)} className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                                                Anulează
                                            </button>
                                        )}
                                    </div>
                                    {/* Original form contents */}
                                    <div className="mt-4">
""" + original_client_block.replace("<div>\n                            <div className=\"flex items-center gap-2 mb-3\">", "").replace("<div>\r\n                            <div className=\"flex items-center gap-2 mb-3\">", "") + """
                                    </div>
                                </div>
                            )}
                        </div>
"""
    
    # We must be careful not to double-replace. Wait, I should write this robustly.
    # Actually, I'll just use a small custom logic.
