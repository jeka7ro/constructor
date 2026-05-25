import json
import os

langs = {
    'ro': {
        'warehouse': {
            'search_item': 'Caută articol...', 'all': 'Toate', 'tools': 'Scule', 'consumables': 'Consumabile',
            'structure': 'Structură', 'fuel': 'Combustibil', 'export_excel': 'Export Excel', 'new_item': 'Articol Nou',
            'col_item': 'ARTICOL', 'col_unit': 'U.M.', 'col_in': 'INTRĂRI', 'col_out': 'IEȘIRI', 'col_stock': 'STOC CURENT',
            'col_actions': 'ACȚIUNI', 'assigned': 'Repartizată', 'in_stock': 'În Magazie', 'defective': 'Defect',
            'mark_functional': 'Marchează funcțională', 'mark_defective': 'Marchează defectă', 'edit': 'Editează',
            'delete': 'Șterge', 'title': 'Magazie', 'no_items': 'Nu s-au găsit articole.', 'loading': 'Preluare date...',
            'add_new_item': 'Adaugă Articol Nou', 'item_name': 'Nume Articol', 'item_name_placeholder': 'Ex: Bormașină, Ciment...',
            'unit_of_measure': 'Unitate de măsură', 'unit_placeholder': 'Ex: buc, kg, L...', 'save_item': 'Salvează Articol',
            'show': 'Afișează', 'page': 'Pagina', 'of': 'din', 'tx_history': 'Istoric Tranzacții', 'date': 'Dată',
            'type': 'Tip', 'quantity': 'Cantitate', 'site': 'Șantier', 'recipient': 'Destinatar', 'operator': 'Operator',
            'no_results': 'Niciun rezultat găsit', 'back_to_warehouse': 'Înapoi la Magazie', 'select_site': 'Selectează Șantier',
            'select_employee': 'Selectează Angajat', 'confirm_delete_item': 'Confirmi ștergerea acestui articol?'
        },
        'fleet': {
            'title': 'Parc Auto', 'search_vehicle': 'Caută vehicul...', 'add_vehicle': 'Adaugă Vehicul',
            'license_plate': 'Număr Înmatriculare', 'brand': 'Marca', 'model': 'Model', 'year': 'An Fabricație',
            'status': 'Status', 'actions': 'Acțiuni', 'active': 'Activ', 'inactive': 'Inactiv', 'in_service': 'În Service',
            'edit_vehicle': 'Editează Vehicul', 'delete_vehicle': 'Șterge Vehicul', 'no_vehicles': 'Niciun vehicul găsit',
            'save_vehicle': 'Salvează Vehicul', 'confirm_delete_vehicle': 'Confirmi ștergerea acestui vehicul?'
        },
        'accommodations': {
            'title': 'Cazări', 'search': 'Caută cazare...', 'add': 'Adaugă Cazare', 'name': 'Nume Cazare',
            'address': 'Adresă', 'capacity': 'Capacitate (Persoane)', 'site': 'Șantier Asociat', 'no_site': 'Fără Șantier',
            'cost': 'Cost/Lună', 'cost_short': 'Cost', 'total_employees': 'Total Angajați', 'available_spots': 'Locuri Disponibile',
            'show_employees': 'Afișează Angajați', 'edit': 'Editează Cazare', 'delete': 'Șterge Cazare',
            'no_accommodations': 'Nicio cazare găsită', 'save': 'Salvează Cazare', 'confirm_delete': 'Confirmi ștergerea?',
            'assign_employees': 'Repartizează Angajați', 'assigned_employees': 'Angajați Repartizați', 'no_employees_assigned': 'Niciun angajat'
        }
    },
    'en': {
        'warehouse': {
            'search_item': 'Search item...', 'all': 'All', 'tools': 'Tools', 'consumables': 'Consumables',
            'structure': 'Structure', 'fuel': 'Fuel', 'export_excel': 'Export Excel', 'new_item': 'New Item',
            'col_item': 'ITEM', 'col_unit': 'UNIT', 'col_in': 'IN', 'col_out': 'OUT', 'col_stock': 'CURRENT STOCK',
            'col_actions': 'ACTIONS', 'assigned': 'Assigned', 'in_stock': 'In Stock', 'defective': 'Defective',
            'mark_functional': 'Mark functional', 'mark_defective': 'Mark defective', 'edit': 'Edit',
            'delete': 'Delete', 'title': 'Warehouse', 'no_items': 'No items found.', 'loading': 'Loading...',
            'add_new_item': 'Add New Item', 'item_name': 'Item Name', 'item_name_placeholder': 'e.g., Drill, Cement...',
            'unit_of_measure': 'Unit of measure', 'unit_placeholder': 'e.g., pcs, kg, L...', 'save_item': 'Save Item',
            'show': 'Show', 'page': 'Page', 'of': 'of', 'tx_history': 'Transaction History', 'date': 'Date',
            'type': 'Type', 'quantity': 'Quantity', 'site': 'Site', 'recipient': 'Recipient', 'operator': 'Operator',
            'no_results': 'No results found', 'back_to_warehouse': 'Back to Warehouse', 'select_site': 'Select Site',
            'select_employee': 'Select Employee', 'confirm_delete_item': 'Are you sure you want to delete this item?'
        },
        'fleet': {
            'title': 'Fleet', 'search_vehicle': 'Search vehicle...', 'add_vehicle': 'Add Vehicle',
            'license_plate': 'License Plate', 'brand': 'Brand', 'model': 'Model', 'year': 'Year',
            'status': 'Status', 'actions': 'Actions', 'active': 'Active', 'inactive': 'Inactive', 'in_service': 'In Service',
            'edit_vehicle': 'Edit Vehicle', 'delete_vehicle': 'Delete Vehicle', 'no_vehicles': 'No vehicles found',
            'save_vehicle': 'Save Vehicle', 'confirm_delete_vehicle': 'Are you sure you want to delete this vehicle?'
        },
        'accommodations': {
            'title': 'Accommodations', 'search': 'Search...', 'add': 'Add Accommodation', 'name': 'Name',
            'address': 'Address', 'capacity': 'Capacity', 'site': 'Associated Site', 'no_site': 'No Site',
            'cost': 'Cost/Month', 'cost_short': 'Cost', 'total_employees': 'Total Employees', 'available_spots': 'Available Spots',
            'show_employees': 'Show Employees', 'edit': 'Edit', 'delete': 'Delete',
            'no_accommodations': 'No accommodations found', 'save': 'Save', 'confirm_delete': 'Confirm delete?',
            'assign_employees': 'Assign Employees', 'assigned_employees': 'Assigned Employees', 'no_employees_assigned': 'No employees'
        }
    },
    'de': {
        'warehouse': {
            'search_item': 'Artikel suchen...', 'all': 'Alle', 'tools': 'Werkzeuge', 'consumables': 'Verbrauchsmaterial',
            'structure': 'Struktur', 'fuel': 'Kraftstoff', 'export_excel': 'Excel Export', 'new_item': 'Neuer Artikel',
            'col_item': 'ARTIKEL', 'col_unit': 'EINHEIT', 'col_in': 'EINGANG', 'col_out': 'AUSGANG', 'col_stock': 'AKTUELLER BESTAND',
            'col_actions': 'AKTIONEN', 'assigned': 'Zugewiesen', 'in_stock': 'Auf Lager', 'defective': 'Defekt',
            'mark_functional': 'Als funktional markieren', 'mark_defective': 'Als defekt markieren', 'edit': 'Bearbeiten',
            'delete': 'Löschen', 'title': 'Lager', 'no_items': 'Keine Artikel gefunden.', 'loading': 'Lädt...',
            'add_new_item': 'Neuen Artikel hinzufügen', 'item_name': 'Artikelname', 'item_name_placeholder': 'z.B. Bohrer, Zement...',
            'unit_of_measure': 'Maßeinheit', 'unit_placeholder': 'z.B. Stk, kg, L...', 'save_item': 'Artikel speichern',
            'show': 'Zeigen', 'page': 'Seite', 'of': 'von', 'tx_history': 'Transaktionsverlauf', 'date': 'Datum',
            'type': 'Typ', 'quantity': 'Menge', 'site': 'Baustelle', 'recipient': 'Empfänger', 'operator': 'Bediener',
            'no_results': 'Keine Ergebnisse gefunden', 'back_to_warehouse': 'Zurück zum Lager', 'select_site': 'Baustelle auswählen',
            'select_employee': 'Mitarbeiter auswählen', 'confirm_delete_item': 'Diesen Artikel wirklich löschen?'
        },
        'fleet': {
            'title': 'Fuhrpark', 'search_vehicle': 'Fahrzeug suchen...', 'add_vehicle': 'Fahrzeug hinzufügen',
            'license_plate': 'Kennzeichen', 'brand': 'Marke', 'model': 'Modell', 'year': 'Baujahr',
            'status': 'Status', 'actions': 'Aktionen', 'active': 'Aktiv', 'inactive': 'Inaktiv', 'in_service': 'In Wartung',
            'edit_vehicle': 'Fahrzeug bearbeiten', 'delete_vehicle': 'Fahrzeug löschen', 'no_vehicles': 'Keine Fahrzeuge gefunden',
            'save_vehicle': 'Fahrzeug speichern', 'confirm_delete_vehicle': 'Dieses Fahrzeug wirklich löschen?'
        },
        'accommodations': {
            'title': 'Unterkünfte', 'search': 'Suchen...', 'add': 'Unterkunft hinzufügen', 'name': 'Name',
            'address': 'Adresse', 'capacity': 'Kapazität', 'site': 'Zugehörige Baustelle', 'no_site': 'Keine Baustelle',
            'cost': 'Kosten/Monat', 'cost_short': 'Kosten', 'total_employees': 'Mitarbeiter gesamt', 'available_spots': 'Verfügbare Plätze',
            'show_employees': 'Mitarbeiter anzeigen', 'edit': 'Bearbeiten', 'delete': 'Löschen',
            'no_accommodations': 'Keine Unterkünfte gefunden', 'save': 'Speichern', 'confirm_delete': 'Wirklich löschen?',
            'assign_employees': 'Mitarbeiter zuweisen', 'assigned_employees': 'Zugewiesene Mitarbeiter', 'no_employees_assigned': 'Keine Mitarbeiter'
        }
    },
    'fr': {
        'warehouse': {
            'search_item': 'Chercher un article...', 'all': 'Tous', 'tools': 'Outils', 'consumables': 'Consommables',
            'structure': 'Structure', 'fuel': 'Carburant', 'export_excel': 'Exporter Excel', 'new_item': 'Nouvel Article',
            'col_item': 'ARTICLE', 'col_unit': 'UNITÉ', 'col_in': 'ENTRÉE', 'col_out': 'SORTIE', 'col_stock': 'STOCK ACTUEL',
            'col_actions': 'ACTIONS', 'assigned': 'Assigné', 'in_stock': 'En Stock', 'defective': 'Défectueux',
            'mark_functional': 'Marquer fonctionnel', 'mark_defective': 'Marquer défectueux', 'edit': 'Modifier',
            'delete': 'Supprimer', 'title': 'Entrepôt', 'no_items': 'Aucun article trouvé.', 'loading': 'Chargement...',
            'add_new_item': 'Ajouter Nouvel Article', 'item_name': 'Nom de l\'article', 'item_name_placeholder': 'ex: Perceuse, Ciment...',
            'unit_of_measure': 'Unité de mesure', 'unit_placeholder': 'ex: pcs, kg, L...', 'save_item': 'Enregistrer l\'article',
            'show': 'Afficher', 'page': 'Page', 'of': 'sur', 'tx_history': 'Historique des transactions', 'date': 'Date',
            'type': 'Type', 'quantity': 'Quantité', 'site': 'Chantier', 'recipient': 'Destinataire', 'operator': 'Opérateur',
            'no_results': 'Aucun résultat trouvé', 'back_to_warehouse': 'Retour à l\'entrepôt', 'select_site': 'Sélectionner Chantier',
            'select_employee': 'Sélectionner Employé', 'confirm_delete_item': 'Êtes-vous sûr de vouloir supprimer cet article ?'
        },
        'fleet': {
            'title': 'Flotte', 'search_vehicle': 'Chercher véhicule...', 'add_vehicle': 'Ajouter Véhicule',
            'license_plate': 'Plaque d\'immatriculation', 'brand': 'Marque', 'model': 'Modèle', 'year': 'Année',
            'status': 'Statut', 'actions': 'Actions', 'active': 'Actif', 'inactive': 'Inactif', 'in_service': 'En Révision',
            'edit_vehicle': 'Modifier Véhicule', 'delete_vehicle': 'Supprimer Véhicule', 'no_vehicles': 'Aucun véhicule trouvé',
            'save_vehicle': 'Enregistrer Véhicule', 'confirm_delete_vehicle': 'Êtes-vous sûr de vouloir supprimer ce véhicule ?'
        },
        'accommodations': {
            'title': 'Hébergements', 'search': 'Chercher...', 'add': 'Ajouter Hébergement', 'name': 'Nom',
            'address': 'Adresse', 'capacity': 'Capacité', 'site': 'Chantier Associé', 'no_site': 'Pas de chantier',
            'cost': 'Coût/Mois', 'cost_short': 'Coût', 'total_employees': 'Employés totaux', 'available_spots': 'Places disponibles',
            'show_employees': 'Afficher employés', 'edit': 'Modifier', 'delete': 'Supprimer',
            'no_accommodations': 'Aucun hébergement trouvé', 'save': 'Enregistrer', 'confirm_delete': 'Confirmer suppression?',
            'assign_employees': 'Assigner Employés', 'assigned_employees': 'Employés Assignés', 'no_employees_assigned': 'Aucun employé'
        }
    },
    'hu': {
        'warehouse': {
            'search_item': 'Cikk keresése...', 'all': 'Mind', 'tools': 'Szerszámok', 'consumables': 'Fogyóeszközök',
            'structure': 'Szerkezet', 'fuel': 'Üzemanyag', 'export_excel': 'Excel Export', 'new_item': 'Új Cikk',
            'col_item': 'CIKK', 'col_unit': 'M.E.', 'col_in': 'BEJÖVŐ', 'col_out': 'KIMENŐ', 'col_stock': 'JELENLEGI KÉSZLET',
            'col_actions': 'MŰVELETEK', 'assigned': 'Kiosztva', 'in_stock': 'Raktáron', 'defective': 'Hibás',
            'mark_functional': 'Működőnek jelöl', 'mark_defective': 'Hibásnak jelöl', 'edit': 'Szerkesztés',
            'delete': 'Törlés', 'title': 'Raktár', 'no_items': 'Nincsenek cikkek.', 'loading': 'Betöltés...',
            'add_new_item': 'Új Cikk Hozzáadása', 'item_name': 'Cikk Neve', 'item_name_placeholder': 'pl. Fúró, Cement...',
            'unit_of_measure': 'Mértékegység', 'unit_placeholder': 'pl. db, kg, L...', 'save_item': 'Cikk Mentése',
            'show': 'Mutat', 'page': 'Oldal', 'of': '/', 'tx_history': 'Tranzakció Történet', 'date': 'Dátum',
            'type': 'Típus', 'quantity': 'Mennyiség', 'site': 'Építkezés', 'recipient': 'Átvevő', 'operator': 'Kezelő',
            'no_results': 'Nincs találat', 'back_to_warehouse': 'Vissza a Raktárba', 'select_site': 'Válassz Építkezést',
            'select_employee': 'Válassz Alkalmazottat', 'confirm_delete_item': 'Biztosan törölni akarod ezt a cikket?'
        },
        'fleet': {
            'title': 'Járműpark', 'search_vehicle': 'Jármű keresése...', 'add_vehicle': 'Jármű Hozzáadása',
            'license_plate': 'Rendszám', 'brand': 'Márka', 'model': 'Modell', 'year': 'Évjárat',
            'status': 'Státusz', 'actions': 'Műveletek', 'active': 'Aktív', 'inactive': 'Inaktív', 'in_service': 'Szervizben',
            'edit_vehicle': 'Jármű Szerkesztése', 'delete_vehicle': 'Jármű Törlése', 'no_vehicles': 'Nincs jármű',
            'save_vehicle': 'Jármű Mentése', 'confirm_delete_vehicle': 'Biztosan törölni akarod ezt a járművet?'
        },
        'accommodations': {
            'title': 'Szállások', 'search': 'Keresés...', 'add': 'Szállás Hozzáadása', 'name': 'Név',
            'address': 'Cím', 'capacity': 'Kapacitás', 'site': 'Kapcsolódó Építkezés', 'no_site': 'Nincs Építkezés',
            'cost': 'Költség/Hó', 'cost_short': 'Költség', 'total_employees': 'Összes Alkalmazott', 'available_spots': 'Szabad Helyek',
            'show_employees': 'Alkalmazottak Mutatása', 'edit': 'Szerkesztés', 'delete': 'Törlés',
            'no_accommodations': 'Nincs szállás', 'save': 'Mentés', 'confirm_delete': 'Biztosan törlöd?',
            'assign_employees': 'Alkalmazottak Kiosztása', 'assigned_employees': 'Kiosztott Alkalmazottak', 'no_employees_assigned': 'Nincs alkalmazott'
        }
    }
}

i18n_path = 'src/i18n'
for lang, data in langs.items():
    file_path = f"{i18n_path}/{lang}.json"
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
            
        content['warehouse'] = data['warehouse']
        content['fleet'] = data['fleet']
        content['accommodations'] = data['accommodations']
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
            
print("Successfully injected all translations into i18n JSON files.")
