import json

with open('fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'quotes' not in data:
    data['quotes'] = {}

data['quotes']['active_tab'] = "Actifs"
data['quotes']['archived_tab'] = "Corbeille"

with open('fr.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
