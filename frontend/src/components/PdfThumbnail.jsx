import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Use CDN for the worker — avoids Vite/Rollup bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

export default function PdfThumbnail({ url, className = '' }) {
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let renderTask = null;
        let isMounted = true;

        const loadPdf = async () => {
            try {
                const loadingTask = pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;
                if (!isMounted) return;

                const page = await pdf.getPage(1);
                if (!isMounted) return;

                const canvas = canvasRef.current;
                if (!canvas) return;
                
                const context = canvas.getContext('2d');
                // Calculate scale to match a reasonable thumbnail width, e.g. 400px for sharpness
                const viewport = page.getViewport({ scale: 1.0 });
                const scale = 400 / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport,
                };

                renderTask = page.render(renderContext);
                await renderTask.promise;
                if (isMounted) setLoading(false);

            } catch (err) {
                console.error("Error generating PDF thumbnail", err);
                if (isMounted) {
                    setLoading(false);
                    setError(true);
                }
            }
        };

        if (url) {
            setLoading(true);
            setError(false);
            loadPdf();
        }

        return () => {
            isMounted = false;
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [url]);

    return (
        <div className={`relative overflow-hidden flex items-center justify-center bg-white ${className}`}>
            {!error ? (
                <canvas ref={canvasRef} className={`w-full ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity object-cover object-top h-full`} />
            ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                    <span className="text-xs uppercase font-bold tracking-widest mt-1">PDF</span>
                </div>
            )}
            
            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}
