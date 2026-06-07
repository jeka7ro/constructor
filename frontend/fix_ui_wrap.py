import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

old_badge = """                            <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1" """

new_badge = """                            <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 whitespace-nowrap" """

code = code.replace(old_badge, new_badge)

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)

