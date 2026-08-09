import json
import os

files = {
    'fr.json': {
        'backups': {
            'title': 'Sauvegardes du Système',
            'subtitle': 'Consultez et téléchargez les sauvegardes automatiques de la base de données.',
            'filename': 'Nom du fichier',
            'size': 'Taille',
            'download_btn': 'Télécharger',
            'fetch_error': 'Erreur lors du chargement des sauvegardes.',
            'downloading': 'Préparation du téléchargement...',
            'download_ready': 'Téléchargement prêt!',
            'download_error': 'Erreur lors du téléchargement de la sauvegarde.',
            'empty': 'Aucune sauvegarde trouvée.'
        },
        'nav.backups': 'Sauvegardes (Backups)'
    },
    'ro.json': {
        'backups': {
            'title': 'Backup-uri Sistem',
            'subtitle': 'Vizualizează și descarcă copiile de siguranță automate ale bazei de date.',
            'filename': 'Nume fișier',
            'size': 'Mărime',
            'download_btn': 'Descarcă',
            'fetch_error': 'Eroare la încărcarea backup-urilor.',
            'downloading': 'Se pregătește descărcarea...',
            'download_ready': 'Descărcare pregătită!',
            'download_error': 'Eroare la descărcarea fișierului de backup.',
            'empty': 'Nu a fost găsit niciun backup.'
        },
        'nav.backups': 'Copii de Siguranță (Backups)'
    },
    'en.json': {
        'backups': {
            'title': 'System Backups',
            'subtitle': 'View and download automatic database backups.',
            'filename': 'Filename',
            'size': 'Size',
            'download_btn': 'Download',
            'fetch_error': 'Error loading backups.',
            'downloading': 'Preparing download...',
            'download_ready': 'Download ready!',
            'download_error': 'Error downloading backup file.',
            'empty': 'No backups found.'
        },
        'nav.backups': 'System Backups'
    },
    'nl.json': {
        'backups': {
            'title': 'Systeem Back-ups',
            'subtitle': 'Bekijk en download automatische database back-ups.',
            'filename': 'Bestandsnaam',
            'size': 'Grootte',
            'download_btn': 'Downloaden',
            'fetch_error': 'Fout bij laden back-ups.',
            'downloading': 'Download voorbereiden...',
            'download_ready': 'Download klaar!',
            'download_error': 'Fout bij downloaden back-upbestand.',
            'empty': 'Geen back-ups gevonden.'
        },
        'nav.backups': 'Systeem Back-ups'
    }
}

# Also update de.json as fallback to English
files['de.json'] = files['en.json']

for filename, translations in files.items():
    filepath = os.path.join('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src/i18n', filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Add to root
        data['backups'] = translations['backups']
        if 'nav' not in data:
            data['nav'] = {}
        data['nav']['backups'] = translations['nav.backups']
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Updated {filename}")

