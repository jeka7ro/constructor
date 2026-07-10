import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# 1. Update Header 
# Old: <h2 className="text-sm font-bold text-slate-900 truncate flex-1">{selected.title}</h2>
# New: 
# <div className="flex-1 min-w-0">
#     <h2 className="text-sm font-bold text-slate-900 truncate">
#         {selected.client_name ? `${selected.client_name} - ${selected.title}` : selected.title}
#     </h2>
# </div>
old_header = '<h2 className="text-sm font-bold text-slate-900 truncate flex-1">{selected.title}</h2>'
new_header = '<h2 className="text-sm font-bold text-slate-900 truncate flex-1">{selected.client_name ? `${selected.client_name} - ${selected.title}` : selected.title}</h2>'
c = c.replace(old_header, new_header)

# 2. Extract Documente Atasate chunk
doc_chunk_start = c.find("{/* Planuri/Documente Atasate */}")
doc_chunk_end = c.find("{/* Suprafata si Épaisseur + Sable */}")

if doc_chunk_start != -1 and doc_chunk_end != -1:
    docs_code = c[doc_chunk_start:doc_chunk_end]
    # remove it from its current position
    c = c[:doc_chunk_start] + c[doc_chunk_end:]
    
    # find insertion point (under contact section)
    # let's put it right before {/* Documente/poze admin (instruction) */}
    insert_point = c.find("{/* Documente/poze admin (instruction) */}")
    if insert_point != -1:
        c = c[:insert_point] + docs_code + c[insert_point:]

# 3. Remove Echipa Alocata
team_start = c.find("{/* Echipa si vehicul */}")
team_end = c.find("{/* Contact client */}")
if team_start != -1 and team_end != -1:
    c = c[:team_start] + c[team_end:]

with open(f, 'w') as file:
    file.write(c)
