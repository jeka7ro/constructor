import json
import os

langs = {
    "fr": "Street View (Destination)",
    "en": "Street View (Destination)",
    "nl": "Street View (Bestemming)",
    "de": "Street View (Ziel)",
    "ro": "Street View (Destinație)"
}

for lang, translation in langs.items():
    file_path = f"frontend/src/i18n/{lang}.json"
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if "street_view" in data:
            data["street_view"]["title"] = translation
            
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

print("i18n files patched")
