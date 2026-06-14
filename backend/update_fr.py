import json

with open('frontend/src/i18n/fr.json', 'r') as f:
    data = json.load(f)

if "work_order_detail" not in data:
    data["work_order_detail"] = {}

wod = data["work_order_detail"]

if "general_details" not in wod:
    wod["general_details"] = {}

wod["general_details"].update({
    "title": "DÉTAILS GÉNÉRAUX",
    "id": "ID COMMANDE",
    "status": "STATUT",
    "team_leader": "CHEF D'ÉQUIPE (CONFIRMATION)",
    "client": "CLIENT",
    "estimated_price": "PRIX ESTIMÉ",
    "team_leader_short": "CHEF D'ÉQUIPE",
    "client_beneficiary": "BÉNÉFICIAIRE"
})

if "status" not in wod:
    wod["status"] = {}

wod["status"].update({
    "acknowledged_on": "A pris connaissance le",
    "note": "Note :",
    "opened_on": "A ouvert la commande le",
    "not_acknowledged": "N'a pas encore pris connaissance",
    "confirmed": "Confirmé",
    "awaiting_confirmation": "En attente",
    "confirmed_by": "Confirmé par",
    "at_date": "le",
    "not_confirmed_by_client": "Non confirmé par le client"
})

with open('frontend/src/i18n/fr.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Updated fr.json")
