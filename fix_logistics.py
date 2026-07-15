import json, os, re

# 1. Update i18n JSONs
translations = {
    "en.json": {
        "bases_title": "Bases (Start Points)",
        "bases_desc": "Manage garages/locations where trucks are parked overnight.",
        "add_base": "Add Base",
        "trucks_teams": "Trucks / Teams",
        "bases_table": "Bases (Garages) Table",
        "no_bases": "No bases configured.",
        "search_base": "Search a base...",
        "edit_base": "Edit Base",
        "new_base": "New Base",
        "allocated_trucks": "Trucks Allocated to Base",
        "no_teams": "No teams/trucks."
    },
    "fr.json": {
        "bases_title": "Bases (Points de départ)",
        "bases_desc": "Gérer les garages/emplacements où les camions sont garés pour la nuit.",
        "add_base": "Ajouter une base",
        "trucks_teams": "Camions / Équipes",
        "bases_table": "Tableau des Bases (Garages)",
        "no_bases": "Aucune base configurée.",
        "search_base": "Rechercher une base...",
        "edit_base": "Modifier la base",
        "new_base": "Nouvelle base",
        "allocated_trucks": "Camions alloués à la base",
        "no_teams": "Aucune équipe/camion."
    },
    "ro.json": {
        "bases_title": "Baze (Puncte de plecare)",
        "bases_desc": "Gestionează garajele/locațiile unde sunt parcate camioanele peste noapte.",
        "add_base": "Adaugă Bază",
        "trucks_teams": "Camioane / Echipe",
        "bases_table": "Tabel Baze (Garaje)",
        "no_bases": "Nu există baze configurate.",
        "search_base": "Caută o bază...",
        "edit_base": "Editează Baza",
        "new_base": "Bază Nouă",
        "allocated_trucks": "Camioane Alocate Bazei",
        "no_teams": "Nu există echipe/camioane."
    },
    "nl.json": {
        "bases_title": "Basissen (Startpunten)",
        "bases_desc": "Beheer garages/locaties waar vrachtwagens 's nachts geparkeerd staan.",
        "add_base": "Basis Toevoegen",
        "trucks_teams": "Vrachtwagens / Teams",
        "bases_table": "Basissen (Garages) Tabel",
        "no_bases": "Geen basissen geconfigureerd.",
        "search_base": "Zoek een basis...",
        "edit_base": "Basis Bewerken",
        "new_base": "Nieuwe Basis",
        "allocated_trucks": "Toegewezen Vrachtwagens",
        "no_teams": "Geen teams/vrachtwagens."
    },
    "de.json": {
        "bases_title": "Basen (Startpunkte)",
        "bases_desc": "Verwalten Sie Garagen/Standorte, an denen Lkw über Nacht geparkt sind.",
        "add_base": "Basis Hinzufügen",
        "trucks_teams": "Lkw / Teams",
        "bases_table": "Tabelle Basen (Garagen)",
        "no_bases": "Keine Basen konfiguriert.",
        "search_base": "Basis suchen...",
        "edit_base": "Basis Bearbeiten",
        "new_base": "Neue Basis",
        "allocated_trucks": "Der Basis zugewiesene Lkw",
        "no_teams": "Keine Teams/Lkw."
    }
}

for file, data in translations.items():
    path = f"frontend/src/i18n/{file}"
    if not os.path.exists(path): continue
    with open(path, "r") as f:
        content = json.load(f)
    if "logistics" not in content:
        content["logistics"] = {}
    for k, v in data.items():
        content["logistics"][k] = v
    with open(path, "w") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

