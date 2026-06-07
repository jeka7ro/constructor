import re

text = """125,240 TON CEM I 52,5 152,0000 19.036,48
1.020,980 TON SUPPLEMENT-GASOIL 1,5000 1.531,47
1.007,980 TON RZ 0/4 CF A f3 a CB SA - SABLE DE CHAPE BLANC 18,5500 18.698,08
5,200 TON BIG BAG CIMENT 152,0000 790,40
10,580 TON CEM II 32,5 157,0000 1.661,06
4,000 PIECE BIG-BAG (x1.5) 15,0000 60,00
13,000 TON SABLE ROND 0/4 (0/3.15) MF A f3 a CC SA 10,2500 133,25
"""

pattern = re.compile(r'^([\d\.,]+)\s+([A-Z]+)\s+(.*?)\s+([\d\.,]+)\s+([\d\.,]+)$')

for line in text.split('\n'):
    if not line: continue
    m = pattern.match(line)
    if m:
        print(f"MATCH: {m.groups()}")
    else:
        print(f"NO MATCH: {line}")

