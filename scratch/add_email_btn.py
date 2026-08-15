import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

btn_code = """
                            {/* Buton Previzualizare Email */}
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await api.get(`/admin/work-orders/${id}/email-preview`);
                                        setEmailPreviewContent(res.data.html);
                                        setShowEmailPreview(true);
                                    } catch (err) {
                                        alert(t('work_order_detail.email_err', 'Eroare la previzualizarea emailului.'));
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-[10px] sm:text-xs uppercase tracking-wider shadow-sm transition-colors shrink-0"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                {t('work_order_detail.btn_preview_email', 'Trimite Email')}
                            </button>
"""

# Vrem sa-l inseram langa Badge FACTURAT / NEFACTURAT, de exemplu, inainte de <div className="ml-auto">
search_str = '<div className="ml-auto">'
if "Buton Previzualizare Email" not in content:
    content = content.replace(search_str, btn_code + "\n                            " + search_str)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("WorkOrderDetail patched with button")
