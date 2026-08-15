import re

with open("backend/app/services/pdf_generator.py", "r") as f:
    content = f.read()

# Fix items.append for Chape to include isChape=True
# We'll use regex to inject "isChape": True in all chape items
def replace_chape(m):
    # m.group(0) is items.append({"desc": ... "price": ...})
    # we want to inject "isChape": True
    s = m.group(0)
    s = s.replace("})", ', "isChape": True})')
    return s

# Specifically lines inside `if 'chape' in lbl or 'sapa' in lbl or 'apă' in lbl:`
import ast
# simpler: just replace `chape_total +=` logic
old_logic = """        chape_total = 0
        for item in items:
            d = str(item.get('desc', '')).lower()
            if not ('pur' in d or 'eps' in d or 'aspiration' in d or 'nivellement' in d or 'ponçage' in d or 'protection' in d):
                chape_total += float(item.get('qty', 1)) * float(item.get('price', 0))"""
new_logic = """        chape_total = 0
        for item in items:
            d = str(item.get('desc', '')).lower()
            if not ('pur' in d or 'eps' in d or 'aspiration' in d or 'nivellement' in d or 'ponçage' in d or 'protection' in d or 'transport' in d):
                chape_total += float(item.get('qty', 1)) * float(item.get('price', 0))"""

content = content.replace(old_logic, new_logic)

with open("backend/app/services/pdf_generator.py", "w") as f:
    f.write(content)
