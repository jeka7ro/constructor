const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'frontend', 'src', 'i18n');
const languages = ['ro.json', 'en.json', 'de.json', 'fr.json', 'nl.json', 'ru.json'];

const newTranslations = {
    "work_order_form": {
        "title_new": { "ro": "Comandă Nouă", "en": "New Order", "de": "Neue Bestellung", "fr": "Nouvelle Commande", "nl": "Nieuwe Bestelling", "ru": "Новый заказ" },
        "title_edit": { "ro": "Editare Comandă", "en": "Edit Order", "de": "Bestellung bearbeiten", "fr": "Modifier la Commande", "nl": "Bestelling bewerken", "ru": "Редактировать заказ" },
        "subtitle": { "ro": "Completează câmpurile de mai jos", "en": "Fill out the fields below", "de": "Füllen Sie die folgenden Felder aus", "fr": "Remplissez les champs ci-dessous", "nl": "Vul de onderstaande velden in", "ru": "Заполните поля ниже" },
        "save_btn": { "ro": "Salvează Comanda", "en": "Save Order", "de": "Bestellung speichern", "fr": "Enregistrer la Commande", "nl": "Bestelling opslaan", "ru": "Сохранить заказ" },
        "save_send_btn": { "ro": "Salvează & Trimite", "en": "Save & Send", "de": "Speichern & Senden", "fr": "Enregistrer & Envoyer", "nl": "Opslaan & Verzenden", "ru": "Сохранить и отправить" },
        "saving": { "ro": "Se salvează...", "en": "Saving...", "de": "Speichern...", "fr": "Enregistrement...", "nl": "Opslaan...", "ru": "Сохранение..." },
        "sending": { "ro": "Se trimite...", "en": "Sending...", "de": "Senden...", "fr": "Envoi...", "nl": "Verzenden...", "ru": "Отправка..." },
        "general_details": { "ro": "Detalii Generale", "en": "General Details", "de": "Allgemeine Details", "fr": "Détails Généraux", "nl": "Algemene Details", "ru": "Общие детали" },
        "client": { "ro": "Client", "en": "Client", "de": "Kunde", "fr": "Client", "nl": "Klant", "ru": "Клиент" },
        "client_existing": { "ro": "Client Existent", "en": "Existing Client", "de": "Bestehender Kunde", "fr": "Client Existant", "nl": "Bestaande Klant", "ru": "Существующий клиент" },
        "client_new": { "ro": "Client Nou", "en": "New Client", "de": "Neuer Kunde", "fr": "Nouveau Client", "nl": "Nieuwe Klant", "ru": "Новый клиент" },
        "select_client": { "ro": "Selectează Client", "en": "Select Client", "de": "Kunde auswählen", "fr": "Sélectionner un Client", "nl": "Kies Klant", "ru": "Выберите клиента" },
        "language": { "ro": "Limba", "en": "Language", "de": "Sprache", "fr": "Langue", "nl": "Taal", "ru": "Язык" },
        "company_type_juridical": { "ro": "Persoană Juridică", "en": "Company", "de": "Unternehmen", "fr": "Entreprise", "nl": "Bedrijf", "ru": "Юридическое лицо" },
        "company_type_physical": { "ro": "Persoană Fizică", "en": "Individual", "de": "Privatperson", "fr": "Particulier", "nl": "Particulier", "ru": "Физическое лицо" },
        "company_name": { "ro": "Nume Companie", "en": "Company Name", "de": "Firmenname", "fr": "Nom de l'entreprise", "nl": "Bedrijfsnaam", "ru": "Название компании" },
        "full_name": { "ro": "Nume și Prenume", "en": "Full Name", "de": "Vollständiger Name", "fr": "Nom Complet", "nl": "Volledige Naam", "ru": "Полное имя" },
        "country": { "ro": "Țară", "en": "Country", "de": "Land", "fr": "Pays", "nl": "Land", "ru": "Страна" },
        "vat_number": { "ro": "CUI / VAT Number", "en": "VAT Number", "de": "Umsatzsteuernummer", "fr": "Numéro de TVA", "nl": "Btw-nummer", "ru": "ИНН" },
        "reg_number": { "ro": "Nr. Reg. Comerțului", "en": "Registration Number", "de": "Handelsregisternummer", "fr": "Numéro d'enregistrement", "nl": "Registratienummer", "ru": "Регистрационный номер" },
        "add_bank_details": { "ro": "Adaugă detalii bancare (Bancă, IBAN, SWIFT)", "en": "Add bank details", "de": "Bankdaten hinzufügen", "fr": "Ajouter des coordonnées bancaires", "nl": "Bankgegevens toevoegen", "ru": "Добавить банковские реквизиты" },
        "bank_name": { "ro": "Nume Bancă", "en": "Bank Name", "de": "Bankname", "fr": "Nom de la Banque", "nl": "Banknaam", "ru": "Название банка" },
        "contact_person": { "ro": "Persoană de Contact", "en": "Contact Person", "de": "Ansprechpartner", "fr": "Personne de Contact", "nl": "Contactpersoon", "ru": "Контактное лицо" },
        "phone": { "ro": "Telefon", "en": "Phone", "de": "Telefon", "fr": "Téléphone", "nl": "Telefoon", "ru": "Телефон" },
        "email": { "ro": "Email", "en": "Email", "de": "E-Mail", "fr": "Email", "nl": "E-mail", "ru": "Email" },
        "address": { "ro": "Adresă", "en": "Address", "de": "Adresse", "fr": "Adresse", "nl": "Adres", "ru": "Адрес" },
        "site_location": { "ro": "Locație Lucrare", "en": "Site Location", "de": "Einsatzort", "fr": "Lieu du Chantier", "nl": "Werflocatie", "ru": "Место проведения работ" },
        "site_existing": { "ro": "Lucrare Existentă", "en": "Existing Site", "de": "Bestehender Einsatzort", "fr": "Chantier Existant", "nl": "Bestaande Werf", "ru": "Существующий объект" },
        "site_manual": { "ro": "Adresă Manuală", "en": "Manual Address", "de": "Manuelle Adresse", "fr": "Adresse Manuelle", "nl": "Handmatig Adres", "ru": "Ввести адрес" },
        "select_site": { "ro": "Selectează Lucrare", "en": "Select Site", "de": "Einsatzort auswählen", "fr": "Sélectionner un Chantier", "nl": "Kies Werf", "ru": "Выберите объект" },
        "site_address": { "ro": "Adresa Lucrării", "en": "Site Address", "de": "Adresse des Einsatzortes", "fr": "Adresse du Chantier", "nl": "Werfadres", "ru": "Адрес объекта" },
        "gps_coords": { "ro": "Coordonate GPS", "en": "GPS Coordinates", "de": "GPS-Koordinaten", "fr": "Coordonnées GPS", "nl": "GPS-coördinaten", "ru": "GPS Координаты" },
        "detect_gps": { "ro": "Detectează automat", "en": "Auto Detect", "de": "Automatisch erkennen", "fr": "Détection Auto", "nl": "Automatisch Detecteren", "ru": "Автоопределение" },
        "latitude": { "ro": "Latitudine", "en": "Latitude", "de": "Breitengrad", "fr": "Latitude", "nl": "Breedtegraad", "ru": "Широта" },
        "longitude": { "ro": "Longitudine", "en": "Longitude", "de": "Längengrad", "fr": "Longitude", "nl": "Lengtegraad", "ru": "Долгота" },
        "geo_radius": { "ro": "Raza Geo (m)", "en": "Geo Radius (m)", "de": "Geo-Radius (m)", "fr": "Rayon Géo (m)", "nl": "Geo Radius (m)", "ru": "Гео Радиус (м)" },
        "volumes_works": { "ro": "Cantități & Lucrări", "en": "Quantities & Works", "de": "Mengen & Arbeiten", "fr": "Quantités & Travaux", "nl": "Hoeveelheden & Werken", "ru": "Объемы и работы" },
        "work_type": { "ro": "Tip Lucrare", "en": "Work Type", "de": "Art der Arbeit", "fr": "Type de Travail", "nl": "Type Werk", "ru": "Тип работы" },
        "qty": { "ro": "Cant", "en": "Qty", "de": "Menge", "fr": "Qté", "nl": "Aantal", "ru": "Кол-во" },
        "unit": { "ro": "UM", "en": "Unit", "de": "Einh.", "fr": "Unité", "nl": "Eenh.", "ru": "Ед. изм." },
        "thickness_cm": { "ro": "Grosime (cm)", "en": "Thickness (cm)", "de": "Dicke (cm)", "fr": "Épaisseur (cm)", "nl": "Dikte (cm)", "ru": "Толщина (см)" },
        "materials_needed": { "ro": "Materiale Necesare", "en": "Materials Needed", "de": "Benötigte Materialien", "fr": "Matériaux Nécessaires", "nl": "Benodigde Materialen", "ru": "Необходимые материалы" },
        "material_name": { "ro": "Nume Material", "en": "Material Name", "de": "Materialname", "fr": "Nom du Matériau", "nl": "Materiaalnaam", "ru": "Название материала" },
        "planning": { "ro": "Planificare & Echipă", "en": "Planning & Team", "de": "Planung & Team", "fr": "Planification & Équipe", "nl": "Planning & Team", "ru": "Планирование и команда" },
        "start_date": { "ro": "Data Începerii", "en": "Start Date", "de": "Startdatum", "fr": "Date de Début", "nl": "Startdatum", "ru": "Дата начала" },
        "start_time": { "ro": "Ora Prezentării", "en": "Start Time", "de": "Startzeit", "fr": "Heure de Présentation", "nl": "Starttijd", "ru": "Время начала" },
        "deadline_date": { "ro": "Data Finalizării", "en": "Deadline Date", "de": "Fristdatum", "fr": "Date Limite", "nl": "Einddatum", "ru": "Срок сдачи" },
        "assigned_team": { "ro": "Echipa Alocată", "en": "Assigned Team", "de": "Zugewiesenes Team", "fr": "Équipe Assignée", "nl": "Toegewezen Team", "ru": "Назначенная команда" },
        "assigned_vehicle": { "ro": "Vehicul", "en": "Vehicle", "de": "Fahrzeug", "fr": "Véhicule", "nl": "Voertuig", "ru": "Транспортное средство" },
        "access_notes": { "ro": "Instrucțiuni / Note de Acces", "en": "Access Notes / Instructions", "de": "Zugangshinweise / Anweisungen", "fr": "Instructions / Notes d'Accès", "nl": "Toegangsnotities / Instructies", "ru": "Инструкции / Заметки по доступу" },
        "photos_instructions": { "ro": "Poze / Scheme Explicative", "en": "Photos / Diagrams", "de": "Fotos / Diagramme", "fr": "Photos / Schémas", "nl": "Foto's / Schema's", "ru": "Фотографии / Схемы" },
        "drag_drop_photos": { "ro": "Trage pozele aici sau apasă", "en": "Drag and drop photos here or click", "de": "Fotos hier ablegen oder klicken", "fr": "Glissez-déposez les photos ici ou cliquez", "nl": "Sleep foto's hier of klik", "ru": "Перетащите фото сюда или нажмите" },
        "add_item": { "ro": "+ Adaugă", "en": "+ Add", "de": "+ Hinzufügen", "fr": "+ Ajouter", "nl": "+ Toevoegen", "ru": "+ Добавить" },
        "remove": { "ro": "Șterge", "en": "Remove", "de": "Entfernen", "fr": "Supprimer", "nl": "Verwijderen", "ru": "Удалить" }
    }
};

languages.forEach(langFile => {
    const lang = langFile.split('.')[0];
    const filePath = path.join(i18nDir, langFile);
    let dict = {};
    if (fs.existsSync(filePath)) {
        dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    // Merge new dicts correctly
    Object.keys(newTranslations).forEach(ns => {
        if (!dict[ns]) dict[ns] = {};
        Object.keys(newTranslations[ns]).forEach(key => {
            dict[ns][key] = newTranslations[ns][key][lang];
        });
    });

    fs.writeFileSync(filePath, JSON.stringify(dict, null, 2), 'utf8');
});

console.log("Dictionary updated and fixed for WorkOrderForm!");
