with open("src/pages/admin/ImportInvoice.jsx", "r") as f:
    code = f.read()

code = code.replace("import useUIStore from '../../store/uiStore'", "import { useUIStore } from '../../store/uiStore'")

with open("src/pages/admin/ImportInvoice.jsx", "w") as f:
    f.write(code)
