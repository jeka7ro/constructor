import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Database, HardDrive, RefreshCw, UploadCloud, ShieldAlert, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import { useUIStore } from '../../store/uiStore'

export default function AdminBackups() {
    const { t } = useTranslation()
    const { showToast, openDialog } = useUIStore()
    const [backups, setBackups] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchBackups = async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/backups')
            setBackups(res.data.backups || [])
        } catch (error) {
            console.error('Failed to fetch backups', error)
            showToast(t('backups.fetch_error', 'Erreur lors du chargement des sauvegardes.'), 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBackups()
    }, [])

    const handleDownload = async (filename) => {
        try {
            showToast(t('backups.downloading', 'Préparation du téléchargement...'), 'info')
            const res = await api.get(`/admin/backups/${filename}/download`)
            if (res.data.url) {
                showToast(t('backups.download_ready', 'Téléchargement prêt!'), 'success')
                window.location.href = res.data.url
            } else {
                throw new Error("No URL returned")
            }
        } catch (error) {
            console.error('Failed to get signed URL', error)
            showToast(t('backups.download_error', 'Erreur lors du téléchargement de la sauvegarde.'), 'error')
        }
    }
    
    const handleRestore = (filename) => {
        openDialog({
            type: 'danger',
            title: t('backups.restore_warning_title', 'Avertissement critique'),
            message: t('backups.restore_warning_msg', "La restauration d'une sauvegarde va EFFACER TOUTES LES DONNÉES ACTUELLES et les remplacer par celles de la sauvegarde. Voulez-vous continuer ?"),
            confirmText: t('backups.confirm_restore', 'Restaurer'),
            onConfirm: () => {
                showToast("Restauration initiée (simulation). Contactez le support pour activer cette fonctionnalité sur le serveur.", "info");
            }
        })
    }

    const columns = [
        {
            key: 'name',
            label: t('backups.filename', 'Nom du fichier'),
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Database className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-slate-700">{row.name}</span>
                </div>
            )
        },
        {
            key: 'created_at',
            label: t('common.date', 'Date'),
            sortable: true,
            render: (row) => (
                <span className="text-slate-600">
                    {new Date(row.created_at).toLocaleString('fr-FR', { 
                        year: 'numeric', month: 'long', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                    })}
                </span>
            )
        },
        {
            key: 'size',
            label: t('backups.size', 'Taille'),
            sortable: true,
            render: (row) => {
                const sizeKb = (row.size / 1024).toFixed(1)
                const sizeMb = (row.size / 1024 / 1024).toFixed(2)
                return (
                    <span className="text-slate-600">
                        {row.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`}
                    </span>
                )
            }
        },
        {
            key: 'actions',
            label: t('common.actions', 'Actions'),
            align: 'right',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleDownload(row.name)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title={t('backups.download_btn', 'Télécharger')}
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('backups.download_btn', 'Télécharger')}</span>
                    </button>
                    <button
                        onClick={() => handleRestore(row.name)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                        title="Restaurer cette sauvegarde"
                    >
                        <ShieldAlert className="w-4 h-4" />
                        <span className="hidden sm:inline">Restaurer</span>
                    </button>
                </div>
            )
        }
    ]

    return (
        <div className="w-full space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            {t('backups.title', 'Sauvegardes du Système')}
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="text-[15.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {t('backups.subtitle', 'Consultez et téléchargez les sauvegardes automatiques de la base de données.')}
                    </p>
                </div>
                <button 
                    onClick={fetchBackups}
                    className="flex items-center gap-2 px-4 h-10 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[15px] font-bold rounded-full hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.refresh', 'Rafraîchir')}
                </button>
            </div>

            <div className="bg-amber-50/90 border border-amber-200 rounded-[20px] p-4 flex gap-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-full h-fit shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-[15px] font-bold text-amber-900">Information Importante sur la Restauration</h3>
                    <p className="text-[14px] text-amber-800 mt-0.5">
                        La fonction de restauration complète depuis l'interface efface l'intégralité de la base de données actuelle pour y substituer les données du fichier sélectionné. Cette opération irréversible est actuellement protégée.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:border-slate-800 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={backups}
                    loading={loading}
                    keyField="name"
                    emptyMessage={t('backups.empty', 'Aucune sauvegarde trouvée.')}
                    showRowNumbers={true}
                />
            </div>
        </div>
    )
}
