const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'frontend', 'src', 'i18n');
const languages = ['ro.json', 'en.json', 'de.json', 'fr.json', 'nl.json', 'ru.json'];

const newTranslations = {
    "admin_dashboard": {
        "header_planning": { "ro": "Planning", "en": "Planning", "de": "Planung", "fr": "Planification", "nl": "Planning", "ru": "Планирование" },
        "header_logistics": { "ro": "Logistică", "en": "Logistics", "de": "Logistik", "fr": "Logistique", "nl": "Logistiek", "ru": "Логистика" },
        "header_orders": { "ro": "Comenzi", "en": "Orders", "de": "Bestellungen", "fr": "Commandes", "nl": "Bestellingen", "ru": "Заказы" },
        "header_reports": { "ro": "Rapoarte", "en": "Reports", "de": "Berichte", "fr": "Rapports", "nl": "Rapporten", "ru": "Отчеты" },
        "header_sites": { "ro": "Șantiere", "en": "Sites", "de": "Baustellen", "fr": "Chantiers", "nl": "Werven", "ru": "Объекты" },
        "header_employees": { "ro": "Angajați", "en": "Employees", "de": "Mitarbeiter", "fr": "Employés", "nl": "Medewerkers", "ru": "Сотрудники" },
        "header_teams": { "ro": "Echipe", "en": "Teams", "de": "Teams", "fr": "Équipes", "nl": "Teams", "ru": "Команды" }
    },
    "work_order_detail": {
        "top_cards": {
            "order": { "ro": "Comandă", "en": "Order", "de": "Bestellung", "fr": "Commande", "nl": "Bestelling", "ru": "Заказ" },
            "team": { "ro": "Echipa", "en": "Team", "de": "Team", "fr": "Équipe", "nl": "Ploeg", "ru": "Команда" },
            "employees_assigned": { "ro": "ANGAJAȚI (alocați)", "en": "EMPLOYEES (assigned)", "de": "MITARBEITER (zugewiesen)", "fr": "EMPLOYÉS (assignés)", "nl": "MEDEWERKERS (toegewezen)", "ru": "СОТРУДНИКИ (назначены)" },
            "mat_required": { "ro": "MAT. NECESAR (nisip)", "en": "MAT. REQ. (sand)", "de": "MAT. ERFORD. (Sand)", "fr": "MAT. REQUIS (sable)", "nl": "MAT. VEREIST (zand)", "ru": "МАТ. ТРЕБ. (песок)" },
            "volume": { "ro": "VOLUM (m³)", "en": "VOLUME (m³)", "de": "VOLUMEN (m³)", "fr": "VOLUME (m³)", "nl": "VOLUME (m³)", "ru": "ОБЪЕМ (м³)" },
            "thickness": { "ro": "GROSIME (medie)", "en": "THICKNESS (avg)", "de": "DICKE (Ø)", "fr": "ÉPAISSEUR (moy.)", "nl": "DIKTE (gem.)", "ru": "ТОЛЩИНА (средн.)" },
            "route": { "ro": "TRASEU (dus-întors)", "en": "ROUTE (round trip)", "de": "ROUTE (Hin- und Rückfahrt)", "fr": "ITINÉRAIRE (aller-retour)", "nl": "ROUTE (heen en terug)", "ru": "МАРШРУТ (туда-обратно)" }
        },
        "weather": {
            "title": { "ro": "VREMEA LA LOCAȚIE", "en": "WEATHER AT LOCATION", "de": "WETTER AM STANDORT", "fr": "MÉTÉO SUR PLACE", "nl": "WEER OP LOCATIE", "ru": "ПОГОДА НА МЕСТЕ" },
            "feels_like": { "ro": "Se simte", "en": "Feels like", "de": "Gefühlt", "fr": "Ressenti", "nl": "Voelt als", "ru": "Ощущается как" },
            "wind": { "ro": "Vânt:", "en": "Wind:", "de": "Wind:", "fr": "Vent:", "nl": "Wind:", "ru": "Ветер:" },
            "humidity": { "ro": "Umiditate:", "en": "Humidity:", "de": "Luftfeuchtigkeit:", "fr": "Humidité:", "nl": "Vochtigheid:", "ru": "Влажность:" }
        },
        "planning": {
            "title": { "ro": "PLANIFICARE & ECHIPĂ", "en": "PLANNING & TEAM", "de": "PLANUNG & TEAM", "fr": "PLANIFICATION & ÉQUIPE", "nl": "PLANNING & TEAM", "ru": "ПЛАНИРОВАНИЕ И КОМАНДА" },
            "team_leader": { "ro": "RESPONSABIL", "en": "LEADER", "de": "VERANTWORTLICH", "fr": "RESPONSABLE", "nl": "VERANTWOORDELIJKE", "ru": "ОТВЕТСТВЕННЫЙ" },
            "vehicle": { "ro": "VEHICUL", "en": "VEHICLE", "de": "FAHRZEUG", "fr": "VÉHICULE", "nl": "VOERTUIG", "ru": "ТРАНСПОРТНОЕ СРЕДСТВО" },
            "route_steps": { "ro": "TRAJET (ETAPE)", "en": "ROUTE (STEPS)", "de": "ROUTE (SCHRITTE)", "fr": "TRAJET (ÉTAPES)", "nl": "ROUTE (STAPPEN)", "ru": "МАРШРУТ (ЭТАПЫ)" },
            "total_distance": { "ro": "DISTANȚA TOTALĂ", "en": "TOTAL DISTANCE", "de": "GESAMTDISTANZ", "fr": "DISTANCE TOTALE", "nl": "TOTALE AFSTAND", "ru": "ОБЩАЯ ДИСТАНЦИЯ" },
            "base": { "ro": "Baza", "en": "Base", "de": "Basis", "fr": "Base", "nl": "Basis", "ru": "База" },
            "destination": { "ro": "Destinație", "en": "Destination", "de": "Ziel", "fr": "Destination", "nl": "Bestemming", "ru": "Место назначения" }
        },
        "status_confirmations": {
            "title": { "ro": "CONFIRMĂRI STATUS", "en": "STATUS CONFIRMATIONS", "de": "STATUSBESTÄTIGUNGEN", "fr": "CONFIRMATIONS DE STATUT", "nl": "STATUSBEVESTIGINGEN", "ru": "ПОДТВЕРЖДЕНИЯ СТАТУСА" },
            "team_leader": { "ro": "ȘEF ECHIPĂ", "en": "TEAM LEADER", "de": "TEAMLEITER", "fr": "CHEF D'ÉQUIPE", "nl": "PLOEGBASS", "ru": "РУКОВОДИТЕЛЬ КОМАНДЫ" },
            "client": { "ro": "CLIENT / BENEFICIAR", "en": "CLIENT / BENEFICIARY", "de": "KUNDE / BEGÜNSTIGTER", "fr": "CLIENT / BÉNÉFICIAIRE", "nl": "KLANT / BEGUNSTIGDE", "ru": "КЛИЕНТ / БЕНЕФИЦИАР" },
            "accepted": { "ro": "ACCEPTAT", "en": "ACCEPTED", "de": "AKZEPTIERT", "fr": "ACCEPTÉ", "nl": "GEACCEPTEERD", "ru": "ПРИНЯТО" },
            "confirmed": { "ro": "CONFIRMAT", "en": "CONFIRMED", "de": "BESTÄTIGT", "fr": "CONFIRMÉ", "nl": "BEVESTIGD", "ru": "ПОДТВЕРЖДЕНО" },
            "not_confirmed": { "ro": "Neconfirmată de client.", "en": "Not confirmed by client.", "de": "Vom Kunden nicht bestätigt.", "fr": "Non confirmé par le client.", "nl": "Niet bevestigd door klant.", "ru": "Не подтверждено клиентом." },
            "not_acknowledged": { "ro": "Nu a luat la cunoștință încă", "en": "Not acknowledged yet", "de": "Noch nicht zur Kenntnis genommen", "fr": "Pas encore pris en compte", "nl": "Nog niet erkend", "ru": "Еще не ознакомлен" },
            "acknowledged_on": { "ro": "A luat la cunoștință pe", "en": "Acknowledged on", "de": "Zur Kenntnis genommen am", "fr": "Pris en compte le", "nl": "Erkend op", "ru": "Ознакомлен" },
            "opened_on": { "ro": "A deschis comanda pe", "en": "Opened order on", "de": "Bestellung geöffnet am", "fr": "Commande ouverte le", "nl": "Bestelling geopend op", "ru": "Заказ открыт" },
            "note": { "ro": "Notă:", "en": "Note:", "de": "Notiz:", "fr": "Note:", "nl": "Notitie:", "ru": "Примечание:" },
            "confirmed_by": { "ro": "Confirmat de", "en": "Confirmed by", "de": "Bestätigt von", "fr": "Confirmé par", "nl": "Bevestigd door", "ru": "Подтверждено" },
            "on_date": { "ro": "La Data", "en": "On date", "de": "Am Datum", "fr": "À la date", "nl": "Op datum", "ru": "На дату" }
        },
        "materials_volumes": {
            "title": { "ro": "CANTITĂȚI & MATERIALE (ESTIMATE VS CONSUMATE)", "en": "QUANTITIES & MATERIALS (ESTIMATED VS CONSUMED)", "de": "MENGEN & MATERIALIEN (GESCHÄTZT VS VERBRAUCHT)", "fr": "QUANTITÉS & MATÉRIAUX (ESTIMÉS VS CONSOMMÉS)", "nl": "HOEVEELHEDEN & MATERIALEN (GESCHAT VS VERBRUIKT)", "ru": "ОБЪЕМЫ И МАТЕРИАЛЫ (ОЦЕНКА И ФАКТ)" },
            "planned": { "ro": "PLANIFICAT / ESTIMAT", "en": "PLANNED / ESTIMATED", "de": "GEPLANT / GESCHÄTZT", "fr": "PLANIFIÉ / ESTIMÉ", "nl": "GEPLAND / GESCHAT", "ru": "ЗАПЛАНИРОВАНО / ОЦЕНЕНО" },
            "consumed": { "ro": "CONSUMAT EFECTIV", "en": "ACTUALLY CONSUMED", "de": "TATSÄCHLICH VERBRAUCHT", "fr": "RÉELLEMENT CONSOMMÉ", "nl": "WERKELIJK VERBRUIKT", "ru": "ФАКТИЧЕСКИ ИЗРАСХОДОВАНО" },
            "works_volumes": { "ro": "LUCRĂRI / VOLUME", "en": "WORKS / VOLUMES", "de": "ARBEITEN / VOLUMINA", "fr": "TRAVAUX / VOLUMES", "nl": "WERKEN / VOLUMES", "ru": "РАБОТЫ / ОБЪЕМЫ" },
            "no_consumed_materials": { "ro": "Niciun material consumat înregistrat", "en": "No consumed material recorded", "de": "Kein verbrauchtes Material erfasst", "fr": "Aucun matériau consommé enregistré", "nl": "Geen verbruikt materiaal geregistreerd", "ru": "Нет записей о расходных материалах" },
            "distribution": { "ro": "Distribuție Cantități", "en": "Quantity Distribution", "de": "Mengenverteilung", "fr": "Distribution des quantités", "nl": "Kwantitatieve verdeling", "ru": "Распределение количеств" },
            "no_quantities": { "ro": "Nicio cantitate înregistrată", "en": "No quantity recorded", "de": "Keine Menge erfasst", "fr": "Aucune quantité enregistrée", "nl": "Geen hoeveelheid geregistreerd", "ru": "Количество не зарегистрировано" }
        }
    }
};

languages.forEach(langFile => {
    const lang = langFile.split('.')[0];
    const filePath = path.join(i18nDir, langFile);
    let dict = {};
    if (fs.existsSync(filePath)) {
        dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    // Merge new dicts
    Object.keys(newTranslations).forEach(ns => {
        if (!dict[ns]) dict[ns] = {};
        Object.keys(newTranslations[ns]).forEach(key => {
            if (typeof newTranslations[ns][key] === 'object') {
                if (!dict[ns][key]) dict[ns][key] = {};
                Object.keys(newTranslations[ns][key]).forEach(subKey => {
                    dict[ns][key][subKey] = newTranslations[ns][key][subKey][lang];
                });
            } else {
                dict[ns][key] = newTranslations[ns][key][lang];
            }
        });
    });

    fs.writeFileSync(filePath, JSON.stringify(dict, null, 2), 'utf8');
});

console.log("Dictionary updated successfully!");
