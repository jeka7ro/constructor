import json
import os

i18n_dir = 'src/i18n'

translations = {
    'en': {
        'add_new_client': 'Add New Client',
        'list_title': 'Waiting Quotes List',
        'empty': 'No quotes waiting.',
        'title': 'Job / Title',
        'view_details': 'Quote Details',
        'btn_convert': 'Convert to Order',
        'confirm_convert': 'Are you sure you want to convert this quote to a work order?',
        'req_start_date': 'You must select a start date (via Edit) before converting.',
        'success_convert': 'Quote successfully converted!',
        'err_convert': 'Conversion error.',
        'req_title': 'Title is required',
        'err_create': 'Error creating quote'
    },
    'fr': {
        'add_new_client': 'Ajouter un nouveau client',
        'list_title': 'Liste des devis en attente',
        'empty': 'Aucun devis en attente.',
        'title': 'Travail / Titre',
        'view_details': 'Détails du devis',
        'btn_convert': 'Convertir en commande',
        'confirm_convert': 'Êtes-vous sûr de vouloir convertir ce devis en commande ?',
        'req_start_date': 'Vous devez sélectionner une date (via Modifier) avant la conversion.',
        'success_convert': 'Devis converti avec succès !',
        'err_convert': 'Erreur de conversion.',
        'req_title': 'Le titre est requis',
        'err_create': 'Erreur lors de la création du devis'
    },
    'ro': {
        'add_new_client': 'Adaugă client nou',
        'list_title': 'Lista devizelor în așteptare',
        'empty': 'Niciun deviz în așteptare.',
        'title': 'Lucrare / Titlu',
        'view_details': 'Detalii deviz',
        'btn_convert': 'Transformă în comandă',
        'confirm_convert': 'Sigur dorești să transformi acest deviz în comandă?',
        'req_start_date': 'Trebuie să selectezi o dată (via Modifică) înainte de conversie.',
        'success_convert': 'Deviz transformat cu succes!',
        'err_convert': 'Eroare la conversie.',
        'req_title': 'Titlul este obligatoriu',
        'err_create': 'Eroare la crearea devizului'
    },
    'nl': {
        'add_new_client': 'Nieuwe klant toevoegen',
        'list_title': 'Lijst met wachtende offertes',
        'empty': 'Geen offertes in de wacht.',
        'title': 'Werk / Titel',
        'view_details': 'Offertedetails',
        'btn_convert': 'Omzetten in bestelling',
        'confirm_convert': 'Weet u zeker dat u deze offerte wilt omzetten in een bestelling?',
        'req_start_date': 'U moet een datum selecteren (via Bewerken) voordat u converteert.',
        'success_convert': 'Offerte succesvol omgezet!',
        'err_convert': 'Conversiefout.',
        'req_title': 'Titel is verplicht',
        'err_create': 'Fout bij maken offerte'
    },
    'de': {
        'add_new_client': 'Neuen Kunden hinzufügen',
        'list_title': 'Liste der wartenden Angebote',
        'empty': 'Keine Angebote warten.',
        'title': 'Arbeit / Titel',
        'view_details': 'Angebotsdetails',
        'btn_convert': 'In Bestellung umwandeln',
        'confirm_convert': 'Möchten Sie dieses Angebot wirklich in eine Bestellung umwandeln?',
        'req_start_date': 'Sie müssen ein Datum (über Bearbeiten) vor der Umwandlung auswählen.',
        'success_convert': 'Angebot erfolgreich umgewandelt!',
        'err_convert': 'Umwandlungsfehler.',
        'req_title': 'Titel ist erforderlich',
        'err_create': 'Fehler beim Erstellen des Angebots'
    },
    'ru': {
        'add_new_client': 'Добавить нового клиента',
        'list_title': 'Список ожидающих смет',
        'empty': 'Нет ожидающих смет.',
        'title': 'Работа / Название',
        'view_details': 'Детали сметы',
        'btn_convert': 'Преобразовать в заказ',
        'confirm_convert': 'Вы уверены, что хотите преобразовать эту смету в заказ?',
        'req_start_date': 'Необходимо выбрать дату (через Изменить) перед преобразованием.',
        'success_convert': 'Смета успешно преобразована!',
        'err_convert': 'Ошибка преобразования.',
        'req_title': 'Название обязательно',
        'err_create': 'Ошибка при создании сметы'
    }
}

for lang, data in translations.items():
    file_path = os.path.join(i18n_dir, f"{lang}.json")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        if 'quotes' not in content:
            content['quotes'] = {}
            
        for key, value in data.items():
            content['quotes'][key] = value
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"Updated {lang}.json")
