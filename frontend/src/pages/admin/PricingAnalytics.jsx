import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calculator, AlertTriangle, CheckCircle2, Search, TrendingUp, FileCheck, FileText, Filter, Info, X, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import DataTable from '../../components/DataTable';
import KPICard from '../../components/KPICard';


const CalculationModal = ({ wo, onClose }) => {
    const { t } = useTranslation();
    const [pdfUrl, setPdfUrl] = useState(null);

    if (!wo) return null;

    const vatRate = wo.vatRate || 0;

    // Determine the PDF URL
    const pdfSource = (wo.is_quote || !wo.is_invoiced) ? `/admin/quotes/${wo.id}/pdf` : (wo.proforma_path || `/proforma/${wo.id}?type=invoice`);

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {wo.client_name || wo.title || t('analytics.quote', 'Devis')}
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {wo.source_system === 'devis_online' ? '🌐 Devis Online' : wo.source_system === 'we-r' ? '🔗 We-R' : '✏️ Manual'} · {wo.work_type === 'repair' ? t('analytics.renovation', 'Rénovation') : t('analytics.new_construction', 'Construction neuve')}
                                    {vatRate > 0 ? ` · ${t('analytics.vat', 'TVA')} ${vatRate}%` : ` · ${t('analytics.without_vat', 'Sans TVA')}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => window.open(`/admin/quotes/${wo.id}`, '_blank')}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-2 shadow-sm border border-blue-200"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">{t('analytics.quote', 'Devis')}</span>
                                </button>
                                <button
                                    onClick={() => setPdfUrl(pdfSource)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-sm border border-slate-200"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">PDF</span>
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Detailed Items Table (Calcul pe fiecare pozitie) */}
                            {(() => {
                                const displayItems = wo.recalculated_items?.length > 0 ? wo.recalculated_items : (wo.proforma_data?.items || []);
                                return displayItems.length > 0 ? (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">{t('analytics.description', 'Description')}</th>
                                                <th className="px-4 py-3 text-right">{t('analytics.qty', 'Qté')}</th>
                                                <th className="px-4 py-3 text-right">{t('analytics.unit_price', 'PU HT')}</th>
                                                <th className="px-4 py-3 text-right">{t('analytics.total_ht', 'Total HT')}</th>
                                                <th className="px-4 py-3 text-right">{t('analytics.vat', 'TVA')} {vatRate > 0 ? `(${vatRate}%)` : ''}</th>
                                                <th className="px-4 py-3 text-right">{t('analytics.total_ttc', 'Total TTC')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayItems.map((item, i) => {
                                                const rowTotalHT = parseFloat(item.total || 0);
                                                const rowTVA = rowTotalHT * (vatRate / 100);
                                                const rowTotalTTC = rowTotalHT + rowTVA;
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors text-slate-700">
                                                        <td className="px-4 py-3 font-medium whitespace-pre-line">{item.label}</td>
                                                        <td className="px-4 py-3 text-right">{item.quantity} {item.unit || ''}</td>
                                                        <td className="px-4 py-3 text-right">{item.price ? `${parseFloat(item.price).toFixed(2)} €` : '-'}</td>
                                                        <td className="px-4 py-3 text-right font-bold">{item.total ? `${rowTotalHT.toFixed(2)} €` : '-'}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500">{rowTVA > 0 ? `${rowTVA.toFixed(2)} €` : '-'}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">{rowTotalTTC > 0 ? `${rowTotalTTC.toFixed(2)} €` : '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-wider">TOTAL</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700">{wo.calcNet.toFixed(2)} €</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700">{(wo.calcNet * (vatRate / 100)).toFixed(2)} €</td>
                                                <td className="px-4 py-3 text-right font-black text-slate-900 text-lg">{(wo.calcNet * (1 + vatRate / 100)).toFixed(2)} €</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-sm">
                                    {t('analytics.no_details', 'Détails de calcul non disponibles dans la base de données.')}
                                </div>
                            );
                            })()}

                            {wo.diff !== 0 ? (
                                <div className="p-4 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between font-bold gap-2">
                                    <span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {t('analytics.diff_detected', 'Écart détecté dans la DB')}</span>
                                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                                        <span>{t('analytics.net_saved', 'Sauvegardé')}: <span className="line-through opacity-75">{wo.savedNet.toFixed(2)} €</span></span>
                                        <span>{t('analytics.net_recalculated', 'Recalculé')}: <span>{wo.calcNet.toFixed(2)} €</span></span>
                                        <span className="bg-red-200 text-red-800 px-2 py-1 rounded-md">Diff: {wo.diff > 0 ? '+' : ''}{wo.diff.toFixed(2)} €</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-sm flex items-center justify-between font-bold">
                                    <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> {t('analytics.no_diff', 'Calcul validé (Aucun écart)')}</span>
                                    <span>Diff: 0.00 €</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {pdfUrl && createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-8 bg-slate-900/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-full max-w-[1200px] h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                        <div className="absolute top-4 right-6 z-10 flex gap-2">
                            <a 
                                href={pdfUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-4 py-2 bg-slate-800/90 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 backdrop-blur-sm"
                            >
                                <FileText className="w-4 h-4" />
                                {t('common.open_new_tab', 'Ouvrir dans un nouvel onglet')}
                            </a>
                            <button 
                                onClick={() => setPdfUrl(null)}
                                className="p-2 bg-white/90 text-slate-700 hover:text-slate-900 hover:bg-white rounded-xl shadow-lg transition-colors border border-slate-200 backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <iframe 
                            src={pdfUrl} 
                            className="w-full flex-1 border-0"
                            title="PDF Preview"
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default function PricingAnalytics() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWO, setSelectedWO] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const woRes = await api.get('/admin/work-orders', { params: { limit: 2000, ignore_quote_filter: true, audit_mode: true } });
            const orders = Array.isArray(woRes.data) ? woRes.data : (woRes.data?.items || []);

            const processedData = orders
                .filter(wo => {
                    // Doar devize (is_quote)
                    if (!wo.is_quote) return false;
                    // Doar cu recalculated_net valid (server a putut recalcula)
                    if (wo.recalculated_net === null || wo.recalculated_net === undefined) return false;
                    const cDate = wo.created_at ? new Date(wo.created_at.replace(' ', 'T')) : null;
                    const sDate = wo.start_date ? new Date(wo.start_date.replace(' ', 'T')) : null;
                    const threshold = new Date('2026-08-01T00:00:00Z');
                    return (cDate && cDate >= threshold) || (sDate && sDate >= threshold);
                })
                .map(wo => {
                // ── 1. PREȚ SALVAT (din DB) ──
                let savedNet = 0;
                if (wo.estimated_price !== undefined && wo.estimated_price !== null) {
                    savedNet = parseFloat(wo.estimated_price);
                }
                
                // ── 2. PREȚ RECALCULAT (din pricing_engine pe server) ──
                let calcNet = wo.recalculated_net !== null && wo.recalculated_net !== undefined 
                    ? parseFloat(wo.recalculated_net) 
                    : savedNet; // Dacă serverul nu a putut recalcula, consideră OK
                
                let vatRate = wo.recalc_vat_rate || 0;
                
                // ── 3. DIFERENȚĂ NET ──
                const diffNet = calcNet - savedNet;
                const isDiscrepancy = Math.abs(diffNet) > 0.01;

                return {
                    ...wo,
                    savedNet,
                    calcNet,
                    vatRate,
                    diff: diffNet,
                    isDiscrepancy
                };
            });

            // Sort so discrepancies are at the top by default
            processedData.sort((a, b) => {
                if (a.isDiscrepancy && !b.isDiscrepancy) return -1;
                if (!a.isDiscrepancy && b.isDiscrepancy) return 1;
                const dateB = b.created_at ? new Date(b.created_at.replace(' ', 'T')).getTime() : 0;
                const dateA = a.created_at ? new Date(a.created_at.replace(' ', 'T')).getTime() : 0;
                return dateB - dateA;
            });

            setData(processedData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        let result = data;
        if (filterType === 'discrepancies') result = result.filter(d => d.isDiscrepancy);
        if (filterType === 'clean') result = result.filter(d => !d.isDiscrepancy);
        if (filterType === 'online') result = result.filter(d => d.is_quote);
        if (filterType === 'manual') result = result.filter(d => !d.is_quote);
        
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(d => {
                const titleMatch = d.title?.toLowerCase().includes(lowerTerm);
                const clientMatch = d.client_name?.toLowerCase().includes(lowerTerm);
                const idMatch = d.id?.toLowerCase().includes(lowerTerm);
                const savedMatch = d.savedNet?.toString().includes(lowerTerm);
                const calcMatch = d.calcNet?.toString().includes(lowerTerm);
                
                return titleMatch || clientMatch || idMatch || savedMatch || calcMatch;
            });
        }
        return result;
    }, [data, filterType, searchTerm]);

    const totalQuotes = data.length;
    const totalErrors = data.filter(d => d.isDiscrepancy).length;
    const totalDiffValue = data.reduce((acc, d) => acc + (d.isDiscrepancy ? Math.abs(d.diff) : 0), 0);

    const columns = [
        {
            key: 'created_at',
            label: t('common.date', 'DATE'),
            sortable: true,
            sortValue: (row) => {
                const dateStr = row.is_quote ? row.created_at : (row.start_date || row.created_at);
                return dateStr ? new Date(dateStr).getTime() : 0;
            },
            render: (row) => {
                const dateToShow = row.is_quote ? row.created_at : (row.start_date || row.created_at);
                return (
                    <div className="flex flex-col justify-center h-full">
                        <span className="font-bold text-slate-800">
                            {dateToShow ? new Date(dateToShow).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'is_quote',
            label: t('common.type', 'TYPE'),
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    {row.is_quote ? (
                        <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">Online</span>
                    ) : (
                        <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">Manual</span>
                    )}
                </div>
            )
        },
        {
            key: 'client_name',
            label: t('common.quote', 'DEVIS'),
            sortable: true,
            render: (row) => (
                <div className="flex flex-col gap-0.5 max-w-[200px]">
                    <div className="flex items-center gap-2">
                        <a 
                            href={`/admin/work-orders/${row.id}`}
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline truncate" 
                        >
                            {row.is_quote ? `DEV${row.public_id || ''} - ${row.client_name}` : row.client_name}
                        </a>
                        <a 
                            href={`/admin/work-orders/${row.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="Ouvrir les détails (Nouvel onglet)"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                    {row.title && (
                        <span className="text-xs text-slate-500 truncate">{row.title}</span>
                    )}
                </div>
            )
        },
        {
            key: 'status',
            label: t('common.status', 'STATUT'),
            sortable: true,
            render: (row) => {
                let displayStatus = row.status;
                if (displayStatus === 'in_progress') {
                    displayStatus = 'EN COURS';
                }
                
                return (
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${
                        row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        row.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        row.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        row.status === 'isoflex' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                        {displayStatus}
                    </span>
                );
            }
        },
        {
            key: 'savedNet',
            label: t('pricing_analytics.col_net_saved', 'NET SAUVEGARDÉ (DB)'),
            sortable: true,
            sortValue: (row) => row.savedNet,
            render: (row) => (
                <div className="font-medium text-slate-600 whitespace-nowrap">
                    {row.savedNet.toFixed(2)} €
                </div>
            )
        },
        {
            key: 'calcNet',
            label: t('pricing_analytics.col_net_recalc', 'NET RECALCULÉ'),
            sortable: true,
            sortValue: (row) => row.calcNet,
            render: (row) => (
                <div 
                    onClick={(e) => { e.stopPropagation(); setSelectedWO(row); }}
                    className="font-bold text-slate-800 flex items-center gap-1.5 group whitespace-nowrap cursor-pointer hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors -ml-2"
                >
                    {row.calcNet.toFixed(2)} €
                    <Info className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
            )
        },
        {
            key: 'diff',
            label: t('pricing_analytics.col_diff_net', 'DIFFÉRENCE NET'),
            sortable: true,
            sortValue: (row) => Math.abs(row.diff),
            render: (row) => (
                <div 
                    onClick={(e) => { e.stopPropagation(); setSelectedWO(row); }}
                    className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors -ml-2"
                >
                    {row.isDiscrepancy ? (
                        <>
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="font-bold text-red-600">
                                {row.diff > 0 ? '+' : ''}{row.diff.toFixed(2)} €
                            </span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-bold text-emerald-600">0.00 €</span>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Calculator className="w-6 h-6 text-blue-600" />
                        {t('nav.pricing_analytics', 'Analyse Devis')}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {t('pricing_analytics.desc', 'Vérification automatique des prix calculés par rapport aux prix sauvegardés.')}
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <KPICard 
                    label={t('pricing_analytics.kpi_total_quotes', 'Total Devis Analysés')} 
                    value={totalQuotes} 
                    icon={FileText} 
                    colorTheme="blue" 
                />
                <KPICard 
                    label={t('pricing_analytics.kpi_total_errors', 'Devis avec Écarts (Erreurs)')} 
                    value={totalErrors} 
                    icon={AlertTriangle} 
                    colorTheme={totalErrors > 0 ? 'red' : 'emerald'}
                />
                <KPICard 
                    label={t('pricing_analytics.kpi_diff_value', 'Valeur des Écarts')} 
                    value={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalDiffValue)} 
                    icon={TrendingUp} 
                    colorTheme="orange"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                
                {/* Custom Filter Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">{t('pricing_analytics.filter_quick', 'Filtres Rapides :')}</span>
                        
                        <div className="flex bg-white border border-slate-200 rounded-full p-1 gap-1">
                            {[
                                { id: 'all', label: t('pricing_analytics.filter_all', 'Tous'), count: data.length },
                                { id: 'online', label: 'Online', count: data.filter(d => d.is_quote).length },
                                { id: 'manual', label: 'Manual', count: data.filter(d => !d.is_quote).length },
                                { id: 'discrepancies', label: t('pricing_analytics.filter_with_diff', 'Avec Écarts'), count: data.filter(d => d.isDiscrepancy).length },
                                { id: 'clean', label: t('pricing_analytics.filter_without_diff', 'Sans Écart'), count: data.filter(d => !d.isDiscrepancy).length }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors flex items-center gap-2 ${
                                        filterType === f.id 
                                            ? 'bg-blue-600 text-white shadow-sm' 
                                            : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {f.label}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                        filterType === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {f.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('pricing_analytics.search', 'Rechercher par nom, ID, somme...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-full text-sm w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="p-0">
                    <DataTable 
                        columns={columns} 
                        data={filteredData} 
                        loading={loading}
                        defaultPageSize={50}
                        searchable={false}
                        defaultSortKey="created_at"
                        defaultSortDir="desc"
                        searchPlaceholder={t('common.search', 'Rechercher...')}
                    />
                </div>
            </div>

            {selectedWO && (
                <CalculationModal 
                    wo={selectedWO} 
                    onClose={() => setSelectedWO(null)} 
                />
            )}
        </div>
    );
}
