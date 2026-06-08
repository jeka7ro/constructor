import sys
import os
sys.path.append('backend')
from app.database import SessionLocal
from app.models import LogisticSandStation

SAND_STATIONS = [
    { "name": 'BAZA GHENT', "lat": 51.0538286, "lng": 3.7250121 },
    { "name": 'BAZZA NINOVE', "lat": 50.8340156, "lng": 4.0150992 },
    { "name": 'NHM WIELSBEKE', "lat": 50.9080277, "lng": 3.3644265 },
    { "name": 'NHM BAZA OSTENDE', "lat": 51.2263435, "lng": 2.9152345 },
    { "name": 'BAZA DOUR (Rougraff)', "lat": 50.3957242, "lng": 3.7778393 },
    { "name": 'BAZA LUMMEN (Minera)', "lat": 51.0107703, "lng": 5.2366141 },
    { "name": 'BAZA ATH (Stock Ath)', "lat": 50.630554, "lng": 3.7788481 },
    { "name": 'Baza dranaco Antwerpen', "lat": 51.2372207, "lng": 4.4569835 },
    { "name": 'MINERA LUMEN', "lat": 50.9255869, "lng": 4.8354728 },
    { "name": 'BAZZA HALLE (Denayer)', "lat": 50.7358744, "lng": 4.2365449 },
    { "name": 'BAZA SODEMAF TOURNAI', "lat": 50.6055532, "lng": 3.3888362 },
    { "name": 'BAZA JOASSIN NAMUR', "lat": 50.4665283, "lng": 4.8661886 },
    { "name": 'BAZA ERPE-MERE', "lat": 50.9238304, "lng": 3.9664654 },
    { "name": 'BAZA SABLE ET GRANULATS LIEGE', "lat": 50.6451384, "lng": 5.5734203 },
    { "name": 'Baza Antoing TUORNAI', "lat": 50.5623588, "lng": 3.4379506 },
    { "name": 'BAZA AALST', "lat": 50.9383224, "lng": 4.0392149 },
    { "name": 'BAZA GENT', "lat": 51.0538286, "lng": 3.7250121 },
    { "name": 'BAZA BOOM', "lat": 51.0875913, "lng": 4.3577297 },
    { "name": 'BAZA TEMSE', "lat": 51.1220674, "lng": 4.2265680 },
    { "name": 'BAZA ANTWERP', "lat": 51.2373003, "lng": 4.4571109 },
    { "name": 'BAZA ECODREAM LIEGE', "lat": 50.6451384, "lng": 5.5734203 },
    { "name": 'BAZA INTRE MONS SI ATH', "lat": 50.4549557, "lng": 3.951958 }
]

db = SessionLocal()

# Delete existing to prevent duplicates if any
db.query(LogisticSandStation).delete()

# Get organization ID
from app.models import Organization
org = db.query(Organization).first()
if not org:
    print("No organization found!")
    sys.exit(1)

org_id = org.id

for s in SAND_STATIONS:
    station = LogisticSandStation(
        organization_id=org_id,
        name=s["name"],
        latitude=s["lat"],
        longitude=s["lng"]
    )
    db.add(station)

db.commit()
print("Sand stations seeded successfully!")
