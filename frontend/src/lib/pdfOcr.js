import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

// Use CDN for the worker — avoids Vite/Rollup bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'

/**
 * Extract text from an image or PDF file using client-side OCR
 * @param {File} file - The file to extract text from
 * @param {Function} onProgress - Callback for OCR progress
 */
export async function extractTextFromImageOrPdf(file, onProgress) {
    const notify = (stage, pct) => onProgress && onProgress(stage, pct)

    try {
        notify('Inițializare...', 5)

        // If it's an image, directly use Tesseract
        if (file.type.startsWith('image/')) {
            notify('Se configurează OCR...', 15)
            const worker = await Tesseract.createWorker('ron+eng')
            notify('Scanare imagine...', 30)
            const result = await worker.recognize(file)
            await worker.terminate()
            notify('Scanare finalizată!', 100)
            return { text: result.data.text, imageBlob: file }
        }

        // If it's a PDF
        if (file.type === 'application/pdf') {
            notify('Încărcare PDF...', 10)
            
            // Convert File to ArrayBuffer
            const arrayBuffer = await file.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)
            
            let pdf
            try {
                pdf = await pdfjsLib.getDocument({ data: bytes }).promise
            } catch (pdfErr) {
                // Fallback: try without worker if CDN fails
                pdfjsLib.GlobalWorkerOptions.workerSrc = ''
                pdf = await pdfjsLib.getDocument({ data: bytes }).promise
            }
            
            // Limit to max 2 pages so we don't freeze the browser
            const totalPages = Math.min(pdf.numPages, 2)
            
            notify('PDF scanat. Pregătire OCR...', 15)
            const worker = await Tesseract.createWorker('ron')
            
            let ocrText = ''
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            let firstPageBlob = null;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                notify(`Scanare pagină ${pageNum}/${totalPages}...`, 15 + ((pageNum - 1) / totalPages) * 75)
                const page = await pdf.getPage(pageNum)
                
                // High res (scale 2.0) is essential for accurate OCR
                const viewport = page.getViewport({ scale: 2.0 })
                canvas.width = viewport.width
                canvas.height = viewport.height

                await page.render({ canvasContext: ctx, viewport }).promise
                const imageData = canvas.toDataURL('image/png')
                
                if (pageNum === 1) {
                    firstPageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
                }
                
                const result = await worker.recognize(imageData)
                ocrText += result.data.text + '\n'
            }

            await worker.terminate()
            notify('Scanare finalizată!', 100)
            return { text: ocrText, imageBlob: firstPageBlob }
        }

        throw new Error('Format fișier nesuportat. Trebuie să fie Imagine sau PDF.')
    } catch (err) {
        console.error('[Client OCR] Error:', err)
        throw err
    }
}
