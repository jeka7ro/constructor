from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from app.models import Vehicle

from sqlalchemy.orm import sessionmaker
Session = sessionmaker(bind=engine)
db = Session()

badea_v = db.query(Vehicle).filter(Vehicle.name.ilike('%Badea%') | Vehicle.name.ilike('%GALBEN%')).first()
petrea_v = db.query(Vehicle).filter(Vehicle.name.ilike('%Petrea%') | Vehicle.name.ilike('%ALBASTRU%')).first()

print(f"Badea Vehicle before: {badea_v.name}, IMEI: {badea_v.imei}, Flespi: {getattr(badea_v, 'flespi_id', None)}")
print(f"Petrea Vehicle before: {petrea_v.name}, IMEI: {petrea_v.imei}, Flespi: {getattr(petrea_v, 'flespi_id', None)}")

badea_imei = badea_v.imei
petrea_imei = petrea_v.imei
badea_flespi = getattr(badea_v, 'flespi_id', None)
petrea_flespi = getattr(petrea_v, 'flespi_id', None)

# Step 1: Temp
badea_v.imei = "TEMP_IMEI"
db.flush()

# Step 2: Set Petrea to Badea's
petrea_v.imei = badea_imei
if hasattr(petrea_v, 'flespi_id'):
    petrea_v.flespi_id = badea_flespi
db.flush()

# Step 3: Set Badea to Petrea's
badea_v.imei = petrea_imei
if hasattr(badea_v, 'flespi_id'):
    badea_v.flespi_id = petrea_flespi

db.commit()

print(f"Badea Vehicle after: {badea_v.name}, IMEI: {badea_v.imei}, Flespi: {getattr(badea_v, 'flespi_id', None)}")
print(f"Petrea Vehicle after: {petrea_v.name}, IMEI: {petrea_v.imei}, Flespi: {getattr(petrea_v, 'flespi_id', None)}")

