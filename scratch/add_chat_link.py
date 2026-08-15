import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

btn_code = """
                                    <button
                                        type="button"
                                        title="Inserează Link Devis"
                                        onClick={() => setChatMessage(prev => prev + (prev ? '\\n' : '') + `Consultați devizul aici: https://davidechape.pontaj.app/public/proforma/${wo?.token}`)}
                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 rounded-xl px-3 py-2 flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Link className="w-4 h-4" />
                                    </button>
"""

if "Inserează Link Devis" not in content:
    content = content.replace("<button\n                                        type=\"submit\"", btn_code + "\n                                    <button\n                                        type=\"submit\"")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Chat input patched")
