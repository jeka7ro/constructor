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

vasea_v = db.query(Vehicle).filter(Vehicle.name.ilike('%Vasea%') | Vehicle.name.ilike('%GRI%')).first()
petrea_v = db.query(Vehicle).filter(Vehicle.name.ilike('%Petrea%') | Vehicle.name.ilike('%ALBASTRU%')).first()

print(f"Vasea Vehicle before: {vasea_v.name}, IMEI: {vasea_v.imei}, Flespi: {getattr(vasea_v, 'flespi_id', None)}")
print(f"Petrea Vehicle before: {petrea_v.name}, IMEI: {petrea_v.imei}, Flespi: {getattr(petrea_v, 'flespi_id', None)}")

vasea_imei = vasea_v.imei
petrea_imei = petrea_v.imei
vasea_flespi = getattr(vasea_v, 'flespi_id', None)
petrea_flespi = getattr(petrea_v, 'flespi_id', None)

# Step 1: Temp
vasea_v.imei = "TEMP_IMEI"
db.flush()

# Step 2: Set Petrea to Vasea's
petrea_v.imei = vasea_imei
if hasattr(petrea_v, 'flespi_id'):
    petrea_v.flespi_id = vasea_flespi
db.flush()

# Step 3: Set Vasea to Petrea's
vasea_v.imei = petrea_imei
if hasattr(vasea_v, 'flespi_id'):
    vasea_v.flespi_id = petrea_flespi

db.commit()

print(f"Vasea Vehicle after: {vasea_v.name}, IMEI: {vasea_v.imei}, Flespi: {getattr(vasea_v, 'flespi_id', None)}")
print(f"Petrea Vehicle after: {petrea_v.name}, IMEI: {petrea_v.imei}, Flespi: {getattr(petrea_v, 'flespi_id', None)}")

