import os
import json
import concurrent.futures
from deep_translator import GoogleTranslator

langs = ['en', 'de', 'fr', 'nl', 'ru']
i18n_dir = '../frontend/src/i18n'

keys_to_translate = {
  "nav.cat_general": "General",
  "nav.planning": "Planning",
  "nav.quotes": "Quotes",
  "nav.logistics": "Logistics",
  "nav.invoicing": "Invoicing",
  "nav.work_orders": "Work Orders",
  "nav.isoflex_history": "Isoflex History",
  "nav.screed_analytics": "Screed Analytics",
  "nav.timesheets": "Timesheets",
  "nav.reports": "Reports",
  "nav.cat_hr": "Human Resources",
  "nav.employees": "Employees",
  "nav.teams": "Teams",
  "nav.leaves": "Leaves",
  "nav.accommodations": "Accommodations",
  "nav.cat_operations": "Operations",
  "nav.sites": "Sites",
  "nav.clients": "Clients",
  "nav.calculator": "Client Calculator",
  "nav.activities": "Activities",
  "nav.site_photos": "Site Photos",
  "nav.cat_logistics": "Logistics & Finance",
  "nav.warehouse": "Warehouse",
  "nav.fleet": "Fleet",
  "nav.transport": "Transport",
  "nav.tracking": "Live Tracking",
  "nav.material_requests": "Material Requests",
  "nav.expenses": "Expenses",
  "nav.cat_support": "Support & Alerts",
  "nav.alerts": "Alerts",
  "nav.emergencies": "Emergencies",
  "nav.complaints": "Complaints",
  "nav.cat_system": "System",
  "nav.users": "Users",
  "nav.pricing_settings": "Pricing",
  "nav.settings": "Settings",
  "nav.notifications": "Notifications",
  "dashboard.pending_quotes": "PENDING QUOTES",
  "dashboard.empty_quotes": "No pending quotes.",
  "dashboard.teams_on_site": "TEAMS ON SITE",
  "live.title": "LIVE GPS",
  "live.legend": "Legend",
  "live.active": "active",
  "source.calculator": "Calculator",
  "source.devis": "Online Quote",
  "source.robaws": "Robaws",
  "source.manual": "Manually Added",
  "status.planning": "In planning"
}

def translate_text(text, target_lang):
    try:
        return GoogleTranslator(source='auto', target=target_lang).translate(text)
    except:
        return text

def set_nested(d, key, val):
    parts = key.split('.')
    for p in parts[:-1]:
        d = d.setdefault(p, {})
    d[parts[-1]] = val

for lang in langs:
    filepath = os.path.join(i18n_dir, f"{lang}.json")
    if not os.path.exists(filepath): continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"Translating for {lang}...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_key = {executor.submit(translate_text, text, lang): key for key, text in keys_to_translate.items()}
        for future in concurrent.futures.as_completed(future_to_key):
            key = future_to_key[future]
            res = future.result()
            set_nested(data, key, res)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Done translations!")
