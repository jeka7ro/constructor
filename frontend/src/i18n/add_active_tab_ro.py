import json

with open('ro.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'quotes' not in data:
    data['quotes'] = {}

data['quotes']['active_tab'] = "Activi"
data['quotes']['archived_tab'] = "Arhivă"

with open('ro.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
