import json, os

translations = {
    "en.json": {
        "at_base": "At Base: ",
        "at_worksite": "At Worksite: "
    },
    "fr.json": {
        "at_base": "À la base: ",
        "at_worksite": "Au chantier: "
    },
    "ro.json": {
        "at_base": "La baza: ",
        "at_worksite": "La lucrare: "
    },
    "nl.json": {
        "at_base": "Op de basis: ",
        "at_worksite": "Op de werkplek: "
    },
    "de.json": {
        "at_base": "Auf der Basis: ",
        "at_worksite": "Auf der Baustelle: "
    }
}

for file, data in translations.items():
    path = f"frontend/src/i18n/{file}"
    if not os.path.exists(path): continue
    with open(path, "r") as f:
        content = json.load(f)
    if "live" not in content:
        content["live"] = {}
    for k, v in data.items():
        content["live"][k] = v
    with open(path, "w") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

