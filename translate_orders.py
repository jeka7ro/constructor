import json
import os

mapping = {
    "Nu s-au raportat materiale consumate.": "no_materials_reported",
    "Materiale Consumate": "consumed_materials",
    "Acțiuni Adiționale": "additional_actions",
    "Cere Aprobare Finalizare": "request_completion_approval",
    "Finalizat": "completed",
    "Finalizează Comanda": "complete_order",
    "Cerere trimisă": "request_sent",
    "Nu sunt comenzi pentru acest șantier.": "no_orders_site",
    "Materiale": "materials",
    "Anulează": "cancel",
    "Salvează": "save",
    "Nume Material": "material_name",
    "Cantitate": "quantity",
    "Unitate (ex: buc, ml, kg)": "unit_ex",
    "Notă (opțional)": "note_optional"
}

fr_translations = {
    "no_materials_reported": "Aucun matériel signalé.",
    "consumed_materials": "Matériaux Consommés",
    "additional_actions": "Actions Supplémentaires",
    "request_completion_approval": "Demander l'Approbation de Finition",
    "completed": "Terminé",
    "complete_order": "Terminer la Commande",
    "request_sent": "Demande envoyée",
    "no_orders_site": "Aucune commande pour ce chantier.",
    "materials": "Matériaux",
    "cancel": "Annuler",
    "save": "Enregistrer",
    "material_name": "Nom du Matériel",
    "quantity": "Quantité",
    "unit_ex": "Unité (ex: pcs, ml, kg)",
    "note_optional": "Note (optionnel)"
}

i18n_dir = "frontend/src/i18n"
files = ["ro.json", "en.json", "fr.json", "de.json", "nl.json", "ru.json"]

for f in files:
    path = os.path.join(i18n_dir, f)
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as fd:
        data = json.load(fd)
    
    if "worker_ui" not in data:
        data["worker_ui"] = {}
        
    for k, ro_val in mapping.items():
        if f == "ro.json":
            data["worker_ui"][k] = ro_val
        else:
            data["worker_ui"][k] = fr_translations.get(k, ro_val)
            
    with open(path, 'w', encoding='utf-8') as fd:
        json.dump(data, fd, ensure_ascii=False, indent=2)

# Replace in EmployeeWorkOrdersPanel.jsx
fpath = "frontend/src/pages/employee/EmployeeWorkOrdersPanel.jsx"
with open(fpath, 'r', encoding='utf-8') as fd:
    content = fd.read()

for ro_str, k in mapping.items():
    content = content.replace(f">{ro_str}<", f">{{t('worker_ui.{k}')}}<")
    content = content.replace(f"> {ro_str} <", f"> {{t('worker_ui.{k}')}} <")
    content = content.replace(f'"{ro_str}"', f"t('worker_ui.{k}')")
    content = content.replace(f"'{ro_str}'", f"t('worker_ui.{k}')")

with open(fpath, 'w', encoding='utf-8') as fd:
    fd.write(content)

