import React from 'react';
import { Link } from 'react-router-dom';

export default function DpaPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-8 sm:p-10">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Accord de Traitement des Données (DPA)</h1>
                    <div className="prose prose-blue max-w-none text-slate-600">
                        <p className="font-semibold text-slate-800">Date de dernière mise à jour : {new Date().toLocaleDateString('fr-BE')}</p>
                        
                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Objet</h2>
                        <p>
                            Le présent Accord de Traitement des Données (ci-après le "DPA") constitue une annexe aux Conditions Générales de Vente et d'Utilisation. Il a pour objet de définir les conditions dans lesquelles le Prestataire (le Sous-traitant) s'engage à effectuer, pour le compte de l'Entreprise cliente (le Responsable de Traitement), les opérations de traitement de données à caractère personnel définies ci-après.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. Description du Traitement</h2>
                        <div className="list-disc pl-5 mt-2 space-y-1">
                            <p><strong>Nature et finalité :</strong> Hébergement, maintenance, gestion des accès et traitement algorithmique pour le pointage, la facturation et la géolocalisation des véhicules et employés.</p>
                            <p><strong>Catégories de personnes concernées :</strong> Employés et collaborateurs du Responsable de Traitement.</p>
                            <p><strong>Catégories de données :</strong> Données d'état civil, données de contact, données de géolocalisation, données de connexion et d'horodatage.</p>
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Obligations du Sous-traitant</h2>
                        <p>Le Sous-traitant s'engage à :</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Traiter les données uniquement sur instruction documentée du Responsable de Traitement.</li>
                            <li>Garantir la confidentialité des données à caractère personnel traitées.</li>
                            <li>Veiller à ce que les personnes autorisées à traiter les données s'engagent à en respecter la confidentialité.</li>
                            <li>Prendre en compte les principes de protection des données dès la conception (Privacy by Design).</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">4. Sous-traitance Ultérieure</h2>
                        <p>
                            Le Responsable de Traitement autorise le Sous-traitant à faire appel à des sous-traitants ultérieurs (ex. AWS, Google Cloud pour l'hébergement). Le Sous-traitant informera le Responsable de Traitement de tout changement prévu concernant l'ajout ou le remplacement de sous-traitants ultérieurs, donnant ainsi au Responsable de Traitement la possibilité d'émettre des objections.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">5. Mesures de Sécurité</h2>
                        <p>
                            Le Sous-traitant met en œuvre les mesures techniques et organisationnelles appropriées afin de garantir un niveau de sécurité adapté au risque (chiffrement des flux, cloisonnement des bases de données de chaque locataire/tenant, sauvegardes régulières).
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">6. Notification des Violations de Données</h2>
                        <p>
                            Le Sous-traitant notifie au Responsable de Traitement toute violation de données à caractère personnel dans un délai maximum de 48 heures après en avoir pris connaissance, afin de permettre au Responsable de Traitement de respecter ses propres obligations de notification envers l'APD.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">7. Sort des Données</h2>
                        <p>
                            Au terme de la prestation de services, le Sous-traitant s'engage, au choix du Responsable de Traitement, à détruire toutes les données à caractère personnel ou à les renvoyer, et à détruire les copies existantes, sauf si la législation de l'Union ou d'un État membre exige la conservation de ces données.
                        </p>
                    </div>
                    
                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center">
                        <Link to="/" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                            Retour à l'accueil
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
