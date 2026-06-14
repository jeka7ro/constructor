import json
import os

def update_lang(lang, details, status):
    path = f'frontend/src/i18n/{lang}.json'
    if not os.path.exists(path): return
    with open(path, 'r') as f:
        data = json.load(f)

    if "work_order_detail" not in data:
        data["work_order_detail"] = {}

    wod = data["work_order_detail"]

    if "general_details" not in wod:
        wod["general_details"] = {}

    wod["general_details"].update(details)

    if "status" not in wod:
        wod["status"] = {}

    wod["status"].update(status)

    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# EN
update_lang('en', {
    "title": "GENERAL DETAILS",
    "id": "ORDER ID",
    "status": "STATUS",
    "team_leader": "TEAM LEADER (CONFIRMATION)",
    "client": "CLIENT",
    "estimated_price": "ESTIMATED PRICE",
    "team_leader_short": "TEAM LEADER",
    "client_beneficiary": "BENEFICIARY"
}, {
    "acknowledged_on": "Acknowledged on",
    "note": "Note:",
    "opened_on": "Opened order on",
    "not_acknowledged": "Not acknowledged yet",
    "confirmed": "Confirmed",
    "awaiting_confirmation": "Awaiting",
    "confirmed_by": "Confirmed by",
    "at_date": "at",
    "not_confirmed_by_client": "Not confirmed by client"
})

# RO
update_lang('ro', {
    "title": "DETALII GENERALE",
    "id": "ID COMANDĂ",
    "status": "STATUS",
    "team_leader": "ȘEF ECHIPĂ (CONFIRMARE)",
    "client": "CLIENT",
    "estimated_price": "PREȚ ESTIMATIV",
    "team_leader_short": "ȘEF ECHIPĂ",
    "client_beneficiary": "BENEFICIAR"
}, {
    "acknowledged_on": "A luat la cunoștință pe",
    "note": "Notă:",
    "opened_on": "A deschis comanda pe",
    "not_acknowledged": "Nu a luat la cunoștință încă",
    "confirmed": "Confirmat",
    "awaiting_confirmation": "În așteptare",
    "confirmed_by": "Confirmat de",
    "at_date": "la",
    "not_confirmed_by_client": "Neconfirmat de client"
})

# NL
update_lang('nl', {
    "title": "ALGEMENE DETAILS",
    "id": "ORDER ID",
    "status": "STATUS",
    "team_leader": "TEAMLEIDER (BEVESTIGING)",
    "client": "KLANT",
    "estimated_price": "GESCHATTE PRIJS",
    "team_leader_short": "TEAMLEIDER",
    "client_beneficiary": "BEGUNSTIGDE"
}, {
    "acknowledged_on": "Gelezen op",
    "note": "Opmerking:",
    "opened_on": "Order geopend op",
    "not_acknowledged": "Nog niet gelezen",
    "confirmed": "Bevestigd",
    "awaiting_confirmation": "In afwachting",
    "confirmed_by": "Bevestigd door",
    "at_date": "op",
    "not_confirmed_by_client": "Niet bevestigd door klant"
})

print("Updated i18n")
