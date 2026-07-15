import re
with open("frontend/src/pages/admin/logistics/BasesPage.jsx", "r") as f:
    code = f.read()

# Add useTranslation
if "useTranslation" not in code:
    code = code.replace("import { Link } from 'react-router-dom'", "import { Link } from 'react-router-dom'\nimport { useTranslation } from 'react-i18next'")
    code = code.replace("export default function BasesPage() {", "export default function BasesPage() {\n    const { t } = useTranslation();")

replacements = {
    "Baze (Puncte de plecare)": "{t('logistics.bases_title', 'Baze (Puncte de plecare)')}",
    "Gestionează garajele/locațiile unde sunt parcate camioanele peste noapte.": "{t('logistics.bases_desc', 'Gestionează garajele/locațiile unde sunt parcate camioanele peste noapte.')}",
    "Ajouter Bază": "{t('logistics.add_base', 'Ajouter Bază')}",
    "'Nume Bază'": "t('common.base_name', 'Nume Bază')",
    "'Camioane / Echipe'": "t('logistics.trucks_teams', 'Camioane / Echipe')",
    "'Adresă'": "t('common.address', 'Adresă')",
    "'Coordonate'": "t('common.coordinates', 'Coordonate')",
    "'Acțiuni'": "t('common.actions', 'Acțiuni')",
    "Tabel Baze (Garaje)": "{t('logistics.bases_table', 'Tabel Baze (Garaje)')}",
    '"Nu există baze configurate."': "t('logistics.no_bases', 'Nu există baze configurate.')",
    '"Rechercher une base..."': "t('logistics.search_base', 'Rechercher une base...')",
    "'Éditer Bază' : 'Bază Nouă'": "t('logistics.edit_base', 'Éditer Bază') : t('logistics.new_base', 'Bază Nouă')",
    "Nume *": "{t('common.name', 'Nume')} *",
    "Adresă / Căutare pe Hartă": "{t('common.address_search', 'Adresă / Căutare pe Hartă')}",
    "Detectează": "{t('common.detect', 'Detectează')}",
    "Latitudine GPS": "{t('common.latitude', 'Latitudine GPS')}",
    "Longitudine GPS": "{t('common.longitude', 'Longitudine GPS')}",
    "Camioane Alocate Bazei": "{t('logistics.allocated_trucks', 'Camioane Alocate Bazei')}",
    "Nu există echipe/camioane.": "{t('logistics.no_teams', 'Nu există echipe/camioane.')}",
    "Anulare": "{t('common.cancel', 'Anulare')}",
    "Enregistrer": "{t('common.save', 'Enregistrer')}"
}

for k, v in replacements.items():
    code = code.replace(k, v)

with open("frontend/src/pages/admin/logistics/BasesPage.jsx", "w") as f:
    f.write(code)

