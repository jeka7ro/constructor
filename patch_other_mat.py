import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# I need to wrap everything inside the Section "Autres matériaux consommés" in a conditional.
# Let's find the Section tag
start_tag = '<Section label="Autres matériaux consommés">'
if start_tag not in c:
    # try the original string
    start_tag = '<Section label="Alte Matériaux Consumate">'

# Find exactly where it starts
start_idx = c.find(start_tag)
if start_idx != -1:
    content_start = start_idx + len(start_tag)
    # find where this Section ends
    end_idx = c.find('</Section>', content_start)
    if end_idx != -1:
        # Extract the content inside the Section
        section_content = c[content_start:end_idx]
        
        # New content wrapped in the showOtherMaterials condition and adding the toggle button
        new_section_content = f"""
                <div className="mb-3 mt-2">
                    <button 
                        onClick={{() => setShowOtherMaterials(!showOtherMaterials)}}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
                    >
                        {{showOtherMaterials ? "Masquer les autres matériaux" : "Ajouter d'autres matériaux consommés"}}
                    </button>
                </div>
                {{showOtherMaterials && (
                    <div className="w-full animate-in slide-in-from-top-2 duration-200">
                        {section_content}
                    </div>
                )}}
"""
        
        c = c[:content_start] + new_section_content + c[end_idx:]

with open(f, 'w') as file:
    file.write(c)
