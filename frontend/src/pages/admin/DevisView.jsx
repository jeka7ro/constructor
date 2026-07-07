import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, Printer, ArrowLeft, FileText } from 'lucide-react'
import api from '../../lib/api'
import { useTenantStore } from '../../store/tenantStore'

export default function DevisView({ embeddedToken, signatureElement }) {
    const params = useParams()
    const id = params.id
    const token = embeddedToken || params.token
    const navigate = useNavigate()
    const { tenant } = useTenantStore()
    const [wo, setWo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const endpoint = token ? `/public/work-orders/${token}` : `/admin/work-orders/${id}`;
        api.get(endpoint)
            .then(res => setWo(res.data))
            .catch(err => { console.error(err); setError('Devisul nu a fost găsit.') })
            .finally(() => setLoading(false))
    }, [id, token])

    useEffect(() => {
        if (wo) {
            const originalTitle = document.title;
            const devisNum = wo.quote_number || 'IST 0000';
            const dateStr = wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('ro-RO') : new Date().toLocaleDateString('ro-RO');
            const clientName = wo.client_name || wo.client?.company_name || wo.client?.first_name || 'Client';
            document.title = `Devis ${devisNum} - ${dateStr} - ${clientName}`;
            
            return () => {
                document.title = originalTitle;
            }
        }
    }, [wo])

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
    if (error || !wo) return <div className="flex h-screen items-center justify-center font-bold text-red-600">{error || 'Eroare'}</div>

    const buildItems = () => {
        const items = []
        ;(wo.volumes || []).forEach((vol, idx) => {
            const surface = parseFloat(vol.quantity || 0)
            const thick = parseFloat(vol.thickness || 0)
            if (surface <= 0) return
            const labelSafe = (vol.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            if (labelSafe.includes('sapa')) {
                const extraThick = Math.max(0, thick - 5)
                items.push({ desc: `Pose de chape ${Math.min(thick, 5)} cm`, qty: surface, unit: 'm²', price: parseFloat(wo.prices?.base || 12.5) })
                if (extraThick > 0) items.push({ desc: `Épaisseur supplémentaire (${extraThick} cm)`, qty: surface, unit: 'm²', price: extraThick * parseFloat(wo.prices?.extra || 1.25) })
                if (vol.has_foil) items.push({ desc: 'Feuille de plastique (Visqueen)', qty: surface, unit: 'm²', price: parseFloat(wo.prices?.foil || 1.2) })
                if (vol.has_mesh) items.push({ desc: 'Armature (Paillasse)', qty: surface, unit: 'm²', price: parseFloat(wo.prices?.mesh || 2.5) })
                if (vol.has_fiber) items.push({ desc: 'Fibre + Duramint', qty: surface, unit: 'm²', price: parseFloat(wo.prices?.fiber || (surface <= 200 ? 2.5 : 2.0)) })
            } else {
                items.push({ desc: vol.label || `Service ${idx + 1}`, qty: surface, unit: 'm²', price: parseFloat(wo.estimated_price || 0) / (surface || 1) })
            }
        })
        if (items.length === 0) items.push({ desc: wo.title || 'Travaux selon devis', qty: 1, unit: 'forfait', price: parseFloat(wo.estimated_price || 0) })
        return items
    }

    const items = buildItems()
    const total = items.reduce((s, i) => s + i.qty * i.price, 0)
    const devisNum = wo.quote_number || 'IST 0000'
    const dateStr = wo.approximate_date ? new Date(wo.approximate_date).toLocaleDateString('fr-BE') : new Date().toLocaleDateString('fr-BE')
    const primaryColor = tenant?.primary_color || '#059669'

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {!token && (
                <div className="print:hidden sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-700 text-sm">{devisNum}</span>
                    </div>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow transition-colors">
                        <Printer className="w-4 h-4" /> Imprimer / PDF
                    </button>
                </div>
            )}
            <div className={`print:p-0 max-w-[860px] mx-auto ${token ? 'p-0' : 'p-6'}`}>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    <div className="px-10 pt-10 pb-6 print:px-8 print:pt-8">
                        <div className="flex justify-between items-start">
                            <div>
                                {tenant?.logo_url ? (<img src={tenant.logo_url} alt="Logo" className="h-14 object-contain mb-2" />) : (<div className="text-2xl font-black text-slate-800">{tenant?.name || 'Davide Chape'}</div>)}
                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {tenant?.address && <div>{tenant.address}</div>}
                                    {tenant?.vat_number && <div>N° TVA: {tenant.vat_number}</div>}
                                    {tenant?.phone && <div>Tél: {tenant.phone}</div>}
                                    {tenant?.email && <div>{tenant.email}</div>}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-700 font-bold uppercase tracking-wider">DEVIS</div>
                                <div className="text-sm text-slate-500 font-bold mt-0.5 uppercase tracking-wider">N° {devisNum}</div>
                                <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                                    <div>Date: <strong>{dateStr}</strong></div>
                                    <div>Valable 30 jours</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 h-0.5 rounded-full" style={{ backgroundColor: primaryColor + '50' }} />
                        <div className="mt-6 grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">CLIENT</div>
                                <div className="font-bold text-slate-800">{wo.client_name || '—'}</div>
                                {wo.client_email && <div className="text-xs text-slate-500 mt-1">{wo.client_email}</div>}
                                {wo.client_phone && <div className="text-xs text-slate-500">{wo.client_phone}</div>}
                                {wo.client_cui && <div className="text-xs text-slate-400 mt-1">N° TVA: {wo.client_cui}</div>}
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">CHANTIER / ADRESSE</div>
                                <div className="text-sm text-slate-700">{wo.site_address || '—'}</div>
                                {wo.volumes?.[0]?.quantity && (
                                    <div className="text-xs text-slate-500 mt-2">Surface: <strong>{wo.volumes[0].quantity} m²</strong>{wo.volumes[0].thickness && <> · Ép.: <strong>{wo.volumes[0].thickness} cm</strong></>}</div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-10 pb-10 print:px-8">
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <div className="col-span-5">Description</div>
                                <div className="col-span-2 text-center">Qté</div>
                                <div className="col-span-1 text-center">Unité</div>
                                <div className="col-span-2 text-right">P.U. (€)</div>
                                <div className="col-span-2 text-right">Total (€)</div>
                            </div>
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 items-center break-inside-avoid">
                                    <div className="col-span-5 text-slate-700 font-medium text-sm">{item.desc}</div>
                                    <div className="col-span-2 text-center text-slate-600 font-medium text-sm">{item.qty}</div>
                                    <div className="col-span-1 text-center text-slate-500 font-bold text-[10px] uppercase">{item.unit}</div>
                                    <div className="col-span-2 text-right text-slate-600 text-sm">{item.price.toFixed(2)}</div>
                                    <div className="col-span-2 text-right font-bold text-slate-800 text-sm">{(item.qty * item.price).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-6">
                            <div className="w-72 space-y-1 text-sm">
                                <div className="flex justify-between py-3 px-4 rounded-xl mt-2 font-black text-white text-base" style={{ backgroundColor: primaryColor }}>
                                    <span>TOTAL</span>
                                    <span>{total.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
                            <p className="font-bold text-slate-500 mb-1">Conditions</p>
                            <p>Ce document est un devis estimatif. Les prix sont valables 30 jours à compter de la date d'émission. Pour confirmer, retournez ce devis signé avec la mention «Bon pour accord».</p>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-10">
                            <div className="flex flex-col">
                                <div className="min-h-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    {wo?.client_name || wo?.client?.company_name || wo?.client?.first_name || 'Signature Client'}
                                </div>
                                {signatureElement ? (
                                    <div className="w-full">
                                        {signatureElement}
                                    </div>
                                ) : (wo?.final_client_signature || wo?.client_signature) ? (
                                    <div className="w-full flex flex-col">
                                        <div className="w-full aspect-[3.5/1] border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl flex items-center justify-center p-2">
                                            <img src={wo.final_client_signature || wo.client_signature} alt="Signature" className="max-h-full object-contain" />
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-2">
                                            Date: {new Date(wo.final_confirmed_at || wo.confirmed_at).toLocaleString('fr-BE')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <div className="w-full aspect-[3.5/1] border-2 border-dashed border-slate-200 rounded-2xl"></div>
                                        <div className="text-[10px] text-slate-400 mt-2">Date: _______________</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="min-h-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{tenant?.name || 'Davide Chape'}</div>
                                <div className="w-full">
                                    <div className="w-full aspect-[3.5/1] border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-2">
                                        {tenant?.logo_url ? <img src={tenant.logo_url} alt="Logo" className="h-4/5 object-contain opacity-40" /> : <span className="text-slate-300 text-xs font-bold">Cachet / Signature</span>}
                                    </div>
                                    <div className="text-[10px] text-transparent mt-2 pointer-events-none select-none">Spacer</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@media print { @page { margin: 1cm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
        </div>
    )
}
