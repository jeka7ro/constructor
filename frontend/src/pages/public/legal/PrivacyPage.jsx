import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-8 sm:p-10">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Politique de Confidentialité</h1>
                    <div className="prose prose-blue max-w-none text-slate-600">
                        <p className="font-semibold text-slate-800">Date de dernière mise à jour : {new Date().toLocaleDateString('fr-BE')}</p>
                        
                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Identité du Responsable de Traitement</h2>
                        <p>
                            Dans le cadre de l'utilisation de l'application SaaS par les employés, l'employeur (l'entreprise cliente) agit en qualité de <strong>Responsable de Traitement</strong> au sens du Règlement Général sur la Protection des Données (RGPD). Le fournisseur de l'application (le Prestataire) agit en qualité de <strong>Sous-traitant</strong>.
                        </p>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 mb-2">
                            <h3 className="font-bold text-slate-800 text-sm mb-2">Responsable de Traitement :</h3>
                            <ul className="text-sm space-y-1 text-slate-600">
                                <li><strong>DAVIDE CHAPE</strong></li>
                                <li>Siège social : Gemeentehuisstraat 27 box 5, 1740 Ternat, Belgique</li>
                                <li>Numéro d'entreprise (BCE) : 0785.292.895</li>
                            </ul>
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. Données Personnelles Collectées</h2>
                        <p>
                            Les données traitées via l'application incluent :
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Données d'identification :</strong> Nom, prénom, code employé, numéro de téléphone, adresse email, coordonnées.</li>
                                <li><strong>Données de géolocalisation :</strong> Position GPS de l'appareil utilisé lors de l'activation du pointage ou des trajets logistiques.</li>
                                <li><strong>Données professionnelles :</strong> Horaires de travail, affectations aux chantiers, documents administratifs (carte d'identité, permis).</li>
                            </ul>
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Finalités et Base Légale</h2>
                        <p>
                            Le traitement des données est fondé sur l'exécution du contrat de travail (Article 6.1.b du RGPD) et sur l'intérêt légitime de l'employeur (Article 6.1.f) pour :
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Le calcul et la gestion des heures de travail et de la paie.</li>
                                <li>L'optimisation des trajets et la gestion de la flotte de véhicules.</li>
                                <li>La sécurité des employés et des équipements sur les chantiers.</li>
                            </ul>
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">4. Durée de Conservation des Données</h2>
                        <p>
                            Le Sous-traitant conserve les données personnelles tant que le contrat avec le Responsable de Traitement est actif. Les données de géolocalisation détaillées sont conservées selon les prescriptions de l'Autorité de protection des données (généralement 2 mois maximum pour les détails de trajets de flotte, sauf justification légale). Les données comptables et de pointage peuvent être conservées jusqu'à 5 ans conformément à la législation fiscale et sociale belge.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">5. Sécurité et Sous-traitance Ultérieure</h2>
                        <p>
                            Le Prestataire met en œuvre des mesures de sécurité techniques et organisationnelles conformes aux standards de l'industrie (chiffrement, accès restreints) pour protéger les données. Les données sont hébergées au sein de l'Union Européenne. Le recours à des sous-traitants ultérieurs (ex. hébergeurs cloud) est régi par des accords stricts garantissant un niveau de protection équivalent.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">6. Vos Droits (RGPD)</h2>
                        <p>
                            En tant que personne concernée, vous disposez des droits suivants concernant vos données personnelles :
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Droit d'accès et de rectification.</li>
                                <li>Droit à l'effacement ("droit à l'oubli") ou à la limitation du traitement, sous réserve des obligations légales de conservation de votre employeur.</li>
                                <li>Droit à la portabilité des données.</li>
                            </ul>
                            Pour exercer ces droits, vous devez vous adresser directement à votre employeur (le Responsable de Traitement), qui transmettra votre requête au Prestataire le cas échéant. Vous avez également le droit d'introduire une réclamation auprès de l'Autorité de protection des données belge (APD) à l'adresse <strong>contact@apd-gba.be</strong>.
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
