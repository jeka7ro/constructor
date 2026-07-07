import React from 'react'
import { AlertCircle, X, Check } from 'lucide-react'

export default function ConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirmare', 
    message = 'Ești sigur?', 
    confirmText = 'Confirmă', 
    cancelText = 'Anulează',
    type = 'danger'
}) {
    if (!isOpen) return null;

    const isDanger = type === 'danger';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
                    
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 h-10 px-4 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                                isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <Check className="w-4 h-4" />
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
