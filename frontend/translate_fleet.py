import re

file_path = "src/pages/admin/FleetManagement.jsx"
with open(file_path, "r") as f:
    content = f.read()

replacements = {
    'Parc Auto': 'fleet.title',
    'Caută vehicul...': 'fleet.search_vehicle',
    'Adaugă Vehicul': 'fleet.add_vehicle',
    'Număr Înmatriculare': 'fleet.license_plate',
    'Marca': 'fleet.brand',
    'Model': 'fleet.model',
    'An Fabricație': 'fleet.year',
    'Status': 'fleet.status',
    'Acțiuni': 'fleet.actions',
    'Activ': 'fleet.active',
    'Inactiv': 'fleet.inactive',
    'În Service': 'fleet.in_service',
    'Editează Vehicul': 'fleet.edit_vehicle',
    'Șterge Vehicul': 'fleet.delete_vehicle',
    'Niciun vehicul găsit': 'fleet.no_vehicles',
    'Salvează Vehicul': 'fleet.save_vehicle',
    'Confirmi ștergerea acestui vehicul?': 'fleet.confirm_delete_vehicle'
}

for ro_str, key in replacements.items():
    content = content.replace(f">{ro_str}<", f">{{t('{key}')}}<")
    content = content.replace(f'placeholder="{ro_str}"', f"placeholder={{t('{key}')}}")
    content = content.replace(f'title="{ro_str}"', f"title={{t('{key}')}}")
    content = content.replace(f"'{ro_str}'", f"t('{key}')")

with open(file_path, "w") as f:
    f.write(content)

print("Done replacing in FleetManagement.jsx")
