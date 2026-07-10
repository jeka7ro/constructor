import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

# Fix header in details page
old_header = '<h2 className="text-sm font-bold text-slate-900 truncate flex-1">{selected.client_name ? `${selected.client_name} - ${selected.title}` : selected.title}</h2>'
new_header = '<h2 className="text-sm font-bold text-slate-900 truncate flex-1">{selected.client_name || "Client Necunoscut"}</h2>'
c = c.replace(old_header, new_header)

# Fix in OrderCard (even though it's not rendered, just to be safe)
old_card_title = '{order.title}'
new_card_title = '{order.client_name || "Client Necunoscut"}'
c = c.replace(old_card_title, new_card_title)

with open(f, 'w') as file:
    file.write(c)
