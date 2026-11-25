import requests
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import LogisticSandStation

db = SessionLocal()
organization_id = 1 # Assuming Davide Chape is 1

urls = [
    ("Visé", "https://maps.app.goo.gl/CZ2sTfrFJUbnDZQ19?g_st=iw"),
    ("MATEGRO SA", "https://maps.app.goo.gl/G9tYJWHmcVZRj94NA?g_st=iw"),
    ("Dour Materiaux", "https://maps.app.goo.gl/mQgghkcaeZQsWEfGA?g_st=iw")
]

for name, url in urls:
    r = requests.get(url, allow_redirects=True)
    final_url = r.url
    print(f"Final URL for {name}: {final_url}")
    
    match = re.search(r'@([0-9.-]+),([0-9.-]+)', final_url)
    if match:
        lat = float(match.group(1))
        lng = float(match.group(2))
    else:
        print(f"Could not parse coordinates for {name}. Setting to 0,0 for now.")
        lat = 0.0
        lng = 0.0
        
    print(f"Coordinates: {lat}, {lng}")
    
    station = LogisticSandStation(
        name=name,
        address=final_url.split('?')[0].split('/place/')[-1].replace('+', ' ') if '/place/' in final_url else final_url,
        latitude=lat,
        longitude=lng,
        organization_id=organization_id,
        is_active=True
    )
    db.add(station)

db.commit()
print("Added successfully!")

