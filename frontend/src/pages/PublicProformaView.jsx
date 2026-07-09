import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, CheckCircle2, Pen, RotateCcw, MapPin, FileText, ClipboardList } from 'lucide-react'
import api from '../lib/api'
import ProformaView from './admin/ProformaView'

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onChange, disabled }) {
    const canvasRef = useRef(null)
    const drawing = useRef(false)
    const hasDrawn = useRef(false)
    const [isEmpty, setIsEmpty] = useState(true)

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            }
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        }
    }

    const startDraw = useCallback((e) => {
        if (disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const pos = getPos(e, canvas)
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        drawing.current = true
    }, [disabled])

    const draw = useCallback((e) => {
        if (!drawing.current || disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const pos = getPos(e, canvas)
        ctx.lineTo(pos.x, pos.y)
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        hasDrawn.current = true
        setIsEmpty(false)
    }, [disabled])

    const stopDraw = useCallback(() => {
        if (!drawing.current) return
        drawing.current = false
        if (hasDrawn.current && onChange) {
            onChange(canvasRef.current.toDataURL('image/png'))
        }
    }, [onChange])

    const clear = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        hasDrawn.current = false
        setIsEmpty(true)
        if (onChange) onChange(null)
    }

    useEffect(() => {
        const canvas = canvasRef.current
        canvas.addEventListener('touchstart', startDraw, { passive: false })
        canvas.addEventListener('touchmove', draw, { passive: false })
        canvas.addEventListener('touchend', stopDraw)
        return () => {
            canvas.removeEventListener('touchstart', startDraw)
            canvas.removeEventListener('touchmove', draw)
            canvas.removeEventListener('touchend', stopDraw)
        }
    }, [startDraw, draw, stopDraw])

    return (
        <div className="space-y-2">
            <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden hover:border-blue-400 transition-colors">
                <canvas
                    ref={canvasRef}
                    width={700}
                    height={200}
                    className="w-full touch-none cursor-crosshair block"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                />
                {isEmpty && !disabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <Pen className="w-6 h-6 text-slate-300 mb-1.5" />
                        <p className="text-sm text-slate-400 font-medium">Signez ici avec la souris ou le doigt</p>
                    </div>
                )}
            </div>
            {!disabled && (
                <button type="button" onClick={clear}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors font-bold">
                    <RotateCcw className="w-3.5 h-3.5" /> Effacer la signature
                </button>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicProformaView() {
    const { token } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Confirmation state
    const [confirmed, setConfirmed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [confirmedByName, setConfirmedByName] = useState('')
    const [signature, setSignature] = useState(null)
    const [checkedTerms, setCheckedTerms] = useState(false)
    const [confirmError, setConfirmError] = useState(null)

    useEffect(() => {
        if (!token) return
        const loadProforma = async () => {
            try {
                const res = await api.get(`/public/proforma/${token}`)
                setData(res.data)
                const wo = res.data.workOrderData
                if (wo?.client_name) setConfirmedByName(wo.client_name)
                if (wo?.confirmed_at) setConfirmed(true)
            } catch (err) {
                console.error('Error loading public proforma:', err)
                setError(err.response?.data?.detail || 'Proforma nu a fost găsită sau link-ul este invalid.')
            } finally {
                setLoading(false)
            }
        }
        loadProforma()
    }, [token])

    const handleConfirm = async () => {
        if (!checkedTerms || !signature) return
        setConfirming(true)
        setConfirmError(null)
        try {
            await api.post(`/public/work-orders/${token}/confirm`, {
                confirmed_by_name: confirmedByName,
                client_signature: signature,
                mode: 'quote'
            })
            setConfirmed(true)
        } catch (err) {
            setConfirmError(err.response?.data?.detail || 'Erreur de confirmation. Réessayez.')
        } finally {
            setConfirming(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    )

    if (error || !data) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Erreur</h1>
                <p className="text-slate-600">{error || 'Devis indisponible.'}</p>
            </div>
        </div>
    )

    const wo = data.workOrderData || {}
    const requirements = wo.requirements || []
    const volumes = wo.volumes || []
    const materials = wo.materials || []

    return (
        <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-8">
            <div className="max-w-[860px] mx-auto space-y-6">

                {/* ── Devis Document ── */}
                <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
                    <ProformaView workOrderData={wo} config={data.config} />
                </div>

                {/* ── Desfășurător / Détail des travaux ── */}
                {(requirements.length > 0 || volumes.length > 0 || materials.length > 0 || wo.notes) && (
                    <div className="bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <ClipboardList className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-slate-800">Détail des travaux</h2>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Locatie */}
                            {(wo.site_address || wo.site_name) && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5" /> Chantier / Emplacement
                                    </p>
                                    <p className="text-sm text-slate-700 font-medium">
                                        {wo.site_name && <span className="font-semibold">{wo.site_name} — </span>}
                                        {wo.site_address}
                                    </p>
                                </div>
                            )}

                            {/* Cerinte */}
                            {requirements.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Exigences</p>
                                    <ul className="space-y-1.5">
                                        {requirements.map((req, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                <span>{typeof req === 'string' ? req : (req.text || req.name || JSON.stringify(req))}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Volume */}
                            {volumes.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Volumes estimés</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {volumes.map((v, i) => (
                                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                                <p className="text-xs text-slate-500">{v.label || v.name || 'Volume'}</p>
                                                <p className="text-sm font-bold text-slate-800">{v.value} {v.unit || ''}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Materiale */}
                            {materials.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Matériaux</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {materials.map((m, i) => (
                                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                                <p className="text-xs text-slate-500">{m.name || m.label || 'Matériau'}</p>
                                                <p className="text-sm font-bold text-slate-800">{m.quantity} {m.unit || ''}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Note */}
                            {wo.notes && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Remarques</p>
                                    <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{wo.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Confirmare / Signature ── */}
                <div className="bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h2 className="text-base font-bold text-slate-800">Confirmation du devis</h2>
                    </div>

                    <div className="p-6">
                        {confirmed ? (
                            /* ── Deja confirmat ── */
                            <div className="flex flex-col items-center py-8 gap-4 text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                                <div>
                                    <h3 className="text-xl font-bold text-green-700">Devis confirmé !</h3>
                                    {wo.confirmed_by_name && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            Confirmé par <strong>{wo.confirmed_by_name}</strong>
                                            {wo.confirmed_at && (
                                                <> le {new Date(wo.confirmed_at).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}</>
                                            )}
                                        </p>
                                    )}
                                </div>
                                {wo.client_signature && (
                                    <div className="mt-2">
                                        <p className="text-xs text-slate-400 mb-2">Signature enregistrée</p>
                                        <img
                                            src={wo.client_signature}
                                            alt="Signature client"
                                            className="max-w-[220px] border border-slate-200 rounded-xl bg-slate-50 p-2"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── Formulaire de confirmation ── */
                            <div className="space-y-5">
                                <p className="text-sm text-slate-500">
                                    Remplissez vos coordonnées, appliquez votre signature numérique et confirmez le devis.
                                </p>

                                {/* Nom */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Confirmé par *
                                    </label>
                                    <input
                                        type="text"
                                        value={confirmedByName}
                                        onChange={e => setConfirmedByName(e.target.value)}
                                        placeholder="Nom et prénom / Entreprise"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Semnatura */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Signature numérique *
                                    </label>
                                    <SignaturePad onChange={setSignature} disabled={false} />
                                    {!signature && (
                                        <p className="text-xs text-orange-500 mt-1">La signature est obligatoire</p>
                                    )}
                                </div>

                                {/* Terms */}
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={checkedTerms}
                                        onChange={e => setCheckedTerms(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
                                    />
                                    <span className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-800 transition-colors">
                                        J'ai lu et j'accepte toutes les exigences, termes et conditions spécifiés dans ce devis.
                                    </span>
                                </label>

                                {/* Error */}
                                {confirmError && (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                        {confirmError}
                                    </p>
                                )}

                                {/* Submit */}
                                <button
                                    onClick={handleConfirm}
                                    disabled={!checkedTerms || !signature || confirming}
                                    className="w-full py-3 px-6 rounded-xl font-bold text-sm transition-all
                                        bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]
                                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                                >
                                    {confirming ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Confirmation en cours...
                                        </span>
                                    ) : 'Confirmer et signer le devis'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
