import re

file_path = "src/pages/admin/AccommodationsManagement.jsx"
with open(file_path, "r") as f:
    content = f.read()

replacements = {
    'Cazări': 'accommodations.title',
    'Caută cazare...': 'accommodations.search',
    'Adaugă Cazare': 'accommodations.add',
    'Nume Cazare': 'accommodations.name',
    'Adresă': 'accommodations.address',
    'Capacitate (Persoane)': 'accommodations.capacity',
    'Șantier Asociat': 'accommodations.site',
    'Fără Șantier': 'accommodations.no_site',
    'Cost/Lună': 'accommodations.cost',
    'Cost': 'accommodations.cost_short',
    'Total Angajați': 'accommodations.total_employees',
    'Locuri Disponibile': 'accommodations.available_spots',
    'Afișează Angajați': 'accommodations.show_employees',
    'Editează Cazare': 'accommodations.edit',
    'Șterge Cazare': 'accommodations.delete',
    'Nicio cazare găsită': 'accommodations.no_accommodations',
    'Salvează Cazare': 'accommodations.save',
    'Confirmi ștergerea acestei cazări?': 'accommodations.confirm_delete',
    'Repartizează Angajați': 'accommodations.assign_employees',
    'Angajați Repartizați': 'accommodations.assigned_employees',
    'Niciun angajat repartizat': 'accommodations.no_employees_assigned'
}

for ro_str, key in replacements.items():
    content = content.replace(f">{ro_str}<", f">{{t('{key}')}}<")
    content = content.replace(f'placeholder="{ro_str}"', f"placeholder={{t('{key}')}}")
    content = content.replace(f'title="{ro_str}"', f"title={{t('{key}')}}")
    content = content.replace(f"'{ro_str}'", f"t('{key}')")

with open(file_path, "w") as f:
    f.write(content)

print("Done replacing in AccommodationsManagement.jsx")
