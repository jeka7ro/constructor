import json
import os

translations = {
    'error_loading_chats': {'ro': "Eroare la încărcarea conversațiilor", 'fr': "Erreur lors du chargement des conversations", 'en': "Error loading conversations", 'de': "Fehler beim Laden von Konversationen", 'nl': "Fout bij laden conversaties"},
    'error_loading_messages': {'ro': "Eroare la încărcarea mesajelor", 'fr': "Erreur lors du chargement des messages", 'en': "Error loading messages", 'de': "Fehler beim Laden von Nachrichten", 'nl': "Fout bij laden berichten"},
    'chat_is_closed': {'ro': "Acest chat este închis.", 'fr': "Ce chat est fermé.", 'en': "This chat is closed.", 'de': "Dieser Chat ist geschlossen.", 'nl': "Deze chat is gesloten."},
    'error_sending_message': {'ro': "Eroare la trimiterea mesajului", 'fr': "Erreur lors de l'envoi du message", 'en': "Error sending message", 'de': "Fehler beim Senden der Nachricht", 'nl': "Fout bij verzenden bericht"},
    'confirm_delete_message': {'ro': "Sigur ștergi acest mesaj?", 'fr': "Êtes-vous sûr de supprimer ce message?", 'en': "Are you sure you want to delete this message?", 'de': "Möchten Sie diese Nachricht wirklich löschen?", 'nl': "Weet u zeker dat u dit bericht wilt verwijderen?"},
    'message_deleted': {'ro': "Mesaj șters", 'fr': "Message supprimé", 'en': "Message deleted", 'de': "Nachricht gelöscht", 'nl': "Bericht verwijderd"},
    'error_deleting_message': {'ro': "Eroare la ștergerea mesajului", 'fr': "Erreur lors de la suppression du message", 'en': "Error deleting message", 'de': "Fehler beim Löschen der Nachricht", 'nl': "Fout bij verwijderen bericht"},
    'confirm_reopen_chat': {'ro': "Redeschizi acest chat?", 'fr': "Rouvrir ce chat?", 'en': "Reopen this chat?", 'de': "Diesen Chat wieder öffnen?", 'nl': "Deze chat heropenen?"},
    'confirm_close_chat': {'ro': "Închizi acest chat? Clientul nu va mai putea trimite mesaje.", 'fr': "Fermer ce chat? Le client ne pourra plus envoyer de messages.", 'en': "Close this chat? The client will no longer be able to send messages.", 'de': "Diesen Chat schließen? Der Kunde kann keine Nachrichten mehr senden.", 'nl': "Deze chat sluiten? De klant kan geen berichten meer verzenden."},
    'chat_reopened': {'ro': "Chat redeschis", 'fr': "Chat rouvert", 'en': "Chat reopened", 'de': "Chat wieder geöffnet", 'nl': "Chat heropend"},
    'chat_closed': {'ro': "Chat închis", 'fr': "Chat fermé", 'en': "Chat closed", 'de': "Chat geschlossen", 'nl': "Chat gesloten"},
    'client_messages': {'ro': "Mesaje Clienți", 'fr': "Messages Clients", 'en': "Client Messages", 'de': "Kunden Nachrichten", 'nl': "Klantberichten"},
    'search_quote_client': {'ro': "Caută deviz sau client...", 'fr': "Rechercher devis ou client...", 'en': "Search quote or client...", 'de': "Angebot oder Kunde suchen...", 'nl': "Zoek offerte of klant..."},
    'no_conversations': {'ro': "Nu există conversații încă.", 'fr': "Aucune conversation pour le moment.", 'en': "No conversations yet.", 'de': "Noch keine Konversationen.", 'nl': "Nog geen conversaties."},
    'unknown_client': {'ro': "Client Necunoscut", 'fr': "Client Inconnu", 'en': "Unknown Client", 'de': "Unbekannter Kunde", 'nl': "Onbekende Klant"},
    'no_text_message': {'ro': "Niciun mesaj text", 'fr': "Aucun message texte", 'en': "No text message", 'de': "Keine Textnachricht", 'nl': "Geen tekstbericht"},
    'closed': {'ro': "Închis", 'fr': "Fermé", 'en': "Closed", 'de': "Geschlossen", 'nl': "Gesloten"},
    'client': {'ro': "Client", 'fr': "Client", 'en': "Client", 'de': "Kunde", 'nl': "Klant"},
    'view_details': {'ro': "Vezi Detalii", 'fr': "Voir Détails", 'en': "View Details", 'de': "Details Anzeigen", 'nl': "Details Bekijken"},
    'open_chat': {'ro': "Deschide Chat", 'fr': "Ouvrir Chat", 'en': "Open Chat", 'de': "Chat Öffnen", 'nl': "Chat Openen"},
    'close_chat': {'ro': "Închide Chat", 'fr': "Fermer Chat", 'en': "Close Chat", 'de': "Chat Schließen", 'nl': "Chat Sluiten"},
    'no_messages_in_chat': {'ro': "Nu există mesaje în această conversație.", 'fr': "Il n'y a pas de messages dans cette conversation.", 'en': "There are no messages in this conversation.", 'de': "Es gibt keine Nachrichten in dieser Konversation.", 'nl': "Er zijn geen berichten in deze conversatie."},
    'delete_message': {'ro': "Șterge mesaj", 'fr': "Supprimer le message", 'en': "Delete message", 'de': "Nachricht löschen", 'nl': "Bericht verwijderen"},
    'delete_message_as_admin': {'ro': "Șterge mesaj (ca Admin)", 'fr': "Supprimer le message (Admin)", 'en': "Delete message (Admin)", 'de': "Nachricht löschen (Admin)", 'nl': "Bericht verwijderen (Admin)"},
    'chat_is_closed_cannot_send': {'ro': "Această conversație a fost închisă. Nu se mai pot trimite mesaje.", 'fr': "Cette conversation a été fermée. Vous ne pouvez plus envoyer de messages.", 'en': "This conversation is closed. You can no longer send messages.", 'de': "Diese Konversation ist geschlossen. Sie können keine Nachrichten mehr senden.", 'nl': "Deze conversatie is gesloten. U kunt geen berichten meer verzenden."},
    'type_message': {'ro': "Scrie un mesaj...", 'fr': "Écrire un message...", 'en': "Type a message...", 'de': "Schreibe eine Nachricht...", 'nl': "Typ een bericht..."},
    'no_chat_selected': {'ro': "Niciun chat selectat", 'fr': "Aucun chat sélectionné", 'en': "No chat selected", 'de': "Kein Chat ausgewählt", 'nl': "Geen chat geselecteerd"},
    'select_chat_to_view': {'ro': "Selectează o conversație din stânga pentru a vizualiza mesajele sau a continua discuția cu clientul.", 'fr': "Sélectionnez une conversation à gauche pour voir les messages ou continuer la discussion.", 'en': "Select a conversation on the left to view messages or continue the discussion.", 'de': "Wählen Sie links eine Konversation aus, um Nachrichten anzuzeigen oder die Diskussion fortzusetzen.", 'nl': "Selecteer een conversatie aan de linkerkant om berichten te bekijken of de discussie voort te zetten."}
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
