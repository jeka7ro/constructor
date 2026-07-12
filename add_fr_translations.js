const fs = require('fs');

const frPath = 'frontend/src/i18n/fr.json';
let frJson = JSON.parse(fs.readFileSync(frPath, 'utf8'));

const updates = {
  "isoflex": {
    "open_robaws": "Ouvrir dans Robaws",
    "load_error": "Erreur de chargement",
    "sync_error": "Erreur de synchronisation",
    "error": "Erreur",
    "col_date": "Date",
    "col_team": "Équipe",
    "col_address": "Adresse",
    "col_in_system": "Dans le système",
    "sync_title": "Synchroniser depuis Robaws",
    "loading": "Chargement...",
    "no_results": "Aucun résultat trouvé.",
    "next_page": "Suivant"
  },
  "reports": {
    "error_load": "Erreur de chargement des rapports :",
    "unknown_team": "Équipe Inconnue",
    "col_team": "Équipe",
    "col_works": "Chantiers",
    "col_sand": "Sable Consommé",
    "no_works": "Aucun chantier terminé dans cette période.",
    "choose_another_period": "Choisissez une autre période de temps.",
    "order": "commande",
    "kpi_volume": "Volume Total",
    "kpi_vol_sub": "m² de chape coulés",
    "kpi_sand": "Sable Consommé",
    "kpi_sand_sub": "Tonnes extraites de l'application",
    "kpi_routes": "Trajets (Total)",
    "kpi_routes_sub": "Kilomètres parcourus au total",
    "chart_title": "Axe du Temps : Volume coulé vs Kilomètres parcourus",
    "team_report_desc": "Comparez les performances des équipes en fonction du kilométrage, de la consommation et du volume.",
    "no_data": "Aucune donnée."
  },
  "teams": {
    "save_error": "Une erreur est survenue lors de l'enregistrement de l'équipe",
    "site": "Chantier",
    "edit_team": "Éditer l'équipe",
    "site_optional": "Chantier (Optionnel)",
    "no_site": "Aucun chantier alloué",
    "calendar_color": "Couleur allouée sur le calendrier"
  },
  "employees": {
    "select_id_card_first": "Sélectionnez d'abord une image de la pièce d'identité.",
    "scan_error_title": "Erreur de numérisation",
    "scan_error_msg": "Nous n'avons pas pu lire la pièce d'identité. Veuillez saisir les données manuellement.",
    "change_photo": "Changer la photo (Admins autorisés uniquement)",
    "ocr_title": "Extraction Automatique des Données (OCR)",
    "upload_photo_pdf": "Télécharger Photo / PDF",
    "view_previous_doc": "Voir le document précédent",
    "id_series": "Série et Numéro CI",
    "birth_place": "Lieu de Naissance",
    "birth_place_placeholder": "ex: Paris"
  },
  "warehouse": {
    "units": {
      "buc": "pcs",
      "mp": "m²",
      "roll": "rouleau"
    },
    "tool_functional": "Outil reçu — FONCTIONNEL",
    "tool_defective": "Outil reçu — DÉFECTUEUX",
    "tool_lost": "Outil marqué comme PERDU",
    "errors": {
      "confirm": "Erreur de confirmation",
      "load_stock": "Erreur de chargement des stocks",
      "load_history": "Erreur de chargement de l'historique",
      "delete_tx": "Erreur lors de la suppression",
      "delete_txs": "Erreur lors de la suppression multiple",
      "delete_item": "Erreur lors de la suppression de l'article",
      "assign": "Erreur lors de l'attribution",
      "receive": "Erreur lors de la réception",
      "update_status": "Erreur de mise à jour du statut",
      "save_tx": "Erreur d'enregistrement",
      "update": "Erreur de mise à jour"
    },
    "delete_tx": {
      "title": "Supprimer la transaction",
      "message": "Êtes-vous sûr de vouloir supprimer cette transaction ? Le stock sera mis à jour."
    },
    "tx_deleted": "Transaction supprimée",
    "delete_multi": {
      "title": "Suppression Multiple",
      "message": "Êtes-vous sûr de vouloir supprimer ces transactions ?"
    },
    "txs_deleted": "Transactions supprimées",
    "tool_created_assigned": "Outil créé et ajouté directement sur le chantier",
    "item_created_add_tx": "Article créé ! Ajoutez maintenant une transaction d'Entrée.",
    "delete_item": {
      "message": "Êtes-vous sûr de vouloir supprimer cet article ? L'historique sera perdu."
    },
    "item_deleted": "Article supprimé",
    "tool_assigned": "Outil attribué avec succès",
    "checkin_confirm": {
      "default": "Êtes-vous sûr d'avoir reçu l'outil en retour ?",
      "both": "Êtes-vous sûr d'avoir reçu l'outil en retour de la part de {{name}} (chantier {{site}}) ?",
      "site": "Êtes-vous sûr d'avoir reçu l'outil en retour du chantier {{site}} ?",
      "holder": "Êtes-vous sûr d'avoir reçu l'outil en retour de {{name}} ?"
    },
    "checkin_tool": "Réception de l'outil",
    "tool_received": "Outil reçu",
    "tool_functional_marked": "Outil marqué comme fonctionnel",
    "tool_defective_marked": "Outil marqué comme défectueux",
    "invalid_quantity": "Entrez une quantité valide",
    "tx_updated": "Transaction mise à jour",
    "txs_saved": "Transactions enregistrées",
    "unit": "Unité",
    "status": {
      "in_field": "Sur le terrain",
      "at_site": "Au chantier"
    },
    "out": "Sortie",
    "nobody_warehouse": "— Personne (Retour à l'entrepôt) —",
    "transactions_selected": "transactions sélectionnées",
    "notes_attachment": "Notes / Pièce jointe",
    "actions": "Actions",
    "no_transactions": "Aucune transaction trouvée.",
    "edit_transaction": "Modifier la transaction",
    "delete_transaction": "Supprimer la transaction",
    "pending_return_count": "{{count}} outil en attente de confirmation",
    "workers_returned_confirm": "Les ouvriers ont retourné l'outil — confirmez l'état",
    "functional": "Fonctionnel",
    "lost": "Perdu",
    "out_abbr": "Sort.",
    "total": "Total",
    "add_out": "Ajouter Sortie",
    "edit_item": "Modifier l'article",
    "assign_to_site": "Attribuer au chantier",
    "destination_site_optional": "Chantier de destination (Optionnel)",
    "no_site": "Ne pas associer de chantier...",
    "employee_person_optional": "Employé (Optionnel)",
    "no_employee": "Ne pas associer d'employé...",
    "confirm_handover": "Confirmer la remise",
    "model_optional": "Modèle (Optionnel)",
    "inventory_code_optional": "Code d'inventaire (Optionnel)",
    "allocate_to_site_optional": "Allouer au chantier (Optionnel)",
    "no_general_warehouse": "— Non (Entrepôt Général) —",
    "stock_out": "Sortie de stock",
    "site_optional": "Chantier (Optionnel)",
    "employee_person": "Employé / Personne",
    "choose_employees": "Choisir les employés...",
    "vehicle_machine": "Véhicule / Machine",
    "attachment_optional": "Pièce jointe (Optionnel)",
    "notes_optional": "Notes (Optionnel)"
  },
  "common": {
    "error": "Erreur",
    "error_loading": "Erreur de chargement",
    "updated_successfully": "Mis à jour avec succès",
    "update_error": "Erreur de mise à jour",
    "delete_error": "Erreur de suppression",
    "selected": "sélectionné(s)",
    "bulk_delete_title": "Suppression Multiple",
    "delete_selected": "Supprimer la Sélection",
    "save_changes": "Enregistrer",
    "password": "Mot de passe",
    "id": "ID",
    "employee": "Employé",
    "of": "sur",
    "previous": "Précédent",
    "next": "Suivant",
    "qty": "Qté",
    "site_label": "Chantier :",
    "rejected": "Rejeté",
    "approved": "Approuvé",
    "admin": "Admin",
    "add_comment_optional": "Ajouter un commentaire (optionnel)...",
    "unknown_client": "Client Inconnu",
    "expired": "Expiré",
    "expires_in_days": "Expire dans {{count}} jours",
    "approved_upper": "APPROUVÉ",
    "name_required": "Le nom complet est obligatoire.",
    "select_all": "Tout sélectionner",
    "save_error": "Erreur d'enregistrement",
    "all_sites": "Tous les chantiers",
    "show": "Afficher"
  },
  "dashboard": {
    "live_tracking": "SUIVI EN DIRECT",
    "quick_create": {
      "client_mandatory": "Client *",
      "work_type": "Type de travaux (TVA)",
      "apply_vat": "Appliquer la TVA",
      "work_new": "Neuf (< 10 ans)",
      "work_repair": "Rénovation (> 10 ans)",
      "surface_mandatory": "Surface (m²) *",
      "thickness_mandatory": "Épaisseur (cm) *",
      "include_fiber": "Inclure Fibres"
    },
    "fleet_alerts": "Alertes Flotte",
    "need_to_deliver": "À Livrer",
    "all_delivered": "Tout a été livré",
    "recently_delivered": "Récemment Livré"
  },
  "quotes": {
    "geo_unsupported": "La géolocalisation n'est pas prise en charge.",
    "geo_error": "Impossible de récupérer la position.",
    "surface_thickness": "Surface / Épaisseur"
  },
  "status": {
    "in_progress": "En cours"
  },
  "general": {
    "today": "Aujourd'hui",
    "order": "chantier",
    "orders": "chantiers",
    "sand": "Sable",
    "from_prev": "du chantier précédent",
    "from_base": "de la base",
    "no_orders_day": "Aucun chantier ce jour."
  },
  "weather": {
    "location": "Météo locale",
    "no_location": "Lieu non spécifié",
    "start": "Début",
    "feels_like": "Ressenti",
    "wind": "Vent",
    "humidity": "Humidité"
  },
  "live": {
    "ago_sec": "il y a {{count}}s",
    "ago_min": "il y a {{count}}m",
    "ago_h": "il y a {{count}}h",
    "active": "actif",
    "last_seen": "Vu",
    "speed": "Vitesse"
  },
  "nav": {
    "isoflex_history": "Historique Isoflex",
    "pricing_settings": "Tarifs"
  },
  "accommodations": {
    "acc_updated": "Hébergement mis à jour",
    "acc_added": "Hébergement ajouté",
    "delete_msg": "Êtes-vous sûr de vouloir supprimer cet hébergement ?",
    "remove_worker_msg": "Êtes-vous sûr de vouloir retirer cet ouvrier ?",
    "workers_housed": "ouvriers hébergés",
    "col_employee": "Employé",
    "col_to": "Jusqu'au",
    "col_actions": "Actions",
    "total_label": "Total :",
    "selected": "sélectionnés"
  },
  "clients": {
    "vies_error": "L'entreprise n'a pas été trouvée. Vérifiez le code TVA.",
    "billing_address": "Adresse de facturation (optionnel)"
  },
  "workorders": {
    "surface_required": "La surface est requise."
  },
  "users_modal": {
    "role_required": "Sélectionnez un rôle.",
    "password": "Mot de passe",
    "leave_blank": "(Laissez vide pour conserver)",
    "new_password": "Nouveau mot de passe",
    "repeat_password": "Répéter le mot de passe",
    "leave_blank_short": "(Laissez vide)",
    "confirm_password": "Confirmer le mot de passe"
  },
  "users": {
    "delete_confirm_msg": "Êtes-vous sûr de vouloir supprimer l'utilisateur ",
    "deleted": "Utilisateur supprimé."
  },
  "sites": {
    "urgency": {
      "on_track": "En bonne voie",
      "urgent": "Urgent",
      "overdue": "En retard",
      "completed": "Terminé"
    },
    "total_km": "KM Total"
  },
  "transport": {
    "total_km": "KM Totaux",
    "total_trips_kpi": "Trajets Totaux"
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

frJson = deepMerge(frJson, updates);

fs.writeFileSync(frPath, JSON.stringify(frJson, null, 2), 'utf8');
console.log('Successfully added missing translations to fr.json');
