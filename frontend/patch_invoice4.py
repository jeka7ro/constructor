with open("src/pages/admin/ImportInvoice.jsx", "r") as f:
    code = f.read()

code = code.replace("import { extractTextFromPdf } from '../../lib/pdfOcr'", "import { extractTextFromImageOrPdf } from '../../lib/pdfOcr'")
code = code.replace("const text = await extractTextFromPdf(reader.result,", "const { text } = await extractTextFromImageOrPdf(selected,")

with open("src/pages/admin/ImportInvoice.jsx", "w") as f:
    f.write(code)
