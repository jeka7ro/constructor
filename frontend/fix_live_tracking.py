import json
import os

i18n_dir = 'src/i18n'

translations = {
    'en': 'LIVE TRACKING',
    'fr': 'SUIVI EN DIRECT',
    'ro': 'URMĂRIRE LIVE',
    'nl': 'LIVE VOLGEN',
    'de': 'LIVE VERFOLGUNG',
    'ru': 'ОТСЛЕЖИВАНИЕ LIVE'
}

for lang, val in translations.items():
    file_path = os.path.join(i18n_dir, f"{lang}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        if 'dashboard' in content:
            content['dashboard']['live_tracking'] = val
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"Updated {lang}.json")
