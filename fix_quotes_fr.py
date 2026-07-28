import json
import os

files = {
    'fr': 'frontend/src/i18n/fr.json',
    'ro': 'frontend/src/i18n/ro.json',
    'en': 'frontend/src/i18n/en.json'
}

keys = {
    'quotes': {
        'page_title': {'fr': 'Devis', 'ro': 'Devize', 'en': 'Quotes'},
        'page_subtitle': {'fr': 'Gérer les demandes de devis avant planification', 'ro': 'Gestionați cererile de deviz înainte de planificare', 'en': 'Manage quote requests before scheduling'},
        'waiting_list': {'fr': 'Liste des Devis en Attente', 'ro': 'Lista Devize în Așteptare', 'en': 'Waiting Quotes List'},
        'search': {'fr': 'Chercher devis...', 'ro': 'Caută devize...', 'en': 'Search quotes...'},
        'client_address': {'fr': 'Client & Adresse', 'ro': 'Client & Adresă', 'en': 'Client & Address'},
        'surface_thickness': {'fr': 'Surface / Épaisseur', 'ro': 'Suprafață / Grosime', 'en': 'Surface / Thickness'},
        'price': {'fr': 'Prix (€)', 'ro': 'Preț (€)', 'en': 'Price (€)'}
    },
    'datatable': {
        'show': {'fr': 'Afficher', 'ro': 'Afișează', 'en': 'Show'},
        'total': {'fr': 'Total:', 'ro': 'Total:', 'en': 'Total:'},
        'page': {'fr': 'Page', 'ro': 'Pagina', 'en': 'Page'},
        'of': {'fr': 'sur', 'ro': 'din', 'en': 'of'},
        'all': {'fr': 'Tous', 'ro': 'Toate', 'en': 'All'}
    }
}

for lang, filepath in files.items():
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for category, items in keys.items():
        if category not in data:
            data[category] = {}
        for k, v in items.items():
            data[category][k] = v[lang]
            
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Quick fix applied.")
