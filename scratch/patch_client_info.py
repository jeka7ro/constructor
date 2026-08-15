import re
files = ["frontend/src/pages/admin/DevisView.jsx", "frontend/src/pages/admin/ProformaView.jsx"]
for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    replacement = """
                                <div className="font-bold text-slate-800 break-words">{wo.client_name || '—'}</div>
                                {wo.client_email && <div className="text-xs text-slate-500 mt-1 break-all">{wo.client_email}</div>}
                                {(wo.client_phone || wo.client?.phone) && <div className="text-xs text-slate-500 mt-1">{wo.client_phone || wo.client?.phone}</div>}
                                {wo.client?.address && <div className="text-xs text-slate-500 mt-1 break-words">{wo.client.address}</div>}
                                {wo.client_cui && <div className="text-xs text-slate-400 mt-1">N° TVA: {wo.client_cui}</div>}
"""
    search_pattern = r'<div className="font-bold text-slate-800 break-words">\{wo\.client_name \|\| \'\—\'\}</div>\s*\{wo\.client_email && <div className="text-xs text-slate-500 mt-1 break-all">\{wo\.client_email\}</div>\}\s*\{wo\.client_cui && <div className="text-xs text-slate-400 mt-1">N° TVA: \{wo\.client_cui\}</div>\}'
    
    if "wo.client_phone || wo.client?.phone" not in content:
        content = re.sub(search_pattern, replacement.strip(), content)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"{file_path} patched with phone and address.")
