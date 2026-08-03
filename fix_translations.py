import json
import os

files = {
    "ro.json": {
        "message_updated": "Mesaj actualizat",
        "error_updating_message": "Eroare la actualizarea mesajului",
        "message_hidden": "Mesaj ascuns de client",
        "message_visible": "Mesaj vizibil pentru client",
        "error_toggling_visibility": "Eroare la modificarea vizibilității",
        "hidden_from_client": "Ascuns de client",
        "show_to_client": "Afișează la client",
        "hide_from_client": "Ascunde de la client",
        "edit_message": "Editează mesajul",
        "mark_unread": "Marchează ca necitit"
    },
    "fr.json": {
        "message_updated": "Message mis à jour",
        "error_updating_message": "Erreur lors de la mise à jour du message",
        "message_hidden": "Message masqué au client",
        "message_visible": "Message visible pour le client",
        "error_toggling_visibility": "Erreur lors de la modification de la visibilité",
        "hidden_from_client": "Masqué au client",
        "show_to_client": "Afficher au client",
        "hide_from_client": "Masquer au client",
        "edit_message": "Éditer le message",
        "mark_unread": "Marquer comme non lu"
    }
}

for filename, translations in files.items():
    filepath = os.path.join("frontend/src/i18n", filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "admin" not in data:
            data["admin"] = {}
            
        for key, val in translations.items():
            data["admin"][key] = val
            
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Updated {filename}")
