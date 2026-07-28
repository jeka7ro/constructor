import os
import re
import json
import time
import sys
from deep_translator import GoogleTranslator

base_dir = '../frontend/src'
i18n_dir = '../frontend/src/i18n'
langs = ['ro', 'en', 'fr', 'de', 'nl', 'ru']

# 1. Extract all t('key', 'default')
t_pattern = re.compile(r"t\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)")
found_keys = {}

for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = t_pattern.findall(content)
                for key, default_val in matches:
                    found_keys[key] = default_val

print(f"Found {len(found_keys)} total keys in source code.")

def set_nested_value(d, key_path, value):
    keys = key_path.split('.')
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    d[keys[-1]] = value

def get_nested_value(d, key_path):
    keys = key_path.split('.')
    current = d
    for k in keys:
        if not isinstance(current, dict) or k not in current:
            return None
        current = current[k]
    return current

def translate_text(text, target_lang):
    if not text.strip(): return text
    if target_lang == 'ro' and text.strip().lower() in ['da', 'nu']: return text
    
    lang_map = {'ro': 'ro', 'en': 'en', 'fr': 'fr', 'de': 'de', 'nl': 'nl', 'ru': 'ru'}
    tgt = lang_map.get(target_lang, 'en')
    
    try:
        translated = GoogleTranslator(source='auto', target=tgt).translate(text)
        return translated
    except Exception as e:
        print(f"Error translating '{text}' to {tgt}: {e}")
        return text

# 2. Process each language file
for lang in langs:
    filepath = os.path.join(i18n_dir, f"{lang}.json")
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    added_count = 0
    print(f"\nProcessing {lang}...")
    
    for key_path, default_val in found_keys.items():
        existing_val = get_nested_value(data, key_path)
        if existing_val is None:
            translated = translate_text(default_val, lang)
            set_nested_value(data, key_path, translated)
            added_count += 1
            if added_count % 50 == 0:
                print(f"  Translated {added_count} keys for {lang}...")
            time.sleep(0.05) # Be nice to the API
            
    if added_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Saved {added_count} new translations to {lang}.json")
    else:
        print(f"No missing translations for {lang}.")

print("\nDone translating all files!")
