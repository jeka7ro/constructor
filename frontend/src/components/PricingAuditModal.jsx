import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPrice } from '../utils/pricingEngine';

export default function PricingAuditModal({ isOpen, onClose, wo, pricingSettings, activePrices, totals }) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const formatCurrency = (val) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val || 0);

    // Helper for analyzing where a price came from
    const getPriceSource = (clientPrice, defaultPrice, hardcodedFallback) => {
        if (clientPrice !== undefined && clientPrice !== null && clientPrice !== '') {
            return {
                value: parseFloat(clientPrice),
                sourceType: 'client',
                label: t('audit.source_client', 'Tarif Préférentiel Client'),
                isZero: parseFloat(clientPrice) === 0
            };
        }
        
        if (defaultPrice !== undefined && defaultPrice !== null && defaultPrice !== '') {
            return {
                value: parseFloat(defaultPrice),
                sourceType: 'settings',
                label: t('audit.source_settings', 'Tarif Général (Paramètres)'),
                isZero: parseFloat(defaultPrice) === 0
            };
        }

        return {
            value: parseFloat(hardcodedFallback),
            sourceType: 'fallback',
            label: t('audit.source_system', 'Valeur par défaut du système'),
            isZero: false
        };
    };

    // Calculate core metrics for display
    const actualSurface = parseFloat(wo?.actual_surface_m2 || 0) > 0 
        ? parseFloat(wo.actual_surface_m2) 
        : (wo?.volumes || []).reduce((sum, v) => {
            const lbl = (v.label || '').toLowerCase();
            if (/chape|sapa|[sșş]ap[aăâ]/i.test(lbl)) return sum + (parseFloat(v.quantity) || 0);
            return sum;
        }, 0);
        
    const distanceKm = parseFloat(activePrices?.distance_km || 0);
    const isLarge = actualSurface > (pricingSettings?.base_large_threshold_sqm || 200);
    
    const baseAudit = getPriceSource(
        activePrices?.base, 
        isLarge ? pricingSettings?.base_price_sqm_large : pricingSettings?.base_price_sqm, 
        12.5
    );
    
    const foilAudit = getPriceSource(activePrices?.foil, pricingSettings?.plastic_foil_price_sqm, 1.2);
    const meshAudit = getPriceSource(activePrices?.mesh, pricingSettings?.metal_mesh_price_sqm, 2.5);
    const fiberAudit = getPriceSource(
        activePrices?.fiber, 
        isLarge ? pricingSettings?.fiber_price_sqm_large : pricingSettings?.fiber_price_sqm, 
        isLarge ? 2.0 : 2.5
    );

    // Transport Audit
    let truckCost = parseFloat(activePrices?.truck_cost || 0);
    let truckAudit = { value: truckCost, label: t('audit.source_saved', 'Sauvegardé dans la commande'), type: 'saved' };
    
    if (truckCost <= 0 && pricingSettings && distanceKm > 0) {
        const truckFlat = parseFloat(pricingSettings.truck_extra_price_flat || 0);
        const distThreshold = parseFloat(pricingSettings.truck_distance_threshold_km || 50);
        const surfThreshold = parseFloat(pricingSettings.truck_surface_threshold_free_sqm || 500);
        
        if (truckFlat > 0 && distanceKm > distThreshold && actualSurface <= surfThreshold) {
            truckCost = truckFlat;
            truckAudit = { 
                value: truckFlat, 
                label: t('audit.source_calc', 'Calculé Automatiquement (Distance > Seuil & Surface < Seuil)'),
                type: 'auto'
            };
        } else {
            truckAudit = { 
                value: 0, 
                label: t('audit.source_free', 'Gratuit (Distance <= Seuil ou Surface > Seuil)'),
                type: 'free'
            };
        }
    }

    const renderSourceBadge = (auditItem) => {
        if (auditItem.sourceType === 'client') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"><ShieldCheck className="w-3 h-3" /> {auditItem.label}</span>;
        }
        if (auditItem.sourceType === 'settings') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"><Info className="w-3 h-3" /> {auditItem.label}</span>;
        }
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"><AlertTriangle className="w-3 h-3" /> {auditItem.label}</span>;
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {t('audit.title', 'Audit des Prix et Calcules')}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('audit.subtitle', 'Transparence totale sur la source de chaque tarif')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('audit.parameters', 'Paramètres Clés de la Commande')}</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('audit.total_surface', 'Surface Totale')}</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{actualSurface} m²</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('audit.distance', 'Distance (Aller simple)')}</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{distanceKm} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('audit.is_large', 'Seuil de Volume (>200m²)')}</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{isLarge ? t('common.yes', 'Oui') : t('common.no', 'Non')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3">{t('audit.single_source', 'Source Unique de Vérité')}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                {t('audit.explanation', 'Le système utilise toujours les tarifs généraux, sauf si un tarif spécifique est configuré pour ce client.')}
                            </p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('audit.zero_allowed', "Un tarif préférentiel de 0 EUR est autorisé et respecté (ex: gratuité).")}
                            </p>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('audit.breakdown', 'Détail des Lignes de Facturation')}</h3>
                    
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('audit.col_item', 'Article')}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('audit.col_calc', 'Calcul (Qté × Prix)')}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('audit.col_source', 'Source du Tarif')}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 text-right">{t('audit.col_total', 'Total')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                
                                {/* Base Chape */}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t('audit.item_chape', 'Chape Base')}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 tabular-nums">
                                        {actualSurface} m² × {formatCurrency(baseAudit.value)}
                                    </td>
                                    <td className="px-4 py-3">{renderSourceBadge(baseAudit)}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right tabular-nums">
                                        {formatCurrency(actualSurface * baseAudit.value)}
                                    </td>
                                </tr>

                                {/* Foil */}
                                {wo?.flags?.has_foil && (
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t('audit.item_foil', 'Film Plastique')}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 tabular-nums">
                                            {actualSurface} m² × {formatCurrency(foilAudit.value)}
                                        </td>
                                        <td className="px-4 py-3">{renderSourceBadge(foilAudit)}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right tabular-nums">
                                            {formatCurrency(actualSurface * foilAudit.value)}
                                        </td>
                                    </tr>
                                )}

                                {/* Mesh */}
                                {wo?.flags?.has_mesh && (
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t('audit.item_mesh', 'Treillis Métallique')}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 tabular-nums">
                                            {actualSurface} m² × {formatCurrency(meshAudit.value)}
                                        </td>
                                        <td className="px-4 py-3">{renderSourceBadge(meshAudit)}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right tabular-nums">
                                            {formatCurrency(actualSurface * meshAudit.value)}
                                        </td>
                                    </tr>
                                )}

                                {/* Fiber */}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t('audit.item_fiber', 'Fibre / Duramint')}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 tabular-nums">
                                        {actualSurface} m² × {formatCurrency(fiberAudit.value)}
                                    </td>
                                    <td className="px-4 py-3">{renderSourceBadge(fiberAudit)}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right tabular-nums">
                                        {formatCurrency(actualSurface * fiberAudit.value)}
                                    </td>
                                </tr>

                                {/* Transport */}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t('audit.item_transport', 'Frais de Déplacement')}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        {distanceKm > 0 ? `${distanceKm} km` : t('common.not_applicable', 'N/A')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            truckAudit.type === 'free' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                            truckAudit.type === 'auto' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                            'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                            {truckAudit.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right tabular-nums">
                                        {formatCurrency(truckCost)}
                                    </td>
                                </tr>

                            </tbody>
                            <tfoot className="bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                                <tr>
                                    <td colSpan="3" className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                                        {t('audit.net_total_calculated', 'Total Net (Résultat Audit)')}
                                    </td>
                                    <td className="px-4 py-4 font-black text-lg text-indigo-600 dark:text-indigo-400 text-right tabular-nums">
                                        {formatCurrency(totals?.total_net || 0)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
