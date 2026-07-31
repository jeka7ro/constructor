import json
import os

langs = ['fr.json', 'ro.json', 'nl.json', 'de.json', 'en.json']

for lang in langs:
    try:
        with open(lang, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if 'admin_overview' in data:
            if lang == 'fr.json':
                data['admin_overview']['delete_order'] = "Supprimer la commande"
                data['admin_overview']['delete_order_confirm'] = "Êtes-vous sûr de vouloir supprimer la commande"
            elif lang == 'ro.json':
                data['admin_overview']['delete_order'] = "Ștergere Comandă"
                data['admin_overview']['delete_order_confirm'] = "Ești sigur că vrei să ștergi lucrarea"
            elif lang == 'nl.json':
                data['admin_overview']['delete_order'] = "Bestelling verwijderen"
                data['admin_overview']['delete_order_confirm'] = "Weet je zeker dat je de bestelling wilt verwijderen"
            elif lang == 'en.json':
                data['admin_overview']['delete_order'] = "Delete Order"
                data['admin_overview']['delete_order_confirm'] = "Are you sure you want to delete the order"
                
        with open(lang, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        print(f"Fixed {lang}")
    except Exception as e:
        print(f"Error on {lang}: {e}")
