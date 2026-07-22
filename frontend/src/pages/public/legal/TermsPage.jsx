import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-8 sm:p-10">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Conditions Générales de Vente et d'Utilisation (CGV/CGU)</h1>
                    <div className="prose prose-blue max-w-none text-slate-600">
                        <p className="font-semibold text-slate-800">Date de dernière mise à jour : {new Date().toLocaleDateString('fr-BE')}</p>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 mb-2">
                            <h3 className="font-bold text-slate-800 text-sm mb-2">Éditeur du Service / Prestataire :</h3>
                            <ul className="text-sm space-y-1 text-slate-600">
                                <li><strong>TRADE INVEST NETWORK S.R.L.</strong></li>
                                <li>Siège social : Bucureşti sectorul 1, str. popa savu, nr.78, cod poștal 11434, Roumanie</li>
                                <li>Numéro d'identification (CUI) : 42322117</li>
                                <li>Registre du Commerce : J40/2825/2020</li>
                            </ul>
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Préambule et Champ d'Application</h2>
                        <p>
                            Les présentes Conditions Générales de Vente et d'Utilisation (ci-après les "CGV/CGU") régissent l'accès et l'utilisation de l'application SaaS (le "Service") éditée par le Prestataire. Elles constituent un contrat juridiquement contraignant entre le Prestataire et l'Entreprise cliente (le "Client"). En accédant au Service, le Client accepte expressément et sans réserve les présentes CGV/CGU.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. Description du Service</h2>
                        <p>
                            Le Service est une solution logicielle B2B destinée à la gestion logistique, au pointage du temps de travail, au suivi des chantiers et à la gestion de flotte. Le Prestataire concède au Client un droit d'utilisation non exclusif, non transférable et mondial pour la durée du contrat.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Obligations et Responsabilités du Client</h2>
                        <p>
                            L'accès au Service s'effectue via des identifiants stricts. Le Client s'engage à garantir la confidentialité de ces identifiants. Le Client est l'unique responsable des données saisies dans la plateforme et de leur conformité avec la législation applicable (notamment le droit du travail belge et le RGPD).
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">4. Utilisation de la Géolocalisation (GPS)</h2>
                        <p>
                            Le Service propose une fonctionnalité de suivi de la géolocalisation pour des fins légitimes de gestion logistique, de sécurité et d'optimisation des trajets. Le Client, en tant que Responsable de Traitement, s'engage expressément à informer ses employés et à obtenir leur consentement ou à baser ce traitement sur un fondement légal approprié en vertu du RGPD et des avis de l'Autorité de protection des données (APD) belge.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">5. Disponibilité du Service et SLA</h2>
                        <p>
                            Le Prestataire s'engage à mettre en œuvre tous les moyens raisonnables pour assurer une disponibilité du Service à 99% du temps. Des interruptions temporaires pour maintenance peuvent survenir et seront, dans la mesure du possible, communiquées à l'avance. Le Prestataire ne saurait être tenu responsable d'une perte d'exploitation liée à une indisponibilité temporaire.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">6. Propriété Intellectuelle</h2>
                        <p>
                            Tous les éléments techniques, graphiques, textuels et l'architecture du Service sont la propriété exclusive du Prestataire. Toute reproduction, modification ou ingénierie inverse est strictement interdite. Le Client conserve l'entière propriété des données métier intégrées dans le Service.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">7. Limitation de Responsabilité</h2>
                        <p>
                            La responsabilité du Prestataire est strictement limitée aux dommages directs, prouvés par le Client. Le Prestataire ne pourra en aucun cas être tenu responsable des dommages indirects, incluant mais sans s'y limiter, la perte de données, de chiffre d'affaires, ou de réputation. Le montant cumulé des dommages-intérêts est limité au montant payé par le Client lors des 12 derniers mois.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">8. Résiliation</h2>
                        <p>
                            Le contrat peut être résilié par l'une des parties en cas de manquement grave aux obligations contractuelles, non réparé dans les 30 jours suivant la notification. À l'issue du contrat, l'accès au Service sera révoqué et le Client pourra demander l'exportation ou la destruction de ses données.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">9. Droit Applicable et Juridiction Compétente</h2>
                        <p>
                            Les présentes CGV/CGU sont régies par le droit belge. En cas de litige qui ne pourrait être résolu à l'amiable, les tribunaux de l'arrondissement judiciaire du siège social du Prestataire seront seuls compétents.
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
