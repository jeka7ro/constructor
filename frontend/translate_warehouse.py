import re

file_path = "src/pages/admin/WarehouseManagement.jsx"
with open(file_path, "r") as f:
    content = f.read()

replacements = {
    'Caută articol...': 'warehouse.search_item',
    'Toate': 'warehouse.all',
    'Scule': 'warehouse.tools',
    'Consumabile': 'warehouse.consumables',
    'Structură': 'warehouse.structure',
    'Combustibil': 'warehouse.fuel',
    'Export Excel': 'warehouse.export_excel',
    'Articol Nou': 'warehouse.new_item',
    'ARTICOL': 'warehouse.col_item',
    'U.M.': 'warehouse.col_unit',
    'INTRĂRI': 'warehouse.col_in',
    'IEȘIRI': 'warehouse.col_out',
    'STOC CURENT': 'warehouse.col_stock',
    'ACȚIUNI': 'warehouse.col_actions',
    'Repartizată': 'warehouse.assigned',
    'În Magazie': 'warehouse.in_stock',
    'Defect': 'warehouse.defective',
    'Marchează funcțională': 'warehouse.mark_functional',
    'Marchează defectă': 'warehouse.mark_defective',
    'Editează': 'warehouse.edit',
    'Șterge': 'warehouse.delete',
    'Magazie': 'warehouse.title',
    'Nu s-au găsit articole.': 'warehouse.no_items',
    'Preluare date...': 'warehouse.loading',
    'Adaugă Articol Nou': 'warehouse.add_new_item',
    'Nume Articol': 'warehouse.item_name',
    'Ex: Bormașină, Ciment...': 'warehouse.item_name_placeholder',
    'Unitate de măsură': 'warehouse.unit_of_measure',
    'Ex: buc, kg, L...': 'warehouse.unit_placeholder',
    'Salvează Articol': 'warehouse.save_item',
    'Afișează': 'warehouse.show',
    'Pagina': 'warehouse.page',
    'din': 'warehouse.of',
    'Istoric Tranzacții': 'warehouse.tx_history',
    'Dată': 'warehouse.date',
    'Tip': 'warehouse.type',
    'Cantitate': 'warehouse.quantity',
    'Șantier': 'warehouse.site',
    'Destinatar': 'warehouse.recipient',
    'Operator': 'warehouse.operator',
    'Niciun rezultat găsit': 'warehouse.no_results',
    'Înapoi la Magazie': 'warehouse.back_to_warehouse',
    'Selectează Șantier': 'warehouse.select_site',
    'Selectează Angajat': 'warehouse.select_employee',
    'Confirmi ștergerea acestui articol? Toate tranzacțiile asociate vor fi șterse!': 'warehouse.confirm_delete_item'
}

for ro_str, key in replacements.items():
    # Replace in JSX text: >Text< -> >{t('key')}<
    content = content.replace(f">{ro_str}<", f">{{t('{key}')}}<")
    # Replace in placeholders: placeholder="Text" -> placeholder={t('key')}
    content = content.replace(f'placeholder="{ro_str}"', f"placeholder={{t('{key}')}}")
    # Replace in title attribute: title="Text" -> title={t('key')}
    content = content.replace(f'title="{ro_str}"', f"title={{t('{key}')}}")
    # Replace in standard string assignments (if any)
    content = content.replace(f"'{ro_str}'", f"t('{key}')")

with open(file_path, "w") as f:
    f.write(content)

print("Done replacing in WarehouseManagement.jsx")
