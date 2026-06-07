import re

text = """
000566425608/05/20261080 RZ 0/4 CF A f3 a CB SA - SABLE DE CHAPE BLANC05.4201740 TERNAT2HCN786AFGEHAALD
000566425908/05/20261080 RZ 0/4 CF A f3 a CB SA - SABLE DE CHAPE BLANC12.8201740 TERNAT2HCN648AFGEHAALD
000566426408/05/20261080 RZ 0/4 CF A f3 a CB SA - SABLE DE CHAPE BLANC06.1201740 TERNAT2FVB027AFGEHAALD
"""

items = []
# Pattern for Belgian Sand Invoice: SABLE DE CHAPE BLANC + QTY + 1740 TERNAT
belgian_pattern = re.compile(r'(SABLE DE CHAPE BLANC)([\d\.,]+)1740\s+TERNAT')
for line in text.split('\n'):
    m = belgian_pattern.search(line)
    if m:
        name = m.group(1).strip()
        qty_str = m.group(2).strip()
        items.append((name, qty_str))

print("Belgian pattern extracted:", items)
