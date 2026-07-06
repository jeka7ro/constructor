import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import api from '../lib/api'
import ProformaView from './admin/ProformaView'

export default function PublicProformaView() {
    const { token } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!token) return;
        const loadProforma = async () => {
            try {
                const res = await api.get(`/public/proforma/${token}`)
                setData(res.data)
            } catch (err) {
                console.error("Error loading public proforma:", err)
                setError(err.response?.data?.detail || "Proforma nu a fost găsită sau link-ul este invalid.")
            } finally {
                setLoading(false)
            }
        }
        loadProforma()
    }, [token])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    )

    if (error || !data) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Eroare</h1>
                <p className="text-slate-600">{error || "Proforma indisponibilă."}</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-100 flex justify-center p-4 sm:p-8">
            <div className="w-full max-w-[800px] h-max bg-white shadow-xl rounded-xl border border-slate-200 overflow-hidden shrink-0">
                <ProformaView workOrderData={data.workOrderData} config={data.config} />
            </div>
        </div>
    )
}
