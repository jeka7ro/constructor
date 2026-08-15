import re

file_path = "frontend/src/pages/admin/ProformaView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I need to add api import if not present
if "import api from" not in content:
    content = content.replace("import { useParams, useNavigate } from 'react-router-dom';", "import { useParams, useNavigate } from 'react-router-dom';\nimport api from '../../services/api';")
    
if "import { Printer, ChevronLeft } from 'lucide-react'" in content:
    content = content.replace("import { Printer, ChevronLeft }", "import { Printer, ChevronLeft, Mail }")
elif "import { Printer" in content and "Mail" not in content:
    content = content.replace("import { Printer", "import { Printer, Mail")

btn_code = """
                    <button onClick={async () => {
                        try {
                            const res = await api.get(`/admin/work-orders/${id}`);
                            await api.post(`/admin/work-orders/${id}/send-email`, { proforma_url: `https://davidechape.pontaj.app/public/proforma/${res.data.token}` });
                            alert('Email trimis cu succes!');
                        } catch (err) {
                            alert('Eroare la trimiterea emailului.');
                        }
                    }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow transition-colors">
                        <Mail className="w-4 h-4" />
                        Trimite Email
                    </button>
"""

# Insert next to the Print button
if "Trimite Email" not in content:
    content = content.replace("<button onClick={() => window.print()}", btn_code + "\n                    <button onClick={() => window.print()")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("ProformaView patched")
