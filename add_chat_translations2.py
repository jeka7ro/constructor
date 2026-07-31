import json
import os

translations = {
    'client_communication': {'ro': "Comunicare cu clientul", 'fr': "Communication avec le client", 'en': "Client communication", 'de': "Kundenkommunikation", 'nl': "Klantcommunicatie"},
    'no_messages_yet': {'ro': "Niciun mesaj încă. Începeți conversația!", 'fr': "Aucun message pour l'instant. Commencez la conversation!", 'en': "No messages yet. Start the conversation!", 'de': "Noch keine Nachrichten. Beginnen Sie das Gespräch!", 'nl': "Nog geen berichten. Start het gesprek!"},
    'mark_read': {'ro': "Marchează citite", 'fr': "Marquer comme lu", 'en': "Mark as read", 'de': "Als gelesen markieren", 'nl': "Markeren als gelezen"},
    'no_new_messages': {'ro': "Nu ai mesaje noi.", 'fr': "Vous n'avez pas de nouveaux messages.", 'en': "You have no new messages.", 'de': "Sie haben keine neuen Nachrichten.", 'nl': "U heeft geen nieuwe berichten."},
    'new_badge': {'ro': "Nou", 'fr': "Nouveau", 'en': "New", 'de': "Neu", 'nl': "Nieuw"},
    'work_order_label': {'ro': "Lucrare:", 'fr': "Commande:", 'en': "Work Order:", 'de': "Auftrag:", 'nl': "Werkorder:"},
    'open': {'ro': "Deschide", 'fr': "Ouvrir", 'en': "Open", 'de': "Öffnen", 'nl': "Openen"}
}

i18n_dir = 'frontend/src/i18n'
files = ['ro.json', 'fr.json', 'en.json', 'de.json', 'nl.json']

for filename in files:
    lang = filename.split('.')[0]
    filepath = os.path.join(i18n_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'admin' not in data:
            data['admin'] = {}
            
        for key, val in translations.items():
            if key not in data['admin']:
                data['admin'][key] = val.get(lang, val.get('en', ''))
                
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Updated {filename}")
