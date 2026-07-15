import re

with open("backend/app/api/admin_logistics.py", "r") as f:
    content = f.read()

# Add bulk queries for clients and sites
bulk_queries_old = """    # --- END PERF OPTIMIZATION ---

    for team in teams:"""

bulk_queries_new = """    all_client_ids = {w.client_id for w in wos if w.client_id}
    clients_dict = {}
    if all_client_ids:
        from app.models import Client
        c_list = db.query(Client).filter(Client.id.in_(list(all_client_ids))).all()
        clients_dict = {c.id: c for c in c_list}
        
    all_site_ids = {w.site_id for w in wos if w.site_id}
    sites_dict = {}
    if all_site_ids:
        s_list = db.query(ConstructionSite).filter(ConstructionSite.id.in_(list(all_site_ids))).all()
        sites_dict = {s.id: s for s in s_list}

    # --- END PERF OPTIMIZATION ---

    for team in teams:"""

content = content.replace(bulk_queries_old, bulk_queries_new, 1)

# Fix N+1 queries in the loop
old_client_lookup = """                # Resolve Client Name explicitly ignoring title
                w_name = w.client_name
                if not w_name and w.client_id:
                    from app.models import Client
                    c = db.query(Client).filter(Client.id == w.client_id).first()
                    if c:
                        w_name = c.name
                if not w_name:
                    w_name = "UNKNOWN_CLIENT_LOGISTICS\""""

old_client_lookup2 = """                # Resolve Client Name explicitly ignoring title
                w_name = w.client_name
                if not w_name and w.client_id:
                    from app.models import Client
                    c = db.query(Client).filter(Client.id == w.client_id).first()
                    if c:
                        w_name = c.name
                if not w_name:
                    w_name = "Client necunoscut\""""

new_client_lookup = """                # Resolve Client Name explicitly ignoring title
                w_name = w.client_name
                if not w_name and w.client_id:
                    c = clients_dict.get(w.client_id)
                    if c:
                        w_name = c.name
                if not w_name:
                    w_name = "UNKNOWN_CLIENT_LOGISTICS\""""

if old_client_lookup2 in content:
    content = content.replace(old_client_lookup2, new_client_lookup)
elif old_client_lookup in content:
    content = content.replace(old_client_lookup, new_client_lookup)

old_site_lookup = """                # Try from ConstructionSite if available
                if w.site_id:
                    s = db.query(ConstructionSite).filter(ConstructionSite.id == w.site_id).first()
                    if s and s.latitude and s.longitude:"""

new_site_lookup = """                # Try from ConstructionSite if available
                if w.site_id:
                    s = sites_dict.get(w.site_id)
                    if s and s.latitude and s.longitude:"""
content = content.replace(old_site_lookup, new_site_lookup)

with open("backend/app/api/admin_logistics.py", "w") as f:
    f.write(content)

print("Applied PERF optimizations 2 to admin_logistics.py")

