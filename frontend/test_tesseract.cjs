const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const Tesseract = require('tesseract.js');

async function extractText(filePath) {
    const arrayBuffer = fs.readFileSync(filePath);
    const bytes = new Uint8Array(arrayBuffer);
    
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    console.log(`Loaded PDF with ${pdf.numPages} pages`);
    
    const worker = await Tesseract.createWorker('ron');
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 2); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Scale 2.0 as in pdfOcr.js
        
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const buffer = canvas.toBuffer('image/png');
        
        const result = await worker.recognize(buffer);
        fullText += result.data.text + '\n';
    }
    await worker.terminate();
    fs.writeFileSync('tesseract_output.txt', fullText);
    console.log("OCR Done. Wrote to tesseract_output.txt");
}

extractText('/Users/eugeniucazmal/Downloads/2026V1005010 2.pdf').catch(console.error);
