import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

translations = {
    "'Draft'": "'Brouillon'",
    "'Trimisa'": "'Envoyée'",
    "'Confirmata'": "'Confirmée'",
    "'In Lucru'": "'En cours'",
    "'Finalizata'": "'Terminée'",
    "'Anulata'": "'Annulée'",
    "'Da, deblocheaza'": "'Oui, débloquer'",
    "'Anuleaza'": "'Annuler'",
    "'Salveaza'": "'Enregistrer'",
    "'Sterge'": "'Supprimer'",
    "'Trimite'": "'Envoyer'",
    "'Actualizare... '": "'Mise à jour... '",
    "'Actualizeaza datele'": "'Mettre à jour les données'",
    "'Date actualizate!'": "'Données mises à jour !'",
    "'Eroare la salvare.'": "'Erreur d\\'enregistrement.'",
    "'Se salveaza...'": "'Enregistrement en cours...'",
    "'Alege o statie...'": "'Choisir une station...'"
}

for k, v in translations.items():
    c = c.replace(k, v)

with open(f, 'w') as file:
    file.write(c)
