import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import ProformaView from '../pages/admin/ProformaView';
import { useNavigate } from 'react-router-dom';

export default function WorkOrderPdfModal({ workOrders, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, workOrders]);

    if (!workOrders || workOrders.length === 0) return null;

    const handleNext = () => {
        if (currentIndex < workOrders.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const wo = workOrders[currentIndex];
    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    
    // Determine which PDF to show based on invoice status
    let pdfPath = null;
    if (wo.is_invoiced) {
        pdfPath = wo.final_invoice_path || wo.proforma_path || wo.pdf_path;
    } else {
        pdfPath = wo.pdf_path || wo.proforma_path;
    }
    
    const pdfUrl = pdfPath ? (pdfPath.startsWith('http') ? pdfPath : `${API_BASE}${pdfPath.startsWith('/') ? '' : '/'}${pdfPath}`) : null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/95 z-[99999] flex flex-col backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white bg-slate-900/80 border-b border-slate-800 shrink-0">
                <div>
                    <h3 className="font-semibold text-lg">{wo.is_invoiced ? 'Factură' : 'Deviz / Ofertă'} • {wo.title || wo.client_name || wo.id.slice(0,8)}</h3>
                    <p className="text-sm text-slate-400">
                        Document {currentIndex + 1} din {workOrders.length}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2.5 hover:bg-red-500 hover:text-white rounded-full transition-all bg-slate-800 text-slate-300 shadow-lg"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Arrow */}
                {currentIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-slate-800/90 hover:bg-blue-600 text-white rounded-full backdrop-blur transition-all shadow-2xl z-50 hover:scale-110 border border-slate-700"
                    >
                        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                )}

                {/* Main Preview Container */}
                <div className="flex-1 overflow-y-auto bg-slate-200/5 custom-scrollbar">
                    <div className="max-w-5xl mx-auto py-6 px-2 sm:px-12 min-h-full flex flex-col">
                        <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex-1 relative flex flex-col h-[85vh]">
                           {pdfUrl ? (
                               <iframe 
                                   src={`${pdfUrl}#toolbar=0`} 
                                   className="w-full h-full min-h-[80vh] border-none"
                                   title="Document PDF"
                               />
                           ) : (
                               <div className="flex-1 w-full h-full overflow-y-auto">
                                   <ProformaView workOrderId={wo.id} />
                               </div>
                           )}
                        </div>
                    </div>
                </div>

                {/* Right Arrow */}
                {currentIndex < workOrders.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-slate-800/90 hover:bg-blue-600 text-white rounded-full backdrop-blur transition-all shadow-2xl z-50 hover:scale-110 border border-slate-700"
                    >
                        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}
