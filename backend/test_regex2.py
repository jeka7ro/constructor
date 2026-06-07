import re

text = """DC Resources nv
Gachardstraat 88 bus 12
1050
Tel : 
TVA : 
Brussel DAVIDE CHAPE SRL
Gemeentehuisstraat 27 bus 005
1740 Ternat
Elsene
BE 0476.498.444
RPR. : 
BE -
+32 2 248 22 41
IBAN BE18 0689 5312 5865
GKCCBEBB
IBAN BE09 0017 2779 8857
GEBABEBB
email: info@nhm.be
N° à mentionner lors paiement
Votre N° TVA : BE 0785.292.895 Date : 15/05/2026
Quantité Description Prix unité Net
FACTURE 40.150 / V1 005.010 Page : 1
Unite
125,240 TON CEM I 52,5 152,0000 19.036,48
"""

date_match = re.search(r'Date\s*:\s*(\d{2}/\d{2}/\d{4})', text)
if date_match: print(f"Date: {date_match.group(1)}")

facture_match = re.search(r'FACTURE\s+([0-9\./\sV]+)', text)
if facture_match: print(f"Facture: {facture_match.group(1).strip()}")

supplier = text.split('\n')[0].strip()
print(f"Supplier: {supplier}")

