from app.database import SessionLocal
from app.models import WorkOrder, ConstructionSite
import random

db = SessionLocal()

addresses = [
    ("Avenue Louise 120, 1050 Bruxelles", 50.8284, 4.3644),
    ("Rue de la Loi 16, 1000 Bruxelles", 50.8467, 4.3695),
    ("Boulevard de Waterloo 35, 1000 Bruxelles", 50.8358, 4.3547),
    ("Chaussée de Wavre 504, 1040 Etterbeek", 50.8322, 4.3853),
    ("Avenue Fonsny 46, 1060 Saint-Gilles", 50.8340, 4.3361),
    ("Rue Belliard 40, 1040 Bruxelles", 50.8413, 4.3734),
    ("Boulevard du Souverain 25, 1170 Watermael-Boitsfort", 50.8037, 4.4187),
    ("Avenue de Tervueren 168, 1150 Woluwe-Saint-Pierre", 50.8359, 4.4172),
    ("Chaussée d'Ixelles 200, 1050 Ixelles", 50.8306, 4.3678),
    ("Rue Antoine Dansaert 64, 1000 Bruxelles", 50.8504, 4.3458),
    ("Avenue Charles-Quint 140, 1083 Ganshoren", 50.8694, 4.3106),
    ("Boulevard Lambermont 1, 1030 Schaerbeek", 50.8753, 4.3817),
    ("Chaussée de Waterloo 1000, 1180 Uccle", 50.7963, 4.3725),
    ("Avenue Winston Churchill 100, 1180 Uccle", 50.8086, 4.3544),
    ("Rue de Wand 10, 1020 Laeken", 50.8953, 4.3622)
]

# Fix Work Orders directly
wos = db.query(WorkOrder).filter(WorkOrder.site_address == "Bruxelles Suburbs").all()
for wo in wos:
    addr = random.choice(addresses)
    wo.site_address = addr[0]
    wo.site_latitude = addr[1]
    wo.site_longitude = addr[2]

# Fix Sites directly if they have "Bruxelles Suburbs"
sites = db.query(ConstructionSite).filter(ConstructionSite.address == "Bruxelles Suburbs").all()
for site in sites:
    addr = random.choice(addresses)
    site.address = addr[0]
    site.latitude = addr[1]
    site.longitude = addr[2]

db.commit()
print(f"Updated {len(wos)} work orders and {len(sites)} sites.")
