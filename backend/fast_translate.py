import os
import re
import json
import time
import concurrent.futures
from deep_translator import GoogleTranslator

base_dir = '../frontend/src'
i18n_dir = '../frontend/src/i18n'
langs = ['ro', 'fr']

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

def translate_batch(items, target_lang):
    translator = GoogleTranslator(source='auto', target=target_lang)
    results = {}
    for key_path, text in items:
        if not text.strip():
            results[key_path] = text
            continue
        if target_lang == 'ro' and text.strip().lower() in ['da', 'nu']:
            results[key_path] = text
            continue
            
        try:
            translated = translator.translate(text)
            results[key_path] = translated
        except Exception as e:
            print(f"Error on '{text}': {e}")
            results[key_path] = text
            time.sleep(1) # Backoff
    return results

# Process languages
for lang in langs:
    filepath = os.path.join(i18n_dir, f"{lang}.json")
    if not os.path.exists(filepath): continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    missing_items = []
    for key_path, default_val in found_keys.items():
        if get_nested_value(data, key_path) is None:
            missing_items.append((key_path, default_val))
            
    if not missing_items:
        print(f"No missing for {lang}")
        continue
        
    print(f"Translating {len(missing_items)} keys for {lang}...")
    
    # Split into chunks of 50 to process sequentially but without massive sleep
    chunk_size = 50
    chunks = [missing_items[i:i + chunk_size] for i in range(0, len(missing_items), chunk_size)]
    
    added_count = 0
    for chunk in chunks:
        res = translate_batch(chunk, lang)
        for k, v in res.items():
            set_nested_value(data, k, v)
        added_count += len(res)
        print(f"  Done {added_count}/{len(missing_items)}")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {added_count} to {lang}.json")

print("Finished RO and FR!")
