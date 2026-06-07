import re

with open("src/pages/admin/ImportInvoice.jsx", "r") as f:
    code = f.read()

# Replace toast import
code = code.replace("import { toast } from 'react-hot-toast'", "import useUIStore from '../../store/uiStore'")

# Add useUIStore to component
code = code.replace("export default function ImportInvoice() {", "export default function ImportInvoice() {\n    const showToast = useUIStore(s => s.showToast)")

# Replace toast.success/error
code = re.sub(r"toast\.error\((.*?)\)", r"showToast(\1, 'error')", code)
code = re.sub(r"toast\.success\((.*?)\)", r"showToast(\1, 'success')", code)

with open("src/pages/admin/ImportInvoice.jsx", "w") as f:
    f.write(code)
