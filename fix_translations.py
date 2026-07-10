import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

translations = {
    'Photosle adaugate aici sunt <strong>interne</strong>. Nu apar in link-ul clientului si nu sunt poze de finalizare.': 'Les photos ajoutées ici sont <strong>internes</strong>. Elles n\'apparaissent pas dans le lien client.',
    'Se incarca...': 'Chargement...',
    'Adauga poza interna': 'Ajouter photo interne',
    'Photos de finalizare necesare:': 'Photos de finalisation requises :',
    'Adminul va trimite link-ul clientului pentru semnatura digitala.': 'L\'admin enverra le lien de signature au client.',
    'Anulează Finalizarea (Corectează datele)': 'Annuler la finalisation',
    "showToast('Poza adaugata.', 'success')": "showToast('Photo ajoutée.', 'success')",
    "'Eroare la finalizare.'": "'Erreur de finalisation.'",
    "'Se finalizeaza...'": "'Finalisation en cours...'",
    "'Finalizeaza comanda'": "'Finaliser la commande'",
    "'Adauga datele necesare'": "'Ajouter les données nécessaires'",
    'alt="Poza finalizare"': 'alt="Photo finalisation"',
    "alert('Sincronizat": "showToast('Synchronisé",
    "alert('Eroare": "showToast('Erreur"
}

for k, v in translations.items():
    c = c.replace(k, v)

with open(f, 'w') as file:
    file.write(c)
