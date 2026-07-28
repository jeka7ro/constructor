import os
import re
import json

base_dir = 'frontend/src'
fr_file = 'frontend/src/i18n/fr.json'

with open(fr_file, 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

# Flatten fr_data to easily check keys
def flatten_json(y):
    out = {}
    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + '.')
        else:
            out[name[:-1]] = x
    flatten(y)
    return out

fr_flat = flatten_json(fr_data)

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

missing_keys = {}
for key, default_val in found_keys.items():
    if key not in fr_flat:
        missing_keys[key] = default_val

print(f"Total t() calls found: {len(found_keys)}")
print(f"Total keys missing in fr.json: {len(missing_keys)}")
if missing_keys:
    print("\nSample missing keys (up to 30):")
    for i, (k, v) in enumerate(list(missing_keys.items())[:30]):
        print(f"{k} -> {v}")
