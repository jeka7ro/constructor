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
    const cDetails = pData?.clientDetails !== undefined ? pData.clientDetails : wo.client_email

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
                <div className="flex justify-between items-start mb-12">
                    <div>
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="h-16 object-contain mb-4" />
                        ) : (
                            <div className="flex items-baseline gap-2 mb-4">
                                <h1 className="text-3xl font-extrabold text-slate-800">{tenant?.name || 'Davide Chape'}</h1>
                                <span className="text-lg font-bold text-slate-400">(SRL)</span>
                            </div>
                        )}
                        <p className="text-sm text-slate-500">
                            VAT: BE 0785.292.895<br/>
                            Gemeentehuisstraat 27/5, 1740 Ternat
                        </p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-light text-slate-800 uppercase tracking-widest mb-2 leading-tight">
                            {wo.is_invoiced ? (
                                tL('invoice_title') === 'invoice_title' ? 'FACTURE' : tL('invoice_title')
                            ) : (
                                tL('proforma').split(' ').map((word, i, arr) => (
                                    <React.Fragment key={i}>
                                        {word}
                                        {i < arr.length - 1 && <br />}
                                    </React.Fragment>
                                ))
                            )}
                        </h2>
                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg inline-block print:bg-transparent print:p-0">
                            <p>{tL('date')} <strong>{new Date(wo.proforma_issued_at || Date.now()).toLocaleDateString('ro-RO')}</strong></p>
                            <p>{tL('due')} <strong>{new Date(new Date(wo.proforma_issued_at || Date.now()).getTime() + 86400000*14).toLocaleDateString('ro-RO')}</strong></p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-12 mb-12 border-t border-slate-100 pt-8 mt-8">
                    <div className="flex-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tL('to')}</h3>
                        <p className="font-bold text-slate-800 text-lg">{cName || tL('client_none')}</p>
                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{cDetails}</p>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tL('address')}</h3>
                        <p className="font-semibold text-slate-800">{wo.site_name || tL('site_none')}</p>
                        <p className="text-sm text-slate-600">{wo.site_address}</p>
                    </div>
                </div>

                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 text-left text-xs font-bold text-slate-500 uppercase">{tL('desc')}</th>
                            <th className="py-3 text-right text-xs font-bold text-slate-500 uppercase">{tL('qty')}</th>
                            <th className="py-3 text-right text-xs font-bold text-slate-500 uppercase">{tL('price')}</th>
                            <th className="py-3 text-right text-xs font-bold text-slate-500 uppercase">{tL('total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-slate-100">
                                <td className="py-4">
                                    <p className="font-medium text-slate-800">{item.desc}</p>
                                </td>
                                <td className="py-4 text-right text-slate-600">{item.qty}</td>
                                <td className="py-4 text-right text-slate-600 whitespace-nowrap">€ {Number(item.price).toFixed(2)}</td>
                                <td className="py-4 text-right font-medium text-slate-800 whitespace-nowrap">€ {(item.qty * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-12">
                    <div className="w-64 bg-slate-50 rounded-xl p-6 print:bg-transparent print:p-0">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-slate-500">{tL('subtotal')}</span>
                            <span className="font-medium text-slate-800 whitespace-nowrap">€ {priceRaw.toFixed(2)}</span>
                        </div>
                        {discountPct > 0 && (
                            <div className="flex justify-between mb-2 text-green-600">
                                <span className="text-sm">Discount ({discountPct}%)</span>
                                <span className="font-medium whitespace-nowrap">-€ {discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between mb-4 border-b border-slate-200 pb-2">
                            <span className="text-sm text-slate-500">{tL('base')}</span>
                            <span className="font-medium text-slate-800 whitespace-nowrap">€ {subtotal.toFixed(2)}</span>
                        </div>
                        {useVat && (
                            <div className="flex justify-between mb-4">
                                <span className="text-sm text-slate-500">{tL('vat')} ({vatRate}%)</span>
                                <span className="font-medium text-slate-800 whitespace-nowrap">€ {vatAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-4 border-t border-slate-200">
                            <span className="font-bold text-slate-800 uppercase text-sm">{tL('grand_total')}</span>
                            <span className="text-xl font-black text-slate-900 whitespace-nowrap">€ {totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {!wo.is_invoiced && (
                    <div className="text-xs text-slate-400 text-center mt-16 pt-8 border-t border-slate-100">
                        <p>{tL('note')}</p>
                    </div>
                )}
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
