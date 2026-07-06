import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Printer } from 'lucide-react'
import api from '../../lib/api'
import { useTenantStore } from '../../store/tenantStore'
import { useTranslation } from 'react-i18next'
import i18nGlobal from '../../i18n'

export default function ProformaView({ workOrderData = null, config = null }) {
    const { t, i18n } = useTranslation()
    const { id } = useParams()
    const { tenant } = useTenantStore()
    const [wo, setWo] = useState(workOrderData)
    const [loading, setLoading] = useState(!workOrderData)
    
    // Switch language based on config if provided
    useEffect(() => {
        if (config?.lang && i18n.language !== config.lang) {
            i18n.changeLanguage(config.lang)
        }
    }, [config?.lang, i18n])
    
    // Translation helper specifically for Proforma (bypass hook state with global)
    const tL = (key) => {
        const tFunc = config?.lang ? i18nGlobal.getFixedT(config.lang) : t;
        return tFunc(`proforma.${key}`, {
            defaultValue: {
                'proforma': 'Factură Proformă',
                'date': 'Data:',
                'due': 'Scadență:',
                'to': 'Către',
                'address': 'Șantier / Locație',
                'desc': 'Descriere Servicii / Materiale',
                'qty': 'Cantitate',
                'price': 'Preț Unitar',
                'total': 'Total (Net)',
                'subtotal': 'Subtotal Brut',
                'base': 'Bază de calcul',
                'vat': 'TVA',
                'grand_total': 'TOTAL NET DE PLATĂ',
                'note': 'Aceasta este o factură proformă. Produsele și serviciile vor fi prestate după confirmarea plății sau conform contractului în vigoare.'
            }[key] || key
        })
    }

    useEffect(() => {
        if (workOrderData) {
            setWo(workOrderData)
            setLoading(false)
            return
        }
        if (!id) return
        const loadWorkOrder = async () => {
            try {
                const res = await api.get(`/admin/work-orders/${id}`)
                setWo(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadWorkOrder()
    }, [id, workOrderData])

    const pData = config || wo?.proforma_data || null
    
    // Make sure we update i18n when pData.lang changes
    useEffect(() => {
        if (pData?.lang && pData.lang !== i18n.language) {
            i18n.changeLanguage(pData.lang);
        }
    }, [pData?.lang, i18n]);

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
    if (!wo) return <div className="flex h-full items-center justify-center font-bold text-red-600">Comanda nu a fost găsită.</div>

    // Fiscal logic
    const isBelgium = tenant?.country === 'BE'
    
    // Apply config or defaults from DB
    const useVat = pData?.useVat ?? true
    const vatRate = useVat ? (isBelgium ? 21 : 19) : 0
    const discountPct = pData?.discountPct || 0
    
    // Custom Client Fields
    const cName = pData?.clientName !== undefined ? pData.clientName : wo.client_name
    let cDetails = pData?.clientDetails !== undefined ? pData.clientDetails : wo.client_email

    // Retroactively patch old invoices that only saved the email in clientDetails
    if (!cDetails || cDetails === wo.client_email) {
        const parts = [];
        if (wo.client_email) parts.push(wo.client_email);
        if (wo.client_phone) parts.push(wo.client_phone);
        
        const cui = wo.client_cui || wo.client_company_vat || wo.client?.cui || wo.client?.company_vat;
        if (cui) parts.push(`N° TVA: ${cui}`);
        
        const reg = wo.client_reg_com || wo.client?.reg_com || wo.client?.company_reg_number;
        if (reg) parts.push(`Reg: ${reg}`);
        
        const addr = wo.client_address || wo.client?.address || wo.client?.company_address || wo.site_address;
        if (addr) parts.push(addr);
        
        cDetails = parts.join('\n');
    }

    // Items array from config or default fallback
    // Try translating items on the fly if desc isn't hardcoded or uses translation keys (or just re-render when language changes)
    const items = pData?.items?.length > 0 ? pData.items.map(item => {
        let newDesc = item.desc;
        const match = newDesc?.match(/^(proforma\.items\.[a-zA-Z0-9_]+)(.*)$/);
        if (match) {
            const keyPart = match[1].replace('proforma.', '');
            newDesc = tL(keyPart) + match[2];
        }
        return { ...item, desc: newDesc };
    }) : [{
        id: 'default',
        desc: `${tL('items.custom_work') || 'Lucrări conform deviz'} (${wo.title || tL('items.labor_materials') || 'Manoperă și materiale'})`,
        qty: 1,
        price: parseFloat(wo.estimated_price?.replace(/[^0-9.]/g, '') || '0')
    }]

    const priceRaw = items.reduce((acc, item) => acc + (item.qty * item.price), 0)
    const discountAmount = priceRaw * (discountPct / 100)
    const subtotal = priceRaw - discountAmount
    const vatAmount = subtotal * (vatRate / 100)
    const totalAmount = subtotal + vatAmount

    return (
        <div className="w-full min-h-full font-sans bg-slate-50 print:bg-white p-4 md:p-8">
            <div className="max-w-[800px] mx-auto bg-white p-8 md:p-12 shadow-sm rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0">
                {/* Header Top: Logo and Invoice Title */}
                <div className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded-2xl px-6 py-4 mb-6 print:bg-transparent print:border-none print:p-0">
                    <div>
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="h-12 object-contain" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-2xl font-extrabold text-slate-800">{tenant?.name || 'Davide Chape'}</h1>
                                <span className="text-base font-bold text-slate-400">(SRL)</span>
                            </div>
                        )}
                    </div>
                    <div className="text-right flex items-center gap-6">
                        <div className="text-right">
                            <h2 className="text-3xl font-light text-slate-800 uppercase tracking-widest leading-tight">
                                {wo.is_invoiced ? (
                                    tL('invoice_title') === 'invoice_title' ? 'FACTURE' : tL('invoice_title')
                                ) : (
                                    tL('proforma')
                                )}
                            </h2>
                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                N° {wo.is_invoiced ? (wo.invoice_number || '...') : `PF-${wo.id}`}
                            </p>
                        </div>
                        <div className="text-sm text-slate-500 flex flex-col gap-1 items-end border-l border-slate-200 pl-6">
                            <p className="bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/50">{tL('date')} <strong>{new Date(wo.proforma_issued_at || Date.now()).toLocaleDateString('ro-RO')}</strong></p>
                            <p className="bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/50">{tL('due')} <strong>{new Date(new Date(wo.proforma_issued_at || Date.now()).getTime() + 86400000*14).toLocaleDateString('ro-RO')}</strong></p>
                        </div>
                    </div>
                </div>

                {/* Header Middle: Supplier and Client Details (Same Row, Identical Cards) */}
                <div className="flex gap-6 mb-8">
                    <div className="flex-1 bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 print:border-none print:shadow-none print:p-0 print:pr-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">FURNIZORI</h3>
                        <p className="font-bold text-slate-800 text-base mb-1">{tenant?.name || 'Davide Chape SRL'}</p>
                        <div className="text-sm text-slate-600 leading-snug">
                            <p>TVA: BE 0785.292.895</p>
                            <p>Gemeentehuisstraat 27/5, 1740 Ternat</p>
                            <p>Flandre, Belgique</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 text-right print:border-none print:shadow-none print:p-0 print:pl-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">À L'ATTENTION DE</h3>
                        <p className="font-bold text-slate-800 text-base mb-1">{cName || tL('client_none')}</p>
                        <p className="text-sm font-bold text-slate-700 mt-2 mb-1">N° client: <span className="font-normal">{wo.client?.id || wo.client_id ? `CUST-${(wo.client?.id || wo.client_id).toString().substring(0, 5)}` : '-'}</span></p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-snug">{cDetails}</p>
                    </div>
                </div>

                <table className="w-full mb-12 table-fixed">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 pr-4 text-left text-xs font-bold text-slate-500 uppercase w-[55%]">{tL('desc')}</th>
                            <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase w-[15%]">{tL('qty')}</th>
                            <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase w-[15%]">{tL('price')}</th>
                            <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase w-[10%]">TVA</th>
                            <th className="py-3 pl-4 text-right text-xs font-bold text-slate-500 uppercase w-[15%]">Sous-total (EUR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-slate-100">
                                <td className="py-4 pr-4 align-top">
                                    <p className="font-medium text-slate-800">{item.desc}</p>
                                    {idx === 0 && (wo.site_name || wo.site_address) && (
                                        <div className="mt-2 text-sm text-slate-500">
                                            <span className="font-semibold">{tL('address')} (Chantier):</span>{' '}
                                            {wo.site_name && <span>{wo.site_name}</span>}
                                            {wo.site_name && wo.site_address && <span> - </span>}
                                            {wo.site_address && <span>{wo.site_address}</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-center text-slate-600 align-top">{item.qty}</td>
                                <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap align-top">{Number(item.price).toFixed(2)}</td>
                                <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap align-top">{vatRate > 0 ? `${vatRate}%` : '0,0%'}</td>
                                <td className="py-4 pl-4 text-right font-medium text-slate-800 whitespace-nowrap align-top">{(item.qty * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-12">
                    <div className="w-[450px] print:w-[350px]">
                        <div className="flex justify-between mb-2">
                            <span className="font-bold text-slate-800 text-sm">Sous-total:</span>
                            <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{priceRaw.toFixed(2)} EUR</span>
                        </div>
                        {discountPct > 0 && (
                            <div className="flex justify-between mb-2 text-green-600">
                                <span className="font-bold text-sm">Discount ({discountPct}%)</span>
                                <span className="font-bold whitespace-nowrap">- {discountAmount.toFixed(2)} EUR</span>
                            </div>
                        )}
                        {useVat && vatRate > 0 ? (
                            <div className="flex justify-between mb-6">
                                <span className="font-bold text-slate-800 text-sm">TVA {vatRate}%:</span>
                                <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{vatAmount.toFixed(2)} EUR</span>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-800 text-sm">TVA 0,0% Autoliquidation:</span>
                                    <div className="flex gap-12 items-center">
                                        <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{subtotal.toFixed(2)} EUR</span>
                                        <span className="font-bold text-slate-800 whitespace-nowrap text-sm">0,00 EUR</span>
                                    </div>
                                </div>
                                <span className="text-sm text-slate-500 block w-full">Autoliquidation</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-4 border-t border-slate-200">
                            <span className="font-bold text-slate-800 text-base">Total:</span>
                            <span className="font-bold text-slate-800 whitespace-nowrap text-base">{totalAmount.toFixed(2)} EUR</span>
                        </div>
                    </div>
                </div>

                {/* Info Bancaires & Commentaires */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="border border-slate-200 rounded-xl overflow-hidden print:rounded-none">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-normal text-slate-700 print:bg-slate-100">Informations bancaires</div>
                        <div className="p-4 text-sm text-slate-700 leading-relaxed">
                            <p>{tenant?.name || 'DAVIDE CHAPE'}</p>
                            <p>IBAN: BE46363221149936 | BIC: BBRUBEBB</p>
                            <p>IBAN: BE97733069599449 | BIC: KREDBEBB</p>
                            <br/>
                            <p>Référence de Paiement: <span className="font-medium">{wo.is_invoiced ? (wo.invoice_number || '...') : `PF-${wo.id}`}</span></p>
                        </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden print:rounded-none">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-normal text-slate-700 print:bg-slate-100">Commentaires</div>
                        <div className="p-4 text-sm text-slate-700 leading-relaxed text-justify">
                            Autoliquidation : en l’absence de contestation par écrit, dans un délai d’un mois à compter de la réception de la facture, le client est présumé reconnaître qu’il est un assujetti tenu au dépôt de déclarations périodiques. Si cette condition n’est pas remplie, le client endossera, par rapport à cette condition, la responsabilité quant au paiement de la taxe, des intérêts et des amendes dus (nouvel article 20, §3 AR n° 1).
                        </div>
                    </div>
                </div>

                <div className="text-sm text-slate-600 mt-auto pt-8 border-t border-slate-100">
                    <p className="mb-1 uppercase">{tenant?.name || 'DAVIDE CHAPE'}, Gemeentehuisstraat 27/5, 1740, Ternat, Flandre, Belgique</p>
                    <p className="mb-1">TVA: BE0785292895</p>
                    <p>Téléphone: 0493.37.07.77 | Email: info@davidechape.be</p>
                </div>
            </div>

            {!workOrderData && (
                <div className="fixed bottom-8 right-8 print:hidden">
                    <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-xl font-bold transition-transform hover:scale-105"
                    >
                        <Printer className="w-5 h-5" />
                        Printează PDF
                    </button>
                </div>
            )}
        </div>
    )
}
