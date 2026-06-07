import re

with open("src/pages/admin/ImportInvoice.jsx", "r") as f:
    code = f.read()

# Remove import
code = code.replace("import { motion, AnimatePresence } from 'framer-motion'", "")

# Replace components
code = code.replace("<AnimatePresence mode=\"wait\">", "")
code = code.replace("</AnimatePresence>", "")
code = code.replace("<motion.div", "<div")
code = code.replace("</motion.div>", "</div>")

# Remove framer props
code = re.sub(r'initial=\{\{.*?\}\}', '', code)
code = re.sub(r'animate=\{\{.*?\}\}', '', code)
code = re.sub(r'exit=\{\{.*?\}\}', '', code)
code = code.replace("key=\"upload\"", "")
code = code.replace("key=\"processing\"", "")
code = code.replace("key=\"review\"", "")

with open("src/pages/admin/ImportInvoice.jsx", "w") as f:
    f.write(code)
