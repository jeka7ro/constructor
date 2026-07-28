import json
import os

langs = ['ro', 'en', 'de', 'fr', 'nl', 'ru']
base_dir = 'frontend/src/i18n'

keys = {
    'quick_create': {
        'title': {'ro': 'Creare Rapidă', 'en': 'Quick Create', 'fr': 'Création Rapide', 'de': 'Schnellerstellung', 'nl': 'Snel Aanmaken', 'ru': 'Быстрое создание'},
        'client_mandatory': {'ro': 'Client *', 'en': 'Client *', 'fr': 'Client *', 'de': 'Kunde *', 'nl': 'Klant *', 'ru': 'Клиент *'},
        'new_client': {'ro': 'Client Nou', 'en': 'New Client', 'fr': 'Nouveau Client', 'de': 'Neuer Kunde', 'nl': 'Nieuwe Klant', 'ru': 'Новый Клиент'},
        'choose_client': {'ro': '-- Alege client --', 'en': '-- Choose client --', 'fr': '-- Choisir client --', 'de': '-- Kunde wählen --', 'nl': '-- Kies klant --', 'ru': '-- Выберите клиента --'},
        'work_type': {'ro': 'Tip Lucrare (TVA)', 'en': 'Work Type (VAT)', 'fr': 'Type de travaux (TVA)', 'de': 'Art der Arbeit (MwSt)', 'nl': 'Soort werk (BTW)', 'ru': 'Тип работы (НДС)'},
        'apply_vat': {'ro': 'Aplică TVA', 'en': 'Apply VAT', 'fr': 'Appliquer TVA', 'de': 'MwSt anwenden', 'nl': 'BTW toepassen', 'ru': 'Применить НДС'},
        'work_new': {'ro': 'Nouă (< 10 ani)', 'en': 'New (< 10 yrs)', 'fr': 'Neuf (< 10 ans)', 'de': 'Neu (< 10 J)', 'nl': 'Nieuw (< 10 jr)', 'ru': 'Новое (< 10 лет)'},
        'work_repair': {'ro': 'Renovare (> 10 ani)', 'en': 'Repair (> 10 yrs)', 'fr': 'Rénovation (> 10 ans)', 'de': 'Renovierung (> 10 J)', 'nl': 'Renovatie (> 10 jr)', 'ru': 'Ремонт (> 10 лет)'},
        'address_optional': {'ro': 'Adresă (Opțional)', 'en': 'Address (Optional)', 'fr': 'Adresse (Optionnel)', 'de': 'Adresse (Optional)', 'nl': 'Adres (Optioneel)', 'ru': 'Адрес (Необязательно)'},
        'gps_auto': {'ro': 'GPS Automat', 'en': 'Auto GPS', 'fr': 'GPS Auto', 'de': 'Auto-GPS', 'nl': 'Auto-GPS', 'ru': 'Авто-GPS'},
        'base_dist': {'ro': 'Distanță Bază:', 'en': 'Base Dist:', 'fr': 'Distance Base:', 'de': 'Basis-Entf:', 'nl': 'Basisafst:', 'ru': 'Раст. до базы:'},
        'choose_address': {'ro': '(Alegeți adresa)', 'en': '(Choose address)', 'fr': '(Choisir adresse)', 'de': '(Adresse wählen)', 'nl': '(Kies adres)', 'ru': '(Выберите адрес)'},
        'surface_mandatory': {'ro': 'Suprafață (m²) *', 'en': 'Surface (m²) *', 'fr': 'Surface (m²) *', 'de': 'Fläche (m²) *', 'nl': 'Oppervlakte (m²) *', 'ru': 'Площадь (м²) *'},
        'thickness_mandatory': {'ro': 'Grosime (cm) *', 'en': 'Thickness (cm) *', 'fr': 'Épaisseur (cm) *', 'de': 'Dicke (cm) *', 'nl': 'Dikte (cm) *', 'ru': 'Толщина (см) *'},
        'sand_estimated': {'ro': 'Nisip estimat:', 'en': 'Estimated sand:', 'fr': 'Sable estimé:', 'de': 'Geschätzter Sand:', 'nl': 'Geschat zand:', 'ru': 'Ожидаемый песок:'},
        'enter_sqm': {'ro': '(Introduceți m² și cm)', 'en': '(Enter m² & cm)', 'fr': '(Entrez m² & cm)', 'de': '(m² & cm eingeben)', 'nl': '(Voer m² & cm in)', 'ru': '(Введите м² и см)'},
        'include_foil': {'ro': 'Include Folie plastic', 'en': 'Include Plastic Foil', 'fr': 'Inclure Film plastique', 'de': 'Plastikfolie einschließen', 'nl': 'Inclusief plastic folie', 'ru': 'Включить пластиковую пленку'},
        'include_mesh': {'ro': 'Include Plasă metalică', 'en': 'Include Metal Mesh', 'fr': 'Inclure Treillis métallique', 'de': 'Metallgitter einschließen', 'nl': 'Inclusief metaalgaas', 'ru': 'Включить металлическую сетку'},
        'include_duramint': {'ro': 'Include Duramint', 'en': 'Include Duramint', 'fr': 'Inclure Duramint', 'de': 'Duramint einschließen', 'nl': 'Inclusief Duramint', 'ru': 'Включить Duramint'},
        'allocated_team': {'ro': 'Echipă Alocată', 'en': 'Allocated Team', 'fr': 'Équipe Allouée', 'de': 'Zugewiesenes Team', 'nl': 'Toegewezen Team', 'ru': 'Назначенная команда'},
        'no_team': {'ro': '-- Fără echipă (Draft) --', 'en': '-- No team (Draft) --', 'fr': '-- Sans équipe (Brouillon) --', 'de': '-- Kein Team (Entwurf) --', 'nl': '-- Geen team (Concept) --', 'ru': '-- Нет команды (Черновик) --'},
        'add_new_client': {'ro': 'Adaugă Client Nou', 'en': 'Add New Client', 'fr': 'Ajouter Nouveau Client', 'de': 'Neuen Kunden Hinzufügen', 'nl': 'Nieuwe Klant Toevoegen', 'ru': 'Добавить Нового Клиента'},
        'client_type': {'ro': 'Tip Client', 'en': 'Client Type', 'fr': 'Type de Client', 'de': 'Kundentyp', 'nl': 'Klanttype', 'ru': 'Тип Клиента'},
        'individual': {'ro': 'Persoană Fizică', 'en': 'Individual', 'fr': 'Particulier', 'de': 'Privatperson', 'nl': 'Particulier', 'ru': 'Физическое лицо'},
        'legal_entity': {'ro': 'Firmă', 'en': 'Company', 'fr': 'Entreprise', 'de': 'Unternehmen', 'nl': 'Bedrijf', 'ru': 'Компания'},
        'client_name': {'ro': 'Nume Client *', 'en': 'Client Name *', 'fr': 'Nom du Client *', 'de': 'Kundenname *', 'nl': 'Klantnaam *', 'ru': 'Имя Клиента *'},
        'client_name_placeholder': {'ro': 'Ex: Ion Popescu', 'en': 'Ex: John Doe', 'fr': 'Ex: Jean Dupont', 'de': 'Ex: Max Mustermann', 'nl': 'Ex: Jan Jansen', 'ru': 'Ex: Иван Иванов'},
        'cnp': {'ro': 'CNP (Opțional)', 'en': 'ID Number (Optional)', 'fr': 'NISS (Optionnel)', 'de': 'ID-Nummer (Optional)', 'nl': 'ID-nummer (Optioneel)', 'ru': 'ИНН (Необязательно)'},
        'cui': {'ro': 'CUI (Opțional)', 'en': 'VAT Number (Optional)', 'fr': 'N° TVA (Optionnel)', 'de': 'MwSt-Nummer (Optional)', 'nl': 'BTW-nummer (Optioneel)', 'ru': 'НДС (Необязательно)'},
        'country': {'ro': 'Țară', 'en': 'Country', 'fr': 'Pays', 'de': 'Land', 'nl': 'Land', 'ru': 'Страна'},
        'phone': {'ro': 'Telefon', 'en': 'Phone', 'fr': 'Téléphone', 'de': 'Telefon', 'nl': 'Telefoon', 'ru': 'Телефон'},
        'email': {'ro': 'Email', 'en': 'Email', 'fr': 'Email', 'de': 'E-Mail', 'nl': 'E-mail', 'ru': 'Электронная почта'},
        'save_client': {'ro': 'Salvează Client', 'en': 'Save Client', 'fr': 'Enregistrer le Client', 'de': 'Kunde speichern', 'nl': 'Klant opslaan', 'ru': 'Сохранить клиента'},
        'confirm_order': {'ro': 'Confirmă Comanda', 'en': 'Confirm Order', 'fr': 'Confirmer la Commande', 'de': 'Bestellung Bestätigen', 'nl': 'Bestelling Bevestigen', 'ru': 'Подтвердить Заказ'}
    },
    'quick_edit': {
        'title': {'ro': 'Editare Rapidă', 'en': 'Quick Edit', 'fr': 'Édition Rapide', 'de': 'Schnelle Bearbeitung', 'nl': 'Snelle Bewerking', 'ru': 'Быстрое редактирование'},
        'client': {'ro': 'Client', 'en': 'Client', 'fr': 'Client', 'de': 'Kunde', 'nl': 'Klant', 'ru': 'Клиент'}
    }
}

for lang in langs:
    file_path = os.path.join(base_dir, f"{lang}.json")
    if not os.path.exists(file_path): continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if 'dashboard' not in data:
        data['dashboard'] = {}
        
    for category, items in keys.items():
        if category not in data['dashboard']:
            data['dashboard'][category] = {}
        for k, v in items.items():
            # force update to ensure translation is present
            data['dashboard'][category][k] = v[lang]
            
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Translations updated successfully.")
