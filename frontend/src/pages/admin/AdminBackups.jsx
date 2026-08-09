import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Database, HardDrive, RefreshCw, UploadCloud, ShieldAlert, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import { useUIStore } from '../../store/uiStore'

export default function AdminBackups() {
    const { t } = useTranslation()
    const { showToast } = useUIStore()
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
    
    const handleRestore = async (filename) => {
        const pin = prompt(
            "⚠️ AVERTISSEMENT CRITIQUE ⚠️\n\n" + 
            "La restauration d'une sauvegarde va EFFACER TOUTES LES DONNÉES ACTUELLES " + 
            "et les remplacer par celles de la sauvegarde.\n\n" + 
            "Pour confirmer cette action, veuillez taper le code PIN de sécurité : 1234"
        );
        
        if (pin !== '1234') {
            if (pin !== null) {
                showToast("Code PIN incorrect. Opération annulée.", "error");
            }
            return;
        }
        
        showToast("Restauration initiée (simulation). Contactez le support pour activer cette fonctionnalité sur le serveur.", "info");
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
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-full h-fit shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-amber-800">Information Importante sur la Restauration</h3>
                    <p className="text-sm text-amber-700 mt-1">
                        La fonction de restauration complète depuis l'interface efface l'intégralité de la base de données actuelle pour y substituer les données du fichier sélectionné. Cette opération irréversible est actuellement protégée.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <HardDrive className="w-6 h-6 text-blue-600" />
                        {t('backups.title', 'Sauvegardes du Système')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('backups.subtitle', 'Consultez et téléchargez les sauvegardes automatiques de la base de données.')}
                    </p>
                </div>
                <button 
                    onClick={fetchBackups}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.refresh', 'Rafraîchir')}
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
