import json
import os

i18n_dir = 'src/i18n'

translations = {
    'en': {
        'title_main': 'Quotes / Offers',
        'subtitle': 'Manage quote requests before scheduling',
        'quick_add': 'Quick Add Quote',
        'field_title': 'Job Type / Title',
        'ex_sapa': 'e.g., New Screed',
        'field_client': 'Client',
        'new_client': 'New Client',
        'approx_date': 'Approx. Date',
        'ex_date': 'e.g., End of August',
        'field_address': 'Address (Google Maps)',
        'btn_save': 'Save Quote'
    },
    'fr': {
        'title_main': 'Devis / Offres',
        'subtitle': 'Gérer les demandes de devis avant planification',
        'quick_add': 'Ajout rapide de devis',
        'field_title': 'Type de Travail / Titre',
        'ex_sapa': 'ex: Nouvelle chape',
        'field_client': 'Client',
        'new_client': 'Nouveau Client',
        'approx_date': 'Date approx.',
        'ex_date': 'ex: Fin août',
        'field_address': 'Adresse (Google Maps)',
        'btn_save': 'Enregistrer le devis'
    },
    'ro': {
        'title_main': 'Devize / Oferte',
        'subtitle': 'Gestionați cererile de deviz înainte de planificare',
        'quick_add': 'Adăugare rapidă deviz',
        'field_title': 'Tip lucrare / Titlu',
        'ex_sapa': 'ex: Șapă nouă',
        'field_client': 'Client',
        'new_client': 'Client nou',
        'approx_date': 'Data aprox.',
        'ex_date': 'ex: Sfârșitul lunii august',
        'field_address': 'Adresă (Google Maps)',
        'btn_save': 'Salvează deviz'
    },
    'nl': {
        'title_main': 'Offertes / Aanbiedingen',
        'subtitle': 'Beheer offerteaanvragen voor planning',
        'quick_add': 'Snel offerte toevoegen',
        'field_title': 'Type werk / Titel',
        'ex_sapa': 'bijv: Nieuwe dekvloer',
        'field_client': 'Klant',
        'new_client': 'Nieuwe klant',
        'approx_date': 'Geschatte datum',
        'ex_date': 'bijv: Eind augustus',
        'field_address': 'Adres (Google Maps)',
        'btn_save': 'Offerte opslaan'
    },
    'de': {
        'title_main': 'Angebote / Kostenvoranschläge',
        'subtitle': 'Angebotsanfragen vor der Planung verwalten',
        'quick_add': 'Schnellangebot hinzufügen',
        'field_title': 'Art der Arbeit / Titel',
        'ex_sapa': 'z.B.: Neuer Estrich',
        'field_client': 'Kunde',
        'new_client': 'Neuer Kunde',
        'approx_date': 'Ungefähres Datum',
        'ex_date': 'z.B.: Ende August',
        'field_address': 'Adresse (Google Maps)',
        'btn_save': 'Angebot speichern'
    },
    'ru': {
        'title_main': 'Сметы / Предложения',
        'subtitle': 'Управление запросами на сметы до планирования',
        'quick_add': 'Быстрое добавление сметы',
        'field_title': 'Тип работы / Название',
        'ex_sapa': 'напр: Новая стяжка',
        'field_client': 'Клиент',
        'new_client': 'Новый Клиент',
        'approx_date': 'Примерная дата',
        'ex_date': 'напр: Конец августа',
        'field_address': 'Адрес (Google Maps)',
        'btn_save': 'Сохранить смету'
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

