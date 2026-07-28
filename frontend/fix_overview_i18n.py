import json
import os

i18n_dir = 'src/i18n'

translations = {
    'en': {
        'pending_quotes': 'Waiting Quotes'
    },
    'fr': {
        'pending_quotes': 'Devis en attente'
    },
    'ro': {
        'pending_quotes': 'Devize în așteptare'
    },
    'nl': {
        'pending_quotes': 'Wachtende offertes'
    },
    'de': {
        'pending_quotes': 'Wartende Angebote'
    },
    'ru': {
        'pending_quotes': 'Ожидающие сметы'
    }
}

for lang, data in translations.items():
    file_path = os.path.join(i18n_dir, f"{lang}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        if 'overview' not in content:
            content['overview'] = {}
            
        for key, value in data.items():
            content['overview'][key] = value
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"Updated {lang}.json")

