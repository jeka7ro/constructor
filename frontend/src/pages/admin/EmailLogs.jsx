import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { Mail, CheckCircle, XCircle, CalendarDays, Eye, Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import DataTable from '../../components/DataTable'

const EmailLogs = () => {
    const { t } = useTranslation()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    
    // Modal state
    const [selectedLog, setSelectedLog] = useState(null)
    const [modalHtml, setModalHtml] = useState('')
    const [loadingHtml, setLoadingHtml] = useState(false)

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/admin/emails?limit=1000&offset=0`)
            setLogs(res.data.items || [])
        } catch (error) {
            console.error("Failed to fetch email logs", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const viewHtmlContent = async (log) => {
        setSelectedLog(log)
        setLoadingHtml(true)
        try {
            const res = await api.get(`/admin/emails/${log.id}/content`)
            setModalHtml(res.data.html_content)
        } catch (e) {
            console.error(e)
            setModalHtml(`<p class="text-red-500">${t('emails.load_error', 'Erreur lors du chargement du contenu.')}</p>`)
        } finally {
            setLoadingHtml(false)
        }
    }

    const formatDate = (isoString) => {
        if (!isoString) return '-'
        const d = new Date(isoString)
        return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }

    const columns = useMemo(() => [
        {
            key: 'id',
            label: 'ID',
            sortable: true,
            render: (row) => <span className="font-mono text-xs text-slate-400">{row.id.substring(0,8)}</span>
        },
        {
            key: 'sent_at',
            label: t('common.date_time', 'Date / Heure'),
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {formatDate(row.sent_at)}
                </div>
            )
        },
        {
            key: 'client_name',
            label: t('common.client', 'Client'),
            sortable: true,
            render: (row) => <span className="text-sm font-bold text-slate-700">{row.client_name || '-'}</span>
        },
        {
            key: 'client_email',
            label: t('common.email', 'E-mail'),
            sortable: true,
            render: (row) => <span className="text-sm text-slate-600 font-medium">{row.client_email || '-'}</span>
        },
        {
            key: 'subject',
            label: t('common.subject', 'Sujet'),
            sortable: true,
            render: (row) => (
                <span className="text-sm text-slate-700 truncate max-w-[200px] inline-block" title={row.subject}>
                    {row.subject || '-'}
                </span>
            )
        },
        {
            key: 'status',
            label: t('common.status', 'Statut'),
            sortable: true,
            render: (row) => (
                row.status === 'sent' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wide uppercase">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t('emails.status_sent', 'Envoyé')}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold tracking-wide uppercase" title={row.error_message}>
                        <XCircle className="w-3.5 h-3.5" />
                        {t('emails.status_failed', 'Échoué')}
                    </span>
                )
            )
        },
        {
            key: 'actions',
            label: t('common.actions', 'Actions'),
            render: (row) => (
                <button
                    onClick={() => viewHtmlContent(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                >
                    <Eye className="w-3.5 h-3.5" />
                    {t('emails.view_email', 'Voir l\'E-mail')}
                </button>
            )
        }
    ], [t])

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="flex-none bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t('emails.title', 'Journaux d\'E-mails')}</h1>
                            <p className="text-sm text-slate-500">{t('emails.subtitle', 'Historique des e-mails envoyés depuis l\'application')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <DataTable
                        columns={columns}
                        data={logs}
                        loading={loading}
                        searchable
                        searchPlaceholder={t('common.search', 'Rechercher...')}
                        emptyText={t('emails.no_data', 'Aucun e-mail enregistré.')}
                        defaultSortKey="sent_at"
                        defaultSortDir="desc"
                    />
                </div>
            </div>

            {/* Email Viewer Modal */}
            {selectedLog && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedLog.subject || t('emails.content_title', 'Contenu de l\'E-mail')}</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{t('emails.to', 'À :')} {selectedLog.client_email}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-6 bg-slate-50 relative">
                            {loadingHtml ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : (
                                <div 
                                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 email-preview-container"
                                    dangerouslySetInnerHTML={{ __html: modalHtml }}
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default EmailLogs
