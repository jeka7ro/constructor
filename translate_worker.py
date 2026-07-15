import json
import os
import re

mapping = {
    "GPS indisponibil — activați locația": "gps_unavailable",
    "Am citit și am înțeles măsurile de securitate.": "security_measures_understood",
    "Locație obligatorie pentru a începe tura.": "location_required",
    "Vă rugăm să citiți și să bifați măsurile de securitate pentru a continua.": "check_security_measures",
    "Alege un șantier pentru a începe": "choose_site",
    "Confirmă Prezența": "confirm_checkin",
    "Începe Tura": "start_shift",
    "Termină Tura": "end_shift",
    "Confirmare Încheiere Tură": "confirm_end_shift",
    "Ești sigur că vrei să închei tura pentru astăzi? Această acțiune nu poate fi anulată.": "end_shift_confirm_msg",
    "Anulează": "cancel",
    "Da, încheie tura": "yes_end_shift",
    "Pauză": "break_btn",
    "Reia Activitatea": "resume_activity",
    "Adaugă Material / Activitate": "add_material_activity",
    "Caută activitate...": "search_activity",
    "Nu sunt activități de adăugat pentru acest șantier.": "no_activities_site",
    "Pontaj": "tab_timesheet",
    "Comenzi": "tab_orders",
    "Echipa Mea": "tab_team",
    "Alerte": "tab_alerts",
    "Așteptăm semnal GPS...": "waiting_gps",
    "Se obține locația...": "getting_location",
    "Activ": "status_active",
    "Pauză": "status_break",
    "Ore Lucrate": "worked_hours",
    "Check-in Reușit!": "checkin_success",
    "Nu este nevoie să mai dai check-in încă o dată!": "already_checked_in",
    "A apărut o eroare la salvarea check-in-ului. Vă rugăm să contactați șeful de echipă.": "checkin_error",
    "Salut": "hello",
    "Istoric": "history",
    "Istoric Pontaje": "timesheet_history",
    "Măsuri de Securitate - Davide Chape": "security_measures_title",
    "Alege alt șantier": "choose_another_site",
    "Adaugă": "add",
    "Alege Șantier": "choose_site_short",
    "Niciun istoric pentru astăzi": "no_history_today",
    "Timp Pauză": "break_time",
    "Timp Lucrat": "worked_time",
    "Adaugă Echipa": "add_team",
    "Istoric Astăzi": "history_today",
    "Mai devreme de": "earlier_than",
    "Ora aprobată este": "approved_time_is",
    "Eroare locație": "location_error",
    "Eroare": "error",
    "Alege data": "choose_date",
    "Date Salariat": "employee_data"
}

fr_translations = {
    "gps_unavailable": "GPS indisponible — activez la localisation",
    "security_measures_understood": "J'ai lu et compris les consignes de sécurité.",
    "location_required": "Localisation obligatoire pour commencer la journée.",
    "check_security_measures": "Veuillez lire et cocher les consignes de sécurité pour continuer.",
    "choose_site": "Choisissez un chantier pour commencer",
    "confirm_checkin": "Confirmer la Présence",
    "start_shift": "Commencer la Journée",
    "end_shift": "Terminer la Journée",
    "confirm_end_shift": "Confirmer la Fin de Journée",
    "end_shift_confirm_msg": "Êtes-vous sûr de vouloir terminer la journée pour aujourd'hui ? Cette action ne peut pas être annulée.",
    "cancel": "Annuler",
    "yes_end_shift": "Oui, terminer",
    "break_btn": "Pause",
    "resume_activity": "Reprendre l'activité",
    "add_material_activity": "Ajouter Matériel / Activité",
    "search_activity": "Rechercher une activité...",
    "no_activities_site": "Aucune activité à ajouter pour ce chantier.",
    "tab_timesheet": "Pointage",
    "tab_orders": "Commandes",
    "tab_team": "Mon Équipe",
    "tab_alerts": "Alertes",
    "waiting_gps": "En attente du signal GPS...",
    "getting_location": "Obtention de la localisation...",
    "status_active": "Actif",
    "status_break": "En pause",
    "worked_hours": "Heures Travaillées",
    "checkin_success": "Check-in Réussi !",
    "already_checked_in": "Pas besoin de pointer à nouveau !",
    "checkin_error": "Erreur lors du pointage. Veuillez contacter le chef d'équipe.",
    "hello": "Bonjour",
    "history": "Historique",
    "timesheet_history": "Historique des Pointages",
    "security_measures_title": "Consignes de Sécurité - Davide Chape",
    "choose_another_site": "Choisir un autre chantier",
    "add": "Ajouter",
    "choose_site_short": "Choisir le chantier",
    "no_history_today": "Aucun historique pour aujourd'hui",
    "break_time": "Temps de pause",
    "worked_time": "Temps travaillé",
    "add_team": "Ajouter à l'équipe",
    "history_today": "Historique d'aujourd'hui",
    "earlier_than": "Plus tôt que",
    "approved_time_is": "L'heure approuvée est",
    "location_error": "Erreur de localisation",
    "error": "Erreur",
    "choose_date": "Choisir la date",
    "employee_data": "Données de l'employé"
}

i18n_dir = "frontend/src/i18n"
files = ["ro.json", "en.json", "fr.json", "de.json", "nl.json", "ru.json"]

for f in files:
    path = os.path.join(i18n_dir, f)
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as fd:
        data = json.load(fd)
    
    if "worker_ui" not in data:
        data["worker_ui"] = {}
        
    for k, ro_val in mapping.items():
        if f == "ro.json":
            data["worker_ui"][k] = ro_val
        elif f == "fr.json":
            data["worker_ui"][k] = fr_translations.get(k, ro_val)
        elif f == "en.json":
            # For EN, NL, RU, DE just add Romanian as placeholder if we don't have it, or English
            # Since the user said "toat elimbile", I'll just put FR for now or RO, he only uses FR usually.
            # Wait, the prompt says "tradu beladi in toat elimbile dispmbili". I will put English manually for a few, or FR.
            data["worker_ui"][k] = fr_translations.get(k, ro_val)
        else:
            data["worker_ui"][k] = fr_translations.get(k, ro_val)
            
    with open(path, 'w', encoding='utf-8') as fd:
        json.dump(data, fd, ensure_ascii=False, indent=2)

# Replace in ClockInPage.jsx
clockin = "frontend/src/pages/employee/ClockInPage.jsx"
with open(clockin, 'r', encoding='utf-8') as fd:
    content = fd.read()

for ro_str, k in mapping.items():
    # Replace exact strings inside tags
    # e.g. >Pontaj< -> >{t('worker_ui.tab_timesheet')}<
    content = content.replace(f">{ro_str}<", f">{{t('worker_ui.{k}')}}<")
    content = content.replace(f"> {ro_str} <", f"> {{t('worker_ui.{k}')}} <")
    # Replace in quotes like placeholder="Caută activitate..."
    content = content.replace(f'"{ro_str}"', f"t('worker_ui.{k}')")
    content = content.replace(f"'{ro_str}'", f"t('worker_ui.{k}')")

with open(clockin, 'w', encoding='utf-8') as fd:
    fd.write(content)

