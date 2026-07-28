import json
import os

i18n_dir = 'src/i18n'

translations = {
    'en': 'Include Fibers',
    'fr': 'Inclure Fibres',
    'ro': 'Include Fibră',
    'nl': 'Vezels insluiten',
    'de': 'Fasern einschließen',
    'ru': 'Включить волокна'
}

for lang, val in translations.items():
    file_path = os.path.join(i18n_dir, f"{lang}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        if 'dashboard' in content and 'quick_create' in content['dashboard']:
            content['dashboard']['quick_create']['include_fiber'] = val
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"Updated {lang}.json")
