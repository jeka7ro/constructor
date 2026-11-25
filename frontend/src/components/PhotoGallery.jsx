import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Download, Trash2, Calendar, User, FileText } from 'lucide-react'
import api from '../lib/api'
import { useUIStore } from '../store/uiStore'

export default function PhotoGallery({ timesheetId, canDelete = false }) {
    const { t } = useTranslation()
    const { showToast, openDialog } = useUIStore()
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState(null)

    useEffect(() => {
        fetchPhotos()
    }, [timesheetId])

    const fetchPhotos = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/timesheets/${timesheetId}/photos`)
            setPhotos(response.data.photos || [])
        } catch (error) {
            console.error('Error fetching photos:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = (photoId) => {
        openDialog({
            type: 'danger',
            title: t('photos.delete_title', 'Supprimer la photo'),
            message: t('photos.delete_confirm', 'Êtes-vous sûr de vouloir supprimer cette photo ?'),
            confirmText: t('common.delete', 'Supprimer'),
            onConfirm: async () => {
                try {
                    await api.delete(`/timesheets/photos/${photoId}`)
                    setPhotos(photos.filter(p => p.id !== photoId))
                    setSelectedPhoto(null)
                } catch (error) {
                    console.error('Error deleting photo:', error)
                    showToast(t('common.error', 'Erreur lors de la suppression.'), 'error')
                }
            }
        })
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-slate-600">{t('photos.loading', 'Chargement des photos...')}</p>
            </div>
        )
    }

    if (photos.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-slate-600">{t('photos.empty', 'Aucune photo téléchargée.')}</p>
            </div>
        )
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                    {t('photos.title', 'Photos')} ({photos.length})
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            <img
                                src={`/${photo.thumbnail_path}`}
                                alt={photo.filename}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-2 left-2 right-2">
                                    <p className="text-white text-xs font-medium truncate">
                                        {photo.filename}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Photo Modal */}
            {selectedPhoto && createPortal(
                <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="bg-[#F2F4F8] dark:bg-slate-900 rounded-[24px] border-[1.5px] border-slate-300 dark:border-slate-700 shadow-[0_32px_80px_-12px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.08)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-[17px] tracking-tight text-slate-950 dark:text-white truncate pr-4">
                                {selectedPhoto.filename}
                            </h3>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </div>

                        {/* Image */}
                        <div className="flex-1 overflow-auto p-6 bg-[#F2F4F8] dark:bg-slate-950">
                            <img
                                src={`/${selectedPhoto.file_path}`}
                                alt={selectedPhoto.filename}
                                className="w-full h-auto rounded-[16px] shadow-md object-contain max-h-[52vh] mx-auto"
                            />
                        </div>

                        {/* Details */}
                        <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {selectedPhoto.description && (
                                <div className="sm:col-span-3 flex items-start gap-3 p-3 rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.description', 'Description')}</p>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedPhoto.description}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('photos.uploaded_at', 'Date')}</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatDate(selectedPhoto.uploaded_at)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                                <User className="w-4 h-4 text-slate-400" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('photos.uploaded_by', 'Ajouté par')}</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedPhoto.uploaded_by || t('common.unknown', 'Inconnu')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('photos.file_size', 'Taille')}</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatFileSize(selectedPhoto.file_size)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                            <a
                                href={`/${selectedPhoto.file_path}`}
                                download={selectedPhoto.filename}
                                className="flex-1 px-4 h-11 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-[13px] text-[15px] font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                {t('common.download', 'Télécharger')}
                            </a>
                            {canDelete && (
                                <button
                                    onClick={() => handleDelete(selectedPhoto.id)}
                                    className="px-5 h-11 bg-[#FF3B30] hover:bg-[#D70015] text-white rounded-[13px] text-[15px] font-semibold transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('common.delete', 'Supprimer')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
