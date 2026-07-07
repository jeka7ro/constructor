import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, FileText, ImageIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
export default function DocumentPreviewModal({ documents, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, documents]);

    if (!documents || documents.length === 0) return null;

    const handleNext = () => {
        if (currentIndex < documents.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const doc = documents[currentIndex];
    const isImg = doc.content_type?.startsWith('image/');
    const rawUrl = doc.file_url || doc.file_path;
    const fileUrl = rawUrl?.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl?.startsWith('/') ? '' : '/'}${rawUrl}`;

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
                <div>
                    <h3 className="font-semibold text-lg">{doc.filename}</h3>
                    <p className="text-sm text-slate-300">
                        {currentIndex + 1} din {documents.length} • {doc.source === 'client' ? 'Încărcat de Client' : 'Document'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href={fileUrl}
                        download={doc.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <Download className="w-5 h-5" />
                        <span className="hidden sm:inline">Descarcă</span>
                    </a>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors ml-2"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative p-4">
                {/* Left Arrow */}
                {currentIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur transition-colors z-10"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                )}

                {/* Main Preview */}
                <div className="w-full h-full flex items-center justify-center max-w-5xl mx-auto">
                    {isImg ? (
                        <img
                            src={fileUrl}
                            alt={doc.filename}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-12 max-w-sm w-full text-center shadow-2xl">
                            <FileText className="w-24 h-24 text-blue-500 mb-6" />
                            <h4 className="text-xl font-bold text-slate-800 mb-2 truncate w-full">{doc.filename}</h4>
                            <p className="text-slate-500 mb-6">Previzualizarea nu este disponibilă pentru acest tip de fișier.</p>
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                            >
                                Deschide Fișierul
                            </a>
                        </div>
                    )}
                </div>

                {/* Right Arrow */}
                {currentIndex < documents.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur transition-colors z-10"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                )}
            </div>

            {/* Thumbnail Strip (Optional) */}
            {documents.length > 1 && (
                <div className="h-24 bg-black/50 p-3 flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10">
                    {documents.map((d, idx) => {
                        const isImg = d.content_type?.startsWith('image/');
                        return (
                            <button
                                key={d.id || idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${currentIndex === idx ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/50' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            >
                                {isImg ? (
                                    <img src={d.file_url?.startsWith('http') ? d.file_url : `${API_BASE}${d.file_url?.startsWith('/') || d.file_path?.startsWith('/') ? '' : '/'}${d.file_url || d.file_path}`} alt="thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-slate-400" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
