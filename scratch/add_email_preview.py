import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Adaugam state pentru modal email
if "showEmailPreview" not in content:
    content = content.replace("const [previewDocIndex, setPreviewDocIndex] = useState(null)", 
"""const [previewDocIndex, setPreviewDocIndex] = useState(null)
    const [showEmailPreview, setShowEmailPreview] = useState(false)
    const [emailPreviewContent, setEmailPreviewContent] = useState('')""")

# Inlocuim butonul Trimite Email cu unul care deschide preview-ul
btn_search = r"<button[^>]*onClick=\{async \(\) => \{[^}]*send-email.*?</button>"
btn_replace = """<button
                                onClick={async () => {
                                    // Fetch email preview
                                    try {
                                        const res = await api.get(`/admin/work-orders/${id}/email-preview`);
                                        setEmailPreviewContent(res.data.html);
                                        setShowEmailPreview(true);
                                    } catch (err) {
                                        alert(t('work_order_detail.email_err', 'Eroare la previzualizarea emailului.'));
                                    }
                                }}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <Mail className="w-5 h-5" />
                                {t('work_order_detail.btn_preview_email', 'Previzualizare Email')}
                            </button>"""
content = re.sub(btn_search, btn_replace, content, flags=re.DOTALL)

# Adaugam Modalul
modal_code = """
            {/* Email Preview Modal */}
            {showEmailPreview && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEmailPreview(false)}></div>
                    <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-500" />
                                Email Preview
                            </h3>
                            <button onClick={() => setShowEmailPreview(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-white" dangerouslySetInnerHTML={{ __html: emailPreviewContent }}></div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setShowEmailPreview(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900">
                                Anulează
                            </button>
                            <button onClick={async () => {
                                try {
                                    await api.post(`/admin/work-orders/${id}/send-email`, { proforma_url: `https://davidechape.pontaj.app/public/proforma/${wo.token}` });
                                    setShowEmailPreview(false);
                                    alert(t('work_order_detail.email_sent', 'Email trimis cu succes!'));
                                } catch (err) {
                                    alert(t('work_order_detail.email_err', 'Eroare la trimiterea emailului.'));
                                }
                            }} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm">
                                Trimite Email
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
"""

if "Email Preview Modal" not in content:
    content = content.replace("{/* Attachment Preview Modal */}", modal_code + "\n            {/* Attachment Preview Modal */}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("WorkOrderDetail patched with Email Preview")
